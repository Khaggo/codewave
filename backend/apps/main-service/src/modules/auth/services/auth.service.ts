import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from '@main-modules/users/dto/create-user.dto';
import { UsersService } from '@main-modules/users/services/users.service';

import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthRepository } from '../repositories/auth.repository';

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
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.accessSecret = configService.getOrThrow<string>('jwt.accessSecret');
    this.refreshSecret = configService.getOrThrow<string>('jwt.refreshSecret');
    this.accessExpiresIn = configService.get<string>('jwt.accessExpiresIn', '15m');
    this.refreshExpiresIn = configService.get<string>('jwt.refreshExpiresIn', '7d');
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
      role: 'customer',
    } satisfies CreateUserDto);

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    await this.authRepository.createAccount(user.id, passwordHash);

    return this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
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
    if (!account || !account.isActive) {
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
    const payload = await this.jwtService.verifyAsync<TokenPayload>(refreshTokenDto.refreshToken, {
      secret: this.refreshSecret,
    });

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
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokens(user);
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
}
