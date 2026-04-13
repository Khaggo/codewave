import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';

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

  it('rejects duplicate user emails', async () => {
    const repository = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
      }),
      create: jest.fn(),
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

    await expect(
      service.create({
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('requires a staff code for managed staff users and rejects duplicate staff codes', async () => {
    const repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByStaffCode: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-2',
          email: 'staff@example.com',
          staffCode: 'SA-0001',
        }),
      create: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'staff@example.com',
        role: 'service_adviser',
        staffCode: 'SA-0001',
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

    await expect(
      service.createManagedUser({
        email: 'staff@example.com',
        firstName: 'Maria',
        lastName: 'Santos',
        role: 'service_adviser',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createManagedUser({
        email: 'staff@example.com',
        firstName: 'Maria',
        lastName: 'Santos',
        role: 'service_adviser',
        staffCode: 'SA-0001',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'user-1',
        role: 'service_adviser',
        staffCode: 'SA-0001',
      }),
    );

    await expect(
      service.createManagedUser({
        email: 'another.staff@example.com',
        firstName: 'Ana',
        lastName: 'Reyes',
        role: 'technician',
        staffCode: 'SA-0001',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
