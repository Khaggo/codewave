import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import { CreateUserDto } from '@main-modules/users/dto/create-user.dto';
import { UsersService } from '@main-modules/users/services/users.service';
import { NotificationsService } from '@main-modules/notifications/services/notifications.service';
import { MailDeliveryService } from '@main-modules/notifications/services/mail-delivery.service';
import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';

import { GoogleSignupStartDto } from '../dto/google-signup-start.dto';
import { ConfirmStaffPhoneChangeWithOtpDto } from '../dto/confirm-staff-phone-change-with-otp.dto';
import { DeleteAccountDto } from '../dto/delete-account.dto';
import { ConfirmChangePasswordWithOtpDto } from '../dto/confirm-change-password-with-otp.dto';
import { CompleteRequiredStaffPasswordDto } from '../dto/complete-required-staff-password.dto';
import { LoginDto } from '../dto/login.dto';
import { ListAdminCustomersQueryDto } from '../dto/list-admin-customers-query.dto';
import { RequestChangePasswordOtpDto } from '../dto/request-change-password-otp.dto';
import { RequestPasswordResetOtpDto } from '../dto/request-password-reset-otp.dto';
import { RequestStaffPhoneChangeOtpDto } from '../dto/request-staff-phone-change-otp.dto';
import { RetryStaffCredentialDeliveryDto } from '../dto/retry-staff-credential-delivery.dto';
import { CreateStaffAccountDto } from '../dto/create-staff-account.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordWithOtpDto } from '../dto/reset-password-with-otp.dto';
import { UpdateStaffAccountStatusDto } from '../dto/update-staff-account-status.dto';
import { VerifyEmailOtpDto } from '../dto/verify-email-otp.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { GoogleIdentityService } from './google-identity.service';
import {
  MAX_ACTIVE_HEAD_TECHNICIANS,
  roleFallbackAccountTypes,
  staffAccountTypeCodePrefixes,
  staffAccountTypeEmailSegments,
  type StaffAccountType,
} from './staff-account-policy';

type TokenPayload = {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh' | 'password_change';
};

