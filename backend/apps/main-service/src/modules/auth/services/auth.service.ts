import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from '@main-modules/users/dto/create-user.dto';
import { UsersService } from '@main-modules/users/services/users.service';
import { NotificationsService } from '@main-modules/notifications/services/notifications.service';
import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';

import { GoogleSignupStartDto } from '../dto/google-signup-start.dto';
import { LoginDto } from '../dto/login.dto';
import { CreateStaffAccountDto } from '../dto/create-staff-account.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { UpdateStaffAccountStatusDto } from '../dto/update-staff-account-status.dto';
import { VerifyEmailOtpDto } from '../dto/verify-email-otp.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { GoogleIdentityService } from './google-identity.service';

type TokenPayload = {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
};

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

    const isOtpValid = await bcrypt.compare(payload.otp, challenge.otpHash);
    if (!isOtpValid) {
      await this.authRepository.incrementOtpAttempts(
        challenge.id,
        (challenge.attempts ?? 0) + 1,
      );
      throw new BadRequestException('Invalid OTP');
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

    return this.issueTokens(user);
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

    const isOtpValid = await bcrypt.compare(payload.otp, challenge.otpHash);
    if (!isOtpValid) {
      await this.authRepository.incrementOtpAttempts(
        challenge.id,
        (challenge.attempts ?? 0) + 1,
      );
      throw new BadRequestException('Invalid OTP');
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

    return this.issueTokens(user);
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

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    await this.authRepository.createAccount(user.id, passwordHash);
    await this.usersService.setActivationStatus(user.id, false);
    await this.authRepository.updateAccountStatus(user.id, false);

    return this.createOtpEnrollment({
      userId: user.id,
      email: user.email,
      purpose: 'customer_signup',
      activationContext: 'customer_signup',
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

    await this.authRepository.logLoginAttempt({
      userId: user.id,
      email: loginDto.email,
      ipAddress,
      wasSuccessful: true,
    });

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
    if (!account?.isActive) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokens(user);
  }

  async provisionStaffAccount(
    payload: CreateStaffAccountDto,
    actor: { userId: string; role: string },
  ) {
    const user = await this.usersService.createManagedUser({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      role: payload.role,
      staffCode: payload.staffCode,
    });

    const passwordHash = await bcrypt.hash(payload.password, 10);
    await this.authRepository.createAccount(user.id, passwordHash);
    await this.usersService.setActivationStatus(user.id, false);
    await this.authRepository.updateAccountStatus(user.id, false);

    const auditLog = await this.authRepository.createStaffAdminAuditLog({
      action: 'staff_account_provisioned',
      actorUserId: actor.userId,
      actorRole: 'super_admin',
      targetUserId: user.id,
      targetRole: user.role as 'technician' | 'service_adviser' | 'super_admin',
      targetEmail: user.email,
      targetStaffCode: user.staffCode,
      previousIsActive: null,
      nextIsActive: false,
      reason: null,
    });

    this.eventBus.publish('staff_account.provisioned', {
      auditLogId: auditLog.id,
      actorUserId: actor.userId,
      actorRole: 'super_admin',
      targetUserId: user.id,
      targetRole: user.role as 'technician' | 'service_adviser' | 'super_admin',
      targetEmail: user.email,
      targetStaffCode: user.staffCode,
      reason: null,
    });

    return this.usersService.findById(user.id);
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

    const previousIsActive = user.isActive;

    if (payload.isActive) {
      const identity = await this.authRepository.findGoogleIdentityByEmail(user.email);
      if (!identity) {
        throw new BadRequestException('Staff account has not completed activation');
      }
    }

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
      targetRole: user.role as 'technician' | 'service_adviser' | 'super_admin',
      targetEmail: user.email,
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
      targetRole: user.role as 'technician' | 'service_adviser' | 'super_admin',
      targetEmail: user.email,
      targetStaffCode: user.staffCode,
      previousIsActive,
      nextIsActive: payload.isActive,
      reason: payload.reason ?? null,
    });

    return this.usersService.findById(userId);
  }

  private async issueTokens(user: { id: string; email: string; role: string; profile?: unknown }) {
    const accessPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
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
    purpose: 'customer_signup' | 'staff_activation';
    activationContext: 'customer_signup' | 'staff_activation';
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

    await this.notificationsService.enqueueAuthOtpDelivery({
      userId: payload.userId,
      otp,
      email: payload.email,
      activationContext: payload.activationContext,
      dedupeKey: `auth-otp-${challenge.id}`,
      sourceId: challenge.id,
    });

    return {
      enrollmentId: challenge.id,
      userId: payload.userId,
      maskedEmail: this.maskEmail(payload.email),
      otpExpiresAt: expiresAt.toISOString(),
      status: 'pending_activation',
    };
  }

  private generateOtp() {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
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
}
