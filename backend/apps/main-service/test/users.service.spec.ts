import { Test } from '@nestjs/testing';

import { UsersRepository } from '@main-modules/users/repositories/users.repository';
import { UsersService } from '@main-modules/users/services/users.service';

describe('UsersService', () => {
  it('creates a user when the email is not taken', async () => {
    const repository = {
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

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: repository,
        },
      ],
    }).compile();

    const service = moduleRef.get(UsersService);

    const result = await service.create({
      email: 'customer@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(repository.findByEmail).toHaveBeenCalledWith('customer@example.com');
    expect(repository.create).toHaveBeenCalled();
    expect(result.id).toBe('user-1');
  });
});
