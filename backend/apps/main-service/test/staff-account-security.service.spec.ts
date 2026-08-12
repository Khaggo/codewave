import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from '@main-modules/auth/services/auth.service';
import { CreateStaffAccountDto } from '@main-modules/auth/dto/create-staff-account.dto';

const staffUser = {
  id: 'staff-1',
  email: 'maria.staff@example.com',
  role: 'service_adviser',
  staffCode: 'STA-0001',
  isActive: true,
  profile: { firstName: 'Maria', lastName: 'Santos' },
};

const createFixture = () => {
  const account = {
    id: 'account-1',
    userId: staffUser.id,
    passwordHash: '',
    isActive: true,
    mustChangePassword: true,
  };
  const usersService = {
    createManagedUser: jest.fn().mockResolvedValue(staffUser),
    findById: jest.fn().mockResolvedValue(staffUser),
    findByEmail: jest.fn().mockResolvedValue(staffUser),
    setActivationStatus: jest.fn().mockResolvedValue(staffUser),
  };
  const authRepository = {
    createAccount: jest.fn(async (_userId: string, passwordHash: string, mustChangePassword: boolean) => {
      account.passwordHash = passwordHash;
      account.mustChangePassword = mustChangePassword;
      return account;
    }),
    findAccountByUserId: jest.fn().mockImplementation(async () => account),
    updatePasswordHash: jest.fn(async (_userId: string, passwordHash: string, mustChangePassword: boolean) => {
      account.passwordHash = passwordHash;
      account.mustChangePassword = mustChangePassword;
      return account;
    }),
    updateAccountStatus: jest.fn().mockResolvedValue(account),
    revokeActiveRefreshTokens: jest.fn().mockResolvedValue(undefined),
    storeRefreshToken: jest.fn().mockResolvedValue({ id: 'refresh-1' }),
    logLoginAttempt: jest.fn().mockResolvedValue(undefined),
    createStaffAdminAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  };
  const mailDeliveryService = {
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mail-1' }),
  };
  const eventBus = { publish: jest.fn() };
  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn((key: string) => (key.includes('refresh') ? 'refresh-secret' : 'access-secret')),
    get: jest.fn((_key: string, fallback: string) => fallback),
  };
  const service = new AuthService(
    authRepository as never,
    usersService as never,
    {} as never,
    {} as never,
    eventBus as never,
    jwtService as never,
    configService as never,
    mailDeliveryService as never,
  );

  return {
    account,
    usersService,
    authRepository,
    mailDeliveryService,
    eventBus,
    jwtService,
    service,
  };
};

const provisionPayload = {
  email: staffUser.email,
  staffCode: staffUser.staffCode,
  firstName: 'Maria',
  lastName: 'Santos',
  role: 'service_adviser' as const,
  accountType: 'staff' as const,
};

