import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthRepository } from '@main-modules/auth/repositories/auth.repository';
import { AuthService } from '@main-modules/auth/services/auth.service';
import { GoogleIdentityService } from '@main-modules/auth/services/google-identity.service';
import { NotificationsService } from '@main-modules/notifications/services/notifications.service';
import { UsersService } from '@main-modules/users/services/users.service';

describe('AuthService', () => {
  it('registers a customer and issues tokens', async () => {
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        role: 'customer',
        profile: {
          firstName: 'Jane',
          lastName: 'Doe',
        },
      }),
    };

    const authRepository = {
      createAccount: jest.fn().mockResolvedValue({ id: 'account-1' }),
      storeRefreshToken: jest.fn().mockResolvedValue({ id: 'refresh-1' }),
    };

    const jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    };

    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'jwt.accessSecret': 'access',
          'jwt.refreshSecret': 'refresh',
        };
        return values[key];
      }),
      get: jest.fn((_key: string, fallback: string) => fallback),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AuthRepository, useValue: authRepository },
        { provide: NotificationsService, useValue: { enqueueAuthOtpDelivery: jest.fn() } },
        { provide: GoogleIdentityService, useValue: { verifyIdToken: jest.fn() } },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    const service = moduleRef.get(AuthService);

    const result = await service.register({
      email: 'customer@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(usersService.create).toHaveBeenCalled();
    expect(authRepository.createAccount).toHaveBeenCalled();
    expect(authRepository.storeRefreshToken).toHaveBeenCalled();
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('rejects duplicate registration email', async () => {
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
      }),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AuthRepository, useValue: {} },
        { provide: NotificationsService, useValue: { enqueueAuthOtpDelivery: jest.fn() } },
        { provide: GoogleIdentityService, useValue: { verifyIdToken: jest.fn() } },
        { provide: JwtService, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => key),
            get: jest.fn((_key: string, fallback: string) => fallback),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(AuthService);

    await expect(
      service.register({
        email: 'customer@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('rejects invalid login credentials when no matching user exists', async () => {
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
    };

    const authRepository = {
      logLoginAttempt: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AuthRepository, useValue: authRepository },
        { provide: NotificationsService, useValue: { enqueueAuthOtpDelivery: jest.fn() } },
        { provide: GoogleIdentityService, useValue: { verifyIdToken: jest.fn() } },
        { provide: JwtService, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => key),
            get: jest.fn((_key: string, fallback: string) => fallback),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(AuthService);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authRepository.logLoginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'missing@example.com',
        wasSuccessful: false,
      }),
    );
  });

  it('rejects invalid refresh tokens', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockRejectedValue(new Error('invalid token')),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
        {
          provide: AuthRepository,
          useValue: {
            findLatestActiveRefreshToken: jest.fn(),
          },
        },
        { provide: NotificationsService, useValue: { enqueueAuthOtpDelivery: jest.fn() } },
        { provide: GoogleIdentityService, useValue: { verifyIdToken: jest.fn() } },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => key),
            get: jest.fn((_key: string, fallback: string) => fallback),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(AuthService);

    await expect(
      service.refresh({
        refreshToken: 'not-a-real-refresh-token',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('provisions and deactivates a staff account through admin flows', async () => {
    const usersService = {
      findByEmail: jest.fn(),
      createManagedUser: jest.fn().mockResolvedValue({
        id: 'staff-1',
        email: 'staff@example.com',
        role: 'service_adviser',
        staffCode: 'SA-0001',
        isActive: true,
      }),
      findById: jest.fn().mockResolvedValue({
        id: 'staff-1',
        email: 'staff@example.com',
        role: 'service_adviser',
        staffCode: 'SA-0001',
        isActive: true,
      }),
      setActivationStatus: jest.fn().mockResolvedValue({
        id: 'staff-1',
        isActive: false,
      }),
    };

    const authRepository = {
      createAccount: jest.fn().mockResolvedValue({ id: 'account-1' }),
      updateAccountStatus: jest.fn().mockResolvedValue({ id: 'account-1', isActive: false }),
      revokeActiveRefreshTokens: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AuthRepository, useValue: authRepository },
        { provide: NotificationsService, useValue: { enqueueAuthOtpDelivery: jest.fn() } },
        { provide: GoogleIdentityService, useValue: { verifyIdToken: jest.fn() } },
        { provide: JwtService, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => key),
            get: jest.fn((_key: string, fallback: string) => fallback),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(AuthService);

    const created = await service.provisionStaffAccount({
      email: 'staff@example.com',
      password: 'password123',
      firstName: 'Maria',
      lastName: 'Santos',
      role: 'service_adviser',
      staffCode: 'SA-0001',
    });

    expect(usersService.createManagedUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'staff@example.com',
        role: 'service_adviser',
        staffCode: 'SA-0001',
      }),
    );
    expect(authRepository.createAccount).toHaveBeenCalledWith('staff-1', expect.any(String));
    expect(usersService.setActivationStatus).toHaveBeenCalledWith('staff-1', false);
    expect(authRepository.updateAccountStatus).toHaveBeenCalledWith('staff-1', false);
    expect(created?.staffCode).toBe('SA-0001');

    await service.updateStaffAccountStatus('staff-1', {
      isActive: false,
    });

    expect(usersService.setActivationStatus).toHaveBeenCalledWith('staff-1', false);
    expect(authRepository.updateAccountStatus).toHaveBeenCalledWith('staff-1', false);
    expect(authRepository.revokeActiveRefreshTokens).toHaveBeenCalledWith('staff-1');
  });

  it('starts Google signup and verifies email OTP before issuing tokens', async () => {
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        role: 'customer',
      }),
      setActivationStatus: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        role: 'customer',
      }),
    };

    const authRepository = {
      findGoogleIdentityByProviderUserId: jest.fn().mockResolvedValue(null),
      createGoogleIdentity: jest.fn().mockResolvedValue({ id: 'google-1' }),
      createAccount: jest.fn().mockResolvedValue({ id: 'account-1' }),
      updateAccountStatus: jest.fn().mockResolvedValue({ id: 'account-1', isActive: false }),
      createOtpChallenge: jest.fn().mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-1',
        purpose: 'customer_signup',
        email: 'customer@example.com',
        otpHash: '$2b$10$fake',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        consumedAt: null,
        attempts: 0,
      }),
      findOtpChallengeById: jest.fn().mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-1',
        purpose: 'customer_signup',
        email: 'customer@example.com',
        otpHash: await bcrypt.hash('123456', 10),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        consumedAt: null,
        attempts: 0,
      }),
      consumeOtpChallenge: jest.fn().mockResolvedValue({ id: 'challenge-1' }),
      findAccountByUserId: jest.fn().mockResolvedValue({ id: 'account-1', isActive: false }),
      storeRefreshToken: jest.fn().mockResolvedValue({ id: 'refresh-1' }),
    };

    const jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    };

    const notificationsService = {
      enqueueAuthOtpDelivery: jest.fn().mockResolvedValue({ id: 'notification-1' }),
    };

    const googleIdentityService = {
      verifyIdToken: jest.fn().mockResolvedValue({
        email: 'customer@example.com',
        subject: 'google-subject-1',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    };

    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'jwt.accessSecret': 'access',
          'jwt.refreshSecret': 'refresh',
        };
        return values[key];
      }),
      get: jest.fn((_key: string, fallback: string) => fallback),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AuthRepository, useValue: authRepository },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: GoogleIdentityService, useValue: googleIdentityService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    const service = moduleRef.get(AuthService);

    const start = await service.startGoogleSignup({
      googleIdToken: 'customer-google-id-token',
    });

    expect(start.status).toBe('pending_activation');
    expect(notificationsService.enqueueAuthOtpDelivery).toHaveBeenCalled();

    const result = await service.verifyEmailOtp({
      enrollmentId: 'challenge-1',
      otp: '123456',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('activates a pending staff account with Google verification and email OTP', async () => {
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 'staff-1',
        email: 'staff@example.com',
        role: 'technician',
        isActive: false,
      }),
      findById: jest.fn().mockResolvedValue({
        id: 'staff-1',
        email: 'staff@example.com',
        role: 'technician',
        isActive: false,
      }),
      setActivationStatus: jest.fn().mockResolvedValue({ id: 'staff-1', isActive: true }),
    };

    const authRepository = {
      findGoogleIdentityByProviderUserId: jest.fn().mockResolvedValue(null),
      findGoogleIdentityByEmail: jest.fn().mockResolvedValue(null),
      createGoogleIdentity: jest.fn().mockResolvedValue({ id: 'google-1' }),
      createOtpChallenge: jest.fn().mockResolvedValue({
        id: 'challenge-2',
        userId: 'staff-1',
        purpose: 'staff_activation',
        email: 'staff@example.com',
        otpHash: '$2b$10$fake',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        consumedAt: null,
        attempts: 0,
      }),
      findOtpChallengeById: jest.fn().mockResolvedValue({
        id: 'challenge-2',
        userId: 'staff-1',
        purpose: 'staff_activation',
        email: 'staff@example.com',
        otpHash: await bcrypt.hash('654321', 10),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        consumedAt: null,
        attempts: 0,
      }),
      consumeOtpChallenge: jest.fn().mockResolvedValue({ id: 'challenge-2' }),
      findAccountByUserId: jest.fn().mockResolvedValue({ id: 'account-2', isActive: false }),
      updateAccountStatus: jest.fn().mockResolvedValue({ id: 'account-2', isActive: true }),
      storeRefreshToken: jest.fn().mockResolvedValue({ id: 'refresh-2' }),
    };

    const jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    };

    const notificationsService = {
      enqueueAuthOtpDelivery: jest.fn().mockResolvedValue({ id: 'notification-2' }),
    };

    const googleIdentityService = {
      verifyIdToken: jest.fn().mockResolvedValue({
        email: 'staff@example.com',
        subject: 'google-staff-1',
        firstName: 'Maria',
        lastName: 'Santos',
      }),
    };

    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'jwt.accessSecret': 'access',
          'jwt.refreshSecret': 'refresh',
        };
        return values[key];
      }),
      get: jest.fn((_key: string, fallback: string) => fallback),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AuthRepository, useValue: authRepository },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: GoogleIdentityService, useValue: googleIdentityService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    const service = moduleRef.get(AuthService);

    const start = await service.startStaffActivation({
      googleIdToken: 'staff-google-id-token',
    });

    expect(start.status).toBe('pending_activation');
    expect(notificationsService.enqueueAuthOtpDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ activationContext: 'staff_activation' }),
    );

    const result = await service.verifyStaffEmailOtp({
      enrollmentId: 'challenge-2',
      otp: '654321',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });
});