const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly googleIdentityService: GoogleIdentityService,
    private readonly eventBus: AutocareEventBusService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
    @Optional() private readonly mailDeliveryService?: MailDeliveryService,
  ) {
    this.accessSecret = configService.getOrThrow<string>('jwt.accessSecret');
    this.refreshSecret = configService.getOrThrow<string>('jwt.refreshSecret');
    this.accessExpiresIn = configService.get<string>('jwt.accessExpiresIn', '15m');
    this.refreshExpiresIn = configService.get<string>('jwt.refreshExpiresIn', '7d');
  }

  async startGoogleSignup(payload: GoogleSignupStartDto) {
    const googleIdentity = await this.googleIdentityService.verifyIdToken(payload.googleIdToken);
    const normalizedEmail = googleIdentity.email;

    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const existingIdentity = await this.authRepository.findGoogleIdentityByProviderUserId(
      googleIdentity.subject,
    );
    if (existingIdentity) {
      throw new ConflictException('Google identity is already linked to an account');
    }

    const user = await this.usersService.create({
      email: normalizedEmail,
      firstName: googleIdentity.firstName,
      lastName: googleIdentity.lastName,
    } satisfies CreateUserDto);

    await this.usersService.setActivationStatus(user.id, false);

    const tempPasswordHash = await bcrypt.hash(`google:${user.id}:${Date.now()}`, 10);
    await this.authRepository.createAccount(user.id, tempPasswordHash);
    await this.authRepository.updateAccountStatus(user.id, false);

    await this.authRepository.createGoogleIdentity({
      userId: user.id,
      providerUserId: googleIdentity.subject,
      email: normalizedEmail,
    });

    return this.createOtpEnrollment({
      userId: user.id,
      email: normalizedEmail,
      purpose: 'customer_signup',
      activationContext: 'customer_signup',
      status: 'pending_activation',
    });
  }

  async startStaffActivation(payload: GoogleSignupStartDto) {
    const googleIdentity = await this.googleIdentityService.verifyIdToken(payload.googleIdToken);
    const normalizedEmail = googleIdentity.email;

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException('Staff account not found');
    }

    if (user.role === 'customer') {
      throw new BadRequestException('Only staff accounts can use staff activation');
    }

    if (user.isActive) {
      throw new ConflictException('Staff account is already active');
    }

    const existingIdentity = await this.authRepository.findGoogleIdentityByProviderUserId(
      googleIdentity.subject,
    );
    if (existingIdentity && existingIdentity.userId !== user.id) {
      throw new ConflictException('Google identity is already linked to another account');
    }

    const existingEmailIdentity = await this.authRepository.findGoogleIdentityByEmail(
      normalizedEmail,
    );
    if (existingEmailIdentity && existingEmailIdentity.userId !== user.id) {
      throw new ConflictException('Google identity email is already linked to another account');
    }

    if (!existingIdentity) {
      await this.authRepository.createGoogleIdentity({
        userId: user.id,
        providerUserId: googleIdentity.subject,
        email: normalizedEmail,
      });
    }

    return this.createOtpEnrollment({
      userId: user.id,
      email: normalizedEmail,
      purpose: 'staff_activation',
      activationContext: 'staff_activation',
      status: 'pending_activation',
    });
  }

  async verifyEmailOtp(payload: VerifyEmailOtpDto) {
    const challenge = await this.authRepository.findOtpChallengeById(payload.enrollmentId);
    if (!challenge) {
      throw new NotFoundException('OTP enrollment not found');
    }

    if (challenge.purpose !== 'customer_signup') {
      throw new BadRequestException('OTP purpose does not match customer signup');
    }

    if (challenge.consumedAt) {
      throw new ConflictException('OTP has already been used');
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP has expired');
    }

    this.assertOtpAttemptAvailable(challenge);
    const isOtpValid = await bcrypt.compare(payload.otp, challenge.otpHash);
    if (!isOtpValid) {
      await this.rejectInvalidOtp(challenge);
    }

    await this.authRepository.consumeOtpChallenge(challenge.id);

    const user = await this.usersService.findById(challenge.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account) {
      throw new NotFoundException('Auth account not found');
    }

    await this.usersService.setActivationStatus(user.id, true);
    await this.authRepository.updateAccountStatus(user.id, true);

    const activatedUser = await this.usersService.findById(user.id);
    if (!activatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.issueTokens(activatedUser);
  }

  async verifyStaffEmailOtp(payload: VerifyEmailOtpDto) {
    const challenge = await this.authRepository.findOtpChallengeById(payload.enrollmentId);
    if (!challenge) {
      throw new NotFoundException('OTP enrollment not found');
    }

    if (challenge.purpose !== 'staff_activation') {
      throw new BadRequestException('OTP purpose does not match staff activation');
    }

    if (challenge.consumedAt) {
      throw new ConflictException('OTP has already been used');
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP has expired');
    }

    this.assertOtpAttemptAvailable(challenge);
    const isOtpValid = await bcrypt.compare(payload.otp, challenge.otpHash);
    if (!isOtpValid) {
      await this.rejectInvalidOtp(challenge);
    }

    await this.authRepository.consumeOtpChallenge(challenge.id);

    const user = await this.usersService.findById(challenge.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'customer') {
      throw new BadRequestException('Only staff accounts can complete staff activation');
    }

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account) {
      throw new NotFoundException('Auth account not found');
    }

    await this.usersService.setActivationStatus(user.id, true);
    await this.authRepository.updateAccountStatus(user.id, true);

    const activatedUser = await this.usersService.findById(user.id);
    if (!activatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.issueTokens(activatedUser);
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.usersService.create({
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phone: registerDto.phone,
    } satisfies CreateUserDto);

    if (!user.email) {
      throw new BadRequestException('Registered customer registration requires an email address');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    await this.authRepository.createAccount(user.id, passwordHash);
    await this.usersService.setActivationStatus(user.id, false);
    await this.authRepository.updateAccountStatus(user.id, false);

    return this.createOtpEnrollment({
      userId: user.id,
      email: this.requireAuthEmail(user.email, 'Registered customer registration requires an email address'),
      purpose: 'customer_signup',
      activationContext: 'customer_signup',
      status: 'pending_activation',
    });
  }

  async login(loginDto: LoginDto, ipAddress?: string) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      await this.authRepository.logLoginAttempt({
        email: loginDto.email,
        ipAddress,
        wasSuccessful: false,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account || !account.isActive || !user.isActive) {
      await this.authRepository.logLoginAttempt({
        userId: user.id,
        email: loginDto.email,
        ipAddress,
        wasSuccessful: false,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, account.passwordHash);
    if (!isPasswordValid) {
      await this.authRepository.logLoginAttempt({
        userId: user.id,
        email: loginDto.email,
        ipAddress,
        wasSuccessful: false,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (['technician', 'head_technician'].includes(user.role)) {
      await this.authRepository.logLoginAttempt({
        userId: user.id,
        email: loginDto.email,
        ipAddress,
        wasSuccessful: false,
      });
      throw new UnauthorizedException(
        'Technician login has been retired. Service advisers now manage workshop progress and technician assignments.',
      );
    }

    await this.authRepository.logLoginAttempt({
      userId: user.id,
      email: loginDto.email,
      ipAddress,
      wasSuccessful: true,
    });

    if (account.mustChangePassword) {
      const email = this.requireAuthEmail(user.email, 'This identity has no login email');
      const passwordChangeToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          email,
          role: user.role,
          type: 'password_change',
        } satisfies TokenPayload,
        {
          secret: this.accessSecret,
          expiresIn: '10m',
        },
      );

      return {
        requiresPasswordChange: true as const,
        passwordChangeToken,
        destination: '/api/auth/password/change-required',
        expiresInSeconds: 600,
      };
    }

    return this.issueTokens(user);
  }

  async completeRequiredStaffPasswordChange(payload: CompleteRequiredStaffPasswordDto) {
    let tokenPayload: TokenPayload;
    try {
      tokenPayload = await this.jwtService.verifyAsync<TokenPayload>(payload.passwordChangeToken, {
        secret: this.accessSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired password-change token');
    }

    if (tokenPayload.type !== 'password_change') {
      throw new UnauthorizedException('Invalid password-change token');
    }

    const user = await this.usersService.findById(tokenPayload.sub);
    if (!user || !user.isActive || user.role === 'customer') {
      throw new UnauthorizedException('Staff account is unavailable');
    }

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account?.isActive || !account.mustChangePassword) {
      throw new ConflictException('This account no longer requires an initial password change');
    }

    if (await bcrypt.compare(payload.newPassword, account.passwordHash)) {
      throw new BadRequestException('Choose a new password that differs from the temporary password');
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 10);
    await this.authRepository.updatePasswordHash(user.id, passwordHash, false);
    await this.authRepository.revokeActiveRefreshTokens(user.id);

    return this.issueTokens(user);
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(refreshTokenDto.refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedToken = await this.authRepository.findLatestActiveRefreshToken(payload.sub);
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const isTokenValid = await bcrypt.compare(refreshTokenDto.refreshToken, storedToken.tokenHash);
    if (!isTokenValid) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account?.isActive || account.mustChangePassword) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokens(user);
  }

  async requestForgotPasswordOtp(payload: RequestPasswordResetOtpDto) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user || !user.isActive) {
      throw new NotFoundException('Account not found');
    }

    const email = this.requireAuthEmail(user.email, 'This identity has no login email');

    if (user.role !== 'customer') {
      throw new BadRequestException('Only customer accounts can reset passwords through this flow');
    }

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account || !account.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    return this.createOtpEnrollment({
      userId: user.id,
      email,
      purpose: 'forgot_password',
      activationContext: 'forgot_password',
      status: 'pending_reset_verification',
    });
  }

  async resetPasswordWithOtp(payload: ResetPasswordWithOtpDto) {
    const challenge = await this.verifyOtpChallenge(payload.enrollmentId, payload.otp, 'forgot_password');
    const user = await this.usersService.findById(challenge.userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account || !account.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 10);
    await this.authRepository.updatePasswordHash(user.id, passwordHash);
    await this.authRepository.revokeActiveRefreshTokens(user.id);

    return {
      status: 'password_reset',
      message: 'Password updated successfully. Please sign in with your new password.',
    };
  }

  async requestChangePasswordOtp(
    payload: RequestChangePasswordOtpDto,
    actor: { userId: string; email: string; role: string },
  ) {
    const user = await this.usersService.findById(actor.userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    const email = this.requireAuthEmail(user.email, 'This identity has no login email');

    if (user.role !== 'customer') {
      throw new BadRequestException('Only customer accounts can change passwords through this flow');
    }

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account || !account.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await bcrypt.compare(payload.currentPassword, account.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    return this.createOtpEnrollment({
      userId: user.id,
      email,
      purpose: 'change_password',
      activationContext: 'change_password',
      status: 'pending_change_verification',
    });
  }

  async confirmChangePasswordWithOtp(
    payload: ConfirmChangePasswordWithOtpDto,
    actor: { userId: string; email: string; role: string },
  ) {
    const challenge = await this.verifyOtpChallenge(payload.enrollmentId, payload.otp, 'change_password');
    if (challenge.userId !== actor.userId) {
      throw new UnauthorizedException('Password change verification does not belong to the authenticated user');
    }

    const user = await this.usersService.findById(actor.userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'customer') {
      throw new BadRequestException('Only customer accounts can change passwords through this flow');
    }

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account || !account.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    const isCurrentPasswordValid = await bcrypt.compare(payload.currentPassword, account.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 10);
    await this.authRepository.updatePasswordHash(user.id, passwordHash);
    await this.authRepository.revokeActiveRefreshTokens(user.id);

    return {
      status: 'password_changed',
      message: 'Password updated successfully.',
    };
  }

  async startDeleteOwnAccount(
    payload: DeleteAccountDto,
    actor: { userId: string; email: string; role: string },
  ) {
    const user = await this.usersService.findById(actor.userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    const email = this.requireAuthEmail(user.email, 'This identity has no login email');

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account || !account.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await bcrypt.compare(payload.currentPassword, account.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    return this.createOtpEnrollment({
      userId: user.id,
      email,
      purpose: 'account_delete',
      activationContext: 'account_delete',
      status: 'pending_delete_verification',
    });
  }

  async requestStaffPhoneChangeOtp(
    payload: RequestStaffPhoneChangeOtpDto,
    actor: { userId: string; email: string; role: string },
  ) {
    const user = await this.usersService.findById(actor.userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    this.assertStaffProfileActor(user.role);

    const email = this.requireAuthEmail(user.email, 'Staff accounts require an email address');

    const normalizedPhone = this.normalizePhilippineMobile(payload.phone);
    const profile = Array.isArray(user.profile) ? user.profile[0] ?? null : user.profile;
    if (String(profile?.phone ?? '').trim() === normalizedPhone) {
      throw new BadRequestException('That phone number is already saved on your staff profile');
    }

    return this.createOtpEnrollment({
      userId: user.id,
      email,
      purpose: 'staff_phone_change',
      activationContext: 'staff_phone_change',
      status: 'pending_change_verification',
    });
  }

  async confirmStaffPhoneChangeWithOtp(
    payload: ConfirmStaffPhoneChangeWithOtpDto,
    actor: { userId: string; email: string; role: string },
  ) {
    const challenge = await this.verifyOtpChallenge(payload.enrollmentId, payload.otp, 'staff_phone_change');
    if (challenge.userId !== actor.userId) {
      throw new UnauthorizedException('Phone change verification does not belong to the authenticated staff user');
    }

    const user = await this.usersService.findById(actor.userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    this.assertStaffProfileActor(user.role);

    const normalizedPhone = this.normalizePhilippineMobile(payload.phone);
    return this.usersService.update(
      user.id,
      {
        phone: normalizedPhone,
      },
      actor,
    );
  }

  async provisionStaffAccount(
    payload: CreateStaffAccountDto,
    actor: { userId: string; role: string },
  ) {
    await this.assertHeadTechnicianCapacity(payload.role, true);

    const accountType = this.resolveStaffAccountType(payload);
    const staffCode = payload.staffCode?.trim()
      ? payload.staffCode.trim().toUpperCase()
      : await this.generateUniqueStaffCode(accountType);
    const email = payload.email?.trim()
      ? payload.email.trim().toLowerCase()
      : await this.generateUniqueStaffEmail(payload.firstName, accountType);

    const user = await this.usersService.createManagedUser({
      email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      role: payload.role,
      staffCode,
    });

    const authEmail = this.requireAuthEmail(user.email, 'Staff account provisioning requires an email address');

    const temporaryPassword = this.generateStaffTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await this.authRepository.createAccount(user.id, passwordHash, true);
    await this.usersService.setActivationStatus(user.id, true);
    await this.authRepository.updateAccountStatus(user.id, true);

    const delivery = await this.deliverStaffTemporaryCredential({
      email: authEmail,
      displayName: this.buildDisplayName(user),
      temporaryPassword,
    });

    const auditLog = await this.authRepository.createStaffAdminAuditLog({
      action: 'staff_account_provisioned',
      actorUserId: actor.userId,
      actorRole: 'super_admin',
      targetUserId: user.id,
      targetRole: user.role as 'technician' | 'head_technician' | 'service_adviser' | 'super_admin',
      targetEmail: authEmail,
      targetStaffCode: user.staffCode,
      previousIsActive: null,
      nextIsActive: true,
      reason: null,
    });

    this.eventBus.publish('staff_account.provisioned', {
      auditLogId: auditLog.id,
      actorUserId: actor.userId,
      actorRole: 'super_admin',
      targetUserId: user.id,
      targetRole: user.role as 'technician' | 'head_technician' | 'service_adviser' | 'super_admin',
      targetEmail: authEmail,
      targetStaffCode: user.staffCode,
      reason: null,
    });

    return {
      ...this.toManagedStaffAccount(await this.usersService.findById(user.id)),
      delivery,
    };
  }

  async retryStaffCredentialDelivery(
    payload: RetryStaffCredentialDeliveryDto,
    actor: { userId: string; role: string },
  ) {
    const email = payload.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);
    if (!user || user.role === 'customer') {
      throw new NotFoundException('Staff account not found');
    }

    const account = await this.authRepository.findAccountByUserId(user.id);
    if (!account?.isActive) {
      throw new ConflictException('Activate the staff account before retrying credential delivery');
    }
    if (!account.mustChangePassword) {
      throw new ConflictException('This account no longer requires initial credential delivery');
    }

    const temporaryPassword = this.generateStaffTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await this.authRepository.updatePasswordHash(user.id, passwordHash, true);
    await this.authRepository.revokeActiveRefreshTokens(user.id);

    const delivery = await this.deliverStaffTemporaryCredential({
      email,
      displayName: this.buildDisplayName(user),
      temporaryPassword,
    });

    const auditLog = await this.authRepository.createStaffAdminAuditLog({
      action: 'staff_account_provisioned',
      actorUserId: actor.userId,
      actorRole: 'super_admin',
      targetUserId: user.id,
      targetRole: user.role as 'technician' | 'head_technician' | 'service_adviser' | 'super_admin',
      targetEmail: email,
      targetStaffCode: user.staffCode,
      previousIsActive: user.isActive,
      nextIsActive: user.isActive,
      reason: 'Initial credential delivery retried with a newly generated temporary password.',
    });

    this.eventBus.publish('staff_account.provisioned', {
      auditLogId: auditLog.id,
      actorUserId: actor.userId,
      actorRole: 'super_admin',
      targetUserId: user.id,
      targetRole: user.role as 'technician' | 'head_technician' | 'service_adviser' | 'super_admin',
      targetEmail: email,
      targetStaffCode: user.staffCode,
      reason: 'Initial credential delivery retried with a newly generated temporary password.',
    });

    return {
      ...this.toManagedStaffAccount(user),
      delivery,
    };
  }

  async listStaffAccounts(actor: { userId: string; role: string }) {
    const staffAccounts = await this.usersService.listStaffAccounts(actor.userId);
    return staffAccounts
      .filter((account) => ['service_adviser', 'super_admin'].includes(account.role))
      .map((account) => this.toManagedStaffAccount(account));
  }

  async listCustomersWithVehicles(
    _actor: { userId: string; role: string },
    query: ListAdminCustomersQueryDto = new ListAdminCustomersQueryDto(),
  ) {
    const result = await this.usersService.listCustomersWithVehicles(query);

    const items = result.items.map((customer) => {
      const profile = Array.isArray(customer.profile)
        ? customer.profile[0] ?? null
        : customer.profile;
      const addresses = Array.isArray(customer.addresses) ? customer.addresses : [];
      const vehicles = Array.isArray(customer.vehicles) ? customer.vehicles : [];

      return {
        ...customer,
        profile,
        addresses,
        vehicles,
        displayName: this.buildDisplayName(customer),
        defaultAddress: addresses.find((address) => address.isDefault) ?? addresses[0] ?? null,
        vehicleCount: vehicles.length,
      };
    });
    return query.paged ? { items, pageInfo: { nextCursor: result.nextCursor } } : items;
  }

  async updateCustomerAccountStatus(
    userId: string,
    payload: UpdateStaffAccountStatusDto,
    actor: { userId: string; role: string },
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'customer') {
      throw new BadRequestException('Only customer accounts can be managed through this endpoint');
    }

    await this.usersService.setActivationStatus(userId, payload.isActive);
    await this.authRepository.updateAccountStatus(userId, payload.isActive);

    if (!payload.isActive) {
      await this.authRepository.revokeActiveRefreshTokens(userId);
    }

    return this.usersService.findById(userId);
  }

  private resolveStaffAccountType(payload: CreateStaffAccountDto): StaffAccountType {
    if (payload.accountType) {
      return payload.accountType;
    }

    return roleFallbackAccountTypes[payload.role] ?? 'staff';
  }

  private async assertHeadTechnicianCapacity(role: string, willBeActive: boolean) {
    if (role !== 'head_technician' || !willBeActive) {
      return;
    }

    const activeHeadTechnicianCount = await this.usersService.countActiveUsersByRole('head_technician');
    if (activeHeadTechnicianCount >= MAX_ACTIVE_HEAD_TECHNICIANS) {
      throw new ConflictException('Only 2 head technicians can be active at the same time');
    }
  }

  private normalizeEmailNameSegment(value: string) {
    return (
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 32) || 'staff'
    );
  }

  private async generateUniqueStaffEmail(firstName: string, accountType: StaffAccountType) {
    const baseName = this.normalizeEmailNameSegment(firstName);
    const roleSegment = staffAccountTypeEmailSegments[accountType];
    const triedNumbers = new Set<number>();

    while (triedNumbers.size < 900) {
      const randomNumber = randomInt(100, 1000);
      if (triedNumbers.has(randomNumber)) {
        continue;
      }

      triedNumbers.add(randomNumber);
      const candidate = `${baseName}${randomNumber}.${roleSegment}@autocare.com`;
      const existingUser = await this.usersService.findByEmail(candidate);
      if (!existingUser) {
        return candidate;
      }
    }

    throw new ConflictException('Unable to generate a unique staff email');
  }

  private async generateUniqueStaffCode(accountType: StaffAccountType) {
    const prefix = staffAccountTypeCodePrefixes[accountType];
    const triedNumbers = new Set<number>();

    while (triedNumbers.size < 9000) {
      const randomNumber = randomInt(1000, 10000);
      if (triedNumbers.has(randomNumber)) {
        continue;
      }

      triedNumbers.add(randomNumber);
      const candidate = `${prefix}-${randomNumber}`;
      const existingUser = await this.usersService.findByStaffCode(candidate);
      if (!existingUser) {
        return candidate;
      }
    }

    throw new ConflictException('Unable to generate a unique staff ID');
  }

  private inferStaffAccountType(user: any): StaffAccountType {
    const staffCode = String(user?.staffCode ?? '').toUpperCase();

    if (staffCode.startsWith('MEC-')) return 'mechanic';
    if (staffCode.startsWith('TEC-')) return 'technician';
    if (staffCode.startsWith('HTC-')) return 'head_technician';
    if (staffCode.startsWith('ADM-')) return 'admin';
    if (staffCode.startsWith('STA-') || staffCode.startsWith('SA-')) return 'staff';

    return roleFallbackAccountTypes[user?.role] ?? 'staff';
  }

  private buildDisplayName(user: any) {
    const profile = Array.isArray(user?.profile) ? user.profile[0] ?? null : user?.profile;
    const fullName = [profile?.firstName, profile?.lastName]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' ');

    return fullName || user?.email || user?.id;
  }

  private toManagedStaffAccount(user: any) {
    const accountType = this.inferStaffAccountType(user);
    const roleLabel =
      accountType === 'admin'
        ? 'Admin'
        : accountType === 'mechanic'
          ? 'Mechanic'
          : accountType === 'head_technician'
            ? 'Head Technician'
          : accountType === 'technician'
            ? 'Technician'
            : 'Staff';

    return {
      ...user,
      accountType,
      roleLabel,
      displayName: this.buildDisplayName(user),
    };
  }

  async updateStaffAccountStatus(
    userId: string,
    payload: UpdateStaffAccountStatusDto,
    actor: { userId: string; role: string },
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'customer') {
      throw new BadRequestException('Only staff accounts can be managed through this endpoint');
    }

    const email = this.requireAuthEmail(user.email, 'Staff accounts require an email address');

    if (payload.isActive && !user.isActive) {
      await this.assertHeadTechnicianCapacity(user.role, true);
    }

    const previousIsActive = user.isActive;

    await this.usersService.setActivationStatus(userId, payload.isActive);
    await this.authRepository.updateAccountStatus(userId, payload.isActive);

    if (!payload.isActive) {
      await this.authRepository.revokeActiveRefreshTokens(userId);
    }

    const auditLog = await this.authRepository.createStaffAdminAuditLog({
      action: 'staff_account_status_changed',
      actorUserId: actor.userId,
      actorRole: 'super_admin',
      targetUserId: user.id,
      targetRole: user.role as 'technician' | 'head_technician' | 'service_adviser' | 'super_admin',
      targetEmail: email,
      targetStaffCode: user.staffCode,
      previousIsActive,
      nextIsActive: payload.isActive,
      reason: payload.reason ?? null,
    });

    this.eventBus.publish('staff_account.status_changed', {
      auditLogId: auditLog.id,
      actorUserId: actor.userId,
      actorRole: 'super_admin',
      targetUserId: user.id,
      targetRole: user.role as 'technician' | 'head_technician' | 'service_adviser' | 'super_admin',
      targetEmail: email,
      targetStaffCode: user.staffCode,
      previousIsActive,
      nextIsActive: payload.isActive,
      reason: payload.reason ?? null,
    });

    return this.usersService.findById(userId);
  }

  async verifyDeleteOwnAccountOtp(
    payload: VerifyEmailOtpDto,
    actor: { userId: string; email: string; role: string },
  ) {
    const challenge = await this.authRepository.findOtpChallengeById(payload.enrollmentId);
    if (!challenge) {
      throw new NotFoundException('OTP enrollment not found');
    }

    if (challenge.purpose !== 'account_delete') {
      throw new BadRequestException('OTP purpose does not match account deletion');
    }

    if (challenge.userId !== actor.userId) {
      throw new UnauthorizedException('Delete verification does not belong to the authenticated user');
    }

    if (challenge.consumedAt) {
      throw new ConflictException('OTP has already been used');
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP has expired');
    }

    this.assertOtpAttemptAvailable(challenge);
    const isOtpValid = await bcrypt.compare(payload.otp, challenge.otpHash);
    if (!isOtpValid) {
      await this.rejectInvalidOtp(challenge);
    }

    await this.authRepository.consumeOtpChallenge(challenge.id);

    const user = await this.usersService.findById(actor.userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    await this.authRepository.softDeleteUserAccount({
      userId: user.id,
      email: this.requireAuthEmail(user.email, 'This identity has no login email'),
    });

    return {
      status: 'account_soft_deleted',
      message: 'The account was archived successfully. You can sign up again with the same email later.',
    };
  }

  private async verifyOtpChallenge(
    enrollmentId: string,
    otp: string,
    purpose:
      | 'customer_signup'
      | 'staff_activation'
      | 'account_delete'
      | 'forgot_password'
      | 'change_password'
      | 'staff_phone_change',
  ) {
    const challenge = await this.authRepository.findOtpChallengeById(enrollmentId);
    if (!challenge) {
      throw new NotFoundException('OTP enrollment not found');
    }

    if (challenge.purpose !== purpose) {
      throw new BadRequestException(`OTP purpose does not match ${purpose.replace(/_/g, ' ')}`);
    }

    if (challenge.consumedAt) {
      throw new ConflictException('OTP has already been used');
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP has expired');
    }

    this.assertOtpAttemptAvailable(challenge);
    const isOtpValid = await bcrypt.compare(otp, challenge.otpHash);
    if (!isOtpValid) {
      await this.rejectInvalidOtp(challenge);
    }

    await this.authRepository.consumeOtpChallenge(challenge.id);

    return challenge;
  }

  private assertOtpAttemptAvailable(challenge: { attempts?: number | null }) {
    if ((challenge.attempts ?? 0) >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('OTP attempt limit reached. Request a new code.');
    }
  }

  private async rejectInvalidOtp(challenge: { id: string; attempts?: number | null }): Promise<never> {
    const updatedChallenge = await this.authRepository.incrementOtpAttempts(challenge.id);
    if ((updatedChallenge?.attempts ?? MAX_OTP_ATTEMPTS) >= MAX_OTP_ATTEMPTS) {
      await this.authRepository.consumeOtpChallenge(challenge.id);
      throw new BadRequestException('OTP attempt limit reached. Request a new code.');
    }

    throw new BadRequestException('Invalid OTP');
  }

  private async issueTokens(user: { id: string; email: string | null; role: string; profile?: unknown }) {
    const email = this.requireAuthEmail(user.email, 'This identity has no login email');
    const accessPayload: TokenPayload = {
      sub: user.id,
      email,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: TokenPayload = {
      ...accessPayload,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn as never,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as never,
      }),
    ]);

    await this.authRepository.storeRefreshToken(
      user.id,
      await bcrypt.hash(refreshToken, 10),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  private async createOtpEnrollment(payload: {
    userId: string;
    email: string;
    purpose:
      | 'customer_signup'
      | 'staff_activation'
      | 'account_delete'
      | 'forgot_password'
      | 'change_password'
      | 'staff_phone_change';
    activationContext:
      | 'customer_signup'
      | 'staff_activation'
      | 'account_delete'
      | 'forgot_password'
      | 'change_password'
      | 'staff_phone_change';
    status:
      | 'pending_activation'
      | 'pending_delete_verification'
      | 'pending_reset_verification'
      | 'pending_change_verification';
  }) {
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const challenge = await this.authRepository.createOtpChallenge({
      userId: payload.userId,
      purpose: payload.purpose,
      email: payload.email,
      otpHash,
      expiresAt,
    });

    const notification = await this.notificationsService.enqueueAuthOtpDelivery({
      userId: payload.userId,
      otp,
      email: payload.email,
      activationContext: payload.activationContext,
      dedupeKey: `auth-otp-${challenge.id}`,
      sourceId: challenge.id,
    });

    if (!notification?.id || notification?.status === 'failed') {
      throw new ServiceUnavailableException(
        'OTP email could not be queued right now. Please try again later.',
      );
    }

    if (notification?.id && notification?.status === 'queued') {
      const deliveryResult = await this.notificationsService.deliverNotification(notification.id);

      if (deliveryResult?.status !== 'sent') {
        throw new ServiceUnavailableException(
          'OTP email could not be delivered right now. Please try again later.',
        );
      }
    }

    return {
      enrollmentId: challenge.id,
      userId: payload.userId,
      maskedEmail: this.maskEmail(payload.email),
      otpExpiresAt: expiresAt.toISOString(),
      status: payload.status,
    };
  }

  private generateOtp() {
    return `${randomInt(100000, 1000000)}`;
  }

  private generateStaffTemporaryPassword() {
    return randomBytes(24).toString('base64url');
  }

  private async deliverStaffTemporaryCredential(payload: {
    email: string;
    displayName: string;
    temporaryPassword: string;
  }) {
    try {
      if (!this.mailDeliveryService) {
        throw new Error('Mail delivery is unavailable');
      }

      await this.mailDeliveryService.sendMail({
        to: payload.email,
        subject: 'Your AUTOCARE staff account',
        text: [
          `Hello ${payload.displayName},`,
          '',
          'Your AUTOCARE staff account is ready.',
          `Login email: ${payload.email}`,
          `Temporary password: ${payload.temporaryPassword}`,
          '',
          'Sign in and change this temporary password before accessing staff tools.',
        ].join('\n'),
      });

      return {
        status: 'sent' as const,
        channel: 'email' as const,
        targetEmail: payload.email,
        retryable: false as const,
      };
    } catch {
      throw new ServiceUnavailableException({
        code: 'STAFF_CREDENTIAL_DELIVERY_FAILED',
        message:
          'The staff account was created, but its temporary credential could not be delivered. Retry credential delivery to rotate and send a new temporary password.',
        delivery: {
          status: 'failed',
          channel: 'email',
          targetEmail: payload.email,
          retryable: true,
          destination: '/api/admin/staff-accounts/credentials/retry',
        },
      });
    }
  }

  private normalizePhilippineMobile(value: string) {
    const normalized = String(value ?? '').replace(/\D/g, '').slice(0, 11);
    if (!/^09\d{9}$/.test(normalized)) {
      throw new BadRequestException('Phone number must be an 11-digit PH mobile number starting with 09');
    }

    return normalized;
  }

  private assertStaffProfileActor(role: string) {
    if (!['technician', 'head_technician', 'service_adviser', 'super_admin'].includes(role)) {
      throw new BadRequestException('Only staff accounts can change phone numbers through this flow');
    }
  }

  private maskEmail(email: string) {
    const [localPart, domainPart] = email.trim().toLowerCase().split('@');
    if (!localPart || !domainPart) {
      return '***';
    }

    if (localPart.length <= 2) {
      return `${localPart[0] ?? '*'}***@${domainPart}`;
    }

    return `${localPart.slice(0, 2)}***@${domainPart}`;
  }

  private requireAuthEmail(email: string | null | undefined, message: string) {
    if (!email) {
      throw new UnauthorizedException(message);
    }

    return email;
  }
}
