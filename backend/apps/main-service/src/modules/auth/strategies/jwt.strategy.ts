import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UsersService } from '@main-modules/users/services/users.service';
import { AuthRepository } from '../repositories/auth.repository';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh' | 'password_change';
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      return null;
    }

    const [user, account] = await Promise.all([
      this.usersService.findById(payload.sub),
      this.authRepository.findAccountByUserId(payload.sub),
    ]);

    if (!user || !user.isActive || !account?.isActive || account.mustChangePassword) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
