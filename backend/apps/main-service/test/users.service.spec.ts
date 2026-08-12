import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

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
      findActiveByPhone: jest.fn().mockResolvedValue(null),
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

  it('rejects customer access to another user profile record', async () => {
    const repository = {
      findById: jest.fn(),
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
      service.findById('user-1', {
        userId: 'other-user',
        role: 'customer',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('allows staff roles to update another user profile record', async () => {
    const repository = {
      findActiveByPhone: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({
        id: 'user-1',
        profile: {
          firstName: 'Updated',
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

    await expect(
      service.update(
        'user-1',
        {
          firstName: 'Updated',
        },
        {
          userId: 'staff-user',
          role: 'service_adviser',
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'user-1',
      }),
    );
    expect(repository.update).toHaveBeenCalledWith('user-1', {
      firstName: 'Updated',
    });
  });

  it('rejects duplicate active phone numbers during managed user creation', async () => {
    const repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByStaffCode: jest.fn(),
      findActiveByPhone: jest.fn().mockResolvedValue({
        id: 'existing-user',
        profile: {
          phone: '09171234567',
        },
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
      service.createManagedUser({
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'customer',
        phone: '0917-123-4567',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.findActiveByPhone).toHaveBeenCalledWith('09171234567');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('allows only staff to create a walk-in identity and vehicle', async () => {
    const repository = {
      createWalkInCustomerWithVehicle: jest.fn(),
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
      service.createWalkInCustomer(
        {
          fullName: 'Jane Doe',
          phone: '0917-123-4567',
          consentAcknowledged: true,
          plateNumber: 'ABC-1234',
          make: 'Toyota',
          model: 'Vios',
          year: 2022,
        },
        { userId: 'customer-1', role: 'customer' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.createWalkInCustomerWithVehicle).not.toHaveBeenCalled();
  });

  it('returns non-login walk-in IDs without exposing auth fields', async () => {
    const repository = {
      createWalkInCustomerWithVehicle: jest.fn().mockResolvedValue({
        user: {
          userId: 'walk-in-user-1',
          identityKind: 'walk_in',
          firstName: 'Jane',
          lastName: 'Doe',
          email: null,
        },
        vehicle: {
          id: 'vehicle-1',
          publicReference: 'VEH-2026-000001',
          plateNumber: 'ABC 1234',
          make: 'Toyota',
          model: 'Vios',
          year: 2022,
        },
        customerCreated: true,
        vehicleCreated: true,
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
    const result = await service.createWalkInCustomer(
      {
        fullName: 'Jane Doe',
        phone: '0917-123-4567',
        consentAcknowledged: true,
        plateNumber: 'ABC-1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2022,
      },
      { userId: 'staff-1', role: 'service_adviser' },
    );

    expect(result).toEqual(
      expect.objectContaining({
        customerUserId: 'walk-in-user-1',
        vehicleId: 'vehicle-1',
        customerIdentityKind: 'walk_in',
        arrivalType: 'walk_in',
        customerCreated: true,
        vehicleCreated: true,
      }),
    );
    expect(result).not.toHaveProperty('passwordHash');
    expect(repository.createWalkInCustomerWithVehicle).toHaveBeenCalledWith(
      expect.objectContaining({
        email: null,
        phone: '09171234567',
        plateNumber: 'ABC-1234',
        contactConsentAcknowledgedAt: expect.any(Date),
      }),
    );
  });

  it('keeps an existing registered customer classified as walk-in when no booking exists', async () => {
    const repository = {
      createWalkInCustomerWithVehicle: jest.fn().mockResolvedValue({
        user: {
          userId: 'registered-user-1',
          identityKind: 'registered',
          firstName: 'Jane',
          lastName: 'Doe',
        },
        vehicle: {
          id: 'vehicle-1',
          publicReference: 'VEH-2026-000001',
          plateNumber: 'ABC 1234',
          make: 'Toyota',
          model: 'Vios',
          year: 2022,
        },
        customerCreated: false,
        vehicleCreated: false,
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

    const result = await moduleRef.get(UsersService).createWalkInCustomer(
      {
        fullName: 'Jane Doe',
        phone: '09171234567',
        consentAcknowledged: true,
        plateNumber: 'ABC 1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2022,
      },
      { userId: 'staff-1', role: 'service_adviser' },
    );

    expect(result).toEqual(
      expect.objectContaining({
        customerIdentityKind: 'registered',
        arrivalType: 'walk_in',
        customerReused: true,
        vehicleReused: true,
      }),
    );
  });

  it('rejects customer address creation on another user record', async () => {
    const repository = {
      addAddress: jest.fn(),
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
      service.addAddress(
        'user-1',
        {
          label: 'Home',
          addressLine1: '123 Main St',
          city: 'Quezon City',
          province: 'Metro Manila',
        },
        {
          userId: 'other-user',
          role: 'customer',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.addAddress).not.toHaveBeenCalled();
  });
});
