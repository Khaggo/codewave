import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthRepository } from '@main-modules/auth/repositories/auth.repository';
import { AuthService } from '@main-modules/auth/services/auth.service';
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
});