describe('secure staff-account provisioning', () => {
  it('has no initial-password DTO field, hashes a high-entropy generated secret, emails it, and never returns or publishes it', async () => {
    expect(Object.keys(new CreateStaffAccountDto())).not.toContain('password');
    const fixture = createFixture();
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const response = await fixture.service.provisionStaffAccount(provisionPayload, {
        userId: 'admin-1',
        role: 'super_admin',
      });
      const mailText = fixture.mailDeliveryService.sendMail.mock.calls[0][0].text as string;
      const temporaryPassword = mailText.match(/Temporary password: ([^\r\n]+)/)?.[1];

      expect(temporaryPassword).toMatch(/^[A-Za-z0-9_-]{32}$/);
      expect(fixture.authRepository.createAccount).toHaveBeenCalledWith(
        staffUser.id,
        expect.any(String),
        true,
      );
      expect(await bcrypt.compare(temporaryPassword!, fixture.account.passwordHash)).toBe(true);
      expect(JSON.stringify(response)).not.toContain(temporaryPassword);
      expect(response).not.toHaveProperty('temporaryPassword');
      expect(response).not.toHaveProperty('passwordHash');
      expect(response.delivery).toEqual({
        status: 'sent',
        channel: 'email',
        targetEmail: staffUser.email,
        retryable: false,
      });
      expect(JSON.stringify(fixture.eventBus.publish.mock.calls)).not.toContain(temporaryPassword);
      expect(consoleLog).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleLog.mockRestore();
      consoleWarn.mockRestore();
      consoleError.mockRestore();
    }
  });

  it('reports mail failure and retry rotates to a newly generated secret before sending immediately', async () => {
    const fixture = createFixture();
    fixture.mailDeliveryService.sendMail.mockRejectedValueOnce(new Error('mail unavailable'));

    await expect(
      fixture.service.provisionStaffAccount(provisionPayload, {
        userId: 'admin-1',
        role: 'super_admin',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    const failedSecret = (fixture.mailDeliveryService.sendMail.mock.calls[0][0].text as string)
      .match(/Temporary password: ([^\r\n]+)/)?.[1];
    expect(fixture.eventBus.publish).not.toHaveBeenCalled();

    fixture.mailDeliveryService.sendMail.mockResolvedValueOnce({ messageId: 'mail-2' });
    const response = await fixture.service.retryStaffCredentialDelivery(
      { email: staffUser.email },
      { userId: 'admin-1', role: 'super_admin' },
    );
    const retrySecret = (fixture.mailDeliveryService.sendMail.mock.calls[1][0].text as string)
      .match(/Temporary password: ([^\r\n]+)/)?.[1];

    expect(retrySecret).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(retrySecret).not.toBe(failedSecret);
    expect(await bcrypt.compare(retrySecret!, fixture.account.passwordHash)).toBe(true);
    expect(await bcrypt.compare(failedSecret!, fixture.account.passwordHash)).toBe(false);
    expect(response.delivery.status).toBe('sent');
    expect(JSON.stringify(response)).not.toContain(retrySecret);
    expect(fixture.authRepository.revokeActiveRefreshTokens).toHaveBeenCalledWith(staffUser.id);
  });

  it('returns only a restricted first-login token, then clears the gate and issues a normal session', async () => {
    const fixture = createFixture();
    fixture.account.passwordHash = await bcrypt.hash('TemporaryPassword123', 10);
    fixture.jwtService.signAsync
      .mockResolvedValueOnce('password-change-token')
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    fixture.jwtService.verifyAsync.mockResolvedValue({
      sub: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
      type: 'password_change',
    });

    const firstLogin = await fixture.service.login({
      email: staffUser.email,
      password: 'TemporaryPassword123',
    });
    expect(firstLogin).toEqual({
      requiresPasswordChange: true,
      passwordChangeToken: 'password-change-token',
      destination: '/api/auth/password/change-required',
      expiresInSeconds: 600,
    });
    expect(firstLogin).not.toHaveProperty('accessToken');
    expect(firstLogin).not.toHaveProperty('refreshToken');

    const session = await fixture.service.completeRequiredStaffPasswordChange({
      passwordChangeToken: 'password-change-token',
      newPassword: 'ChangedStaffPassword123',
    });
    expect(fixture.authRepository.updatePasswordHash).toHaveBeenCalledWith(
      staffUser.id,
      expect.any(String),
      false,
    );
    expect(fixture.account.mustChangePassword).toBe(false);
    expect(session).toEqual(expect.objectContaining({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    }));
  });

  it('preserves duplicate-email conflicts without sending credentials', async () => {
    const fixture = createFixture();
    fixture.usersService.createManagedUser.mockRejectedValueOnce(
      new ConflictException('User email already exists'),
    );

    await expect(
      fixture.service.provisionStaffAccount(provisionPayload, {
        userId: 'admin-1',
        role: 'super_admin',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(fixture.mailDeliveryService.sendMail).not.toHaveBeenCalled();
  });
});
