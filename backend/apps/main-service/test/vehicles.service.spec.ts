import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesRepository } from '@main-modules/vehicles/repositories/vehicles.repository';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

describe('VehiclesService', () => {
  it('creates a vehicle when the owner exists and the plate is unique', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
      }),
    };

    const vehiclesRepository = {
      findByPlateNumber: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'vehicle-1',
        userId: 'user-1',
        plateNumber: 'ABC1234',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: VehiclesRepository, useValue: vehiclesRepository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    const service = moduleRef.get(VehiclesService);

    const result = await service.create({
      userId: 'user-1',
      plateNumber: 'ABC1234',
      make: 'Toyota',
      model: 'Vios',
      year: 2020,
    });

    expect(usersService.findById).toHaveBeenCalledWith('user-1');
    expect(vehiclesRepository.findByPlateNumber).toHaveBeenCalledWith('ABC1234');
    expect(vehiclesRepository.create).toHaveBeenCalled();
    expect(result.id).toBe('vehicle-1');
  });

  it('rejects vehicle creation when the owner does not exist', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const vehiclesRepository = {
      findByPlateNumber: jest.fn(),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: VehiclesRepository, useValue: vehiclesRepository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    const service = moduleRef.get(VehiclesService);

    await expect(
      service.create({
        userId: 'missing-user-id',
        plateNumber: 'ABC1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2020,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(vehiclesRepository.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate plate numbers during vehicle creation', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
      }),
    };

    const vehiclesRepository = {
      findByPlateNumber: jest.fn().mockResolvedValue({
        id: 'vehicle-1',
        plateNumber: 'ABC1234',
      }),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: VehiclesRepository, useValue: vehiclesRepository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    const service = moduleRef.get(VehiclesService);

    await expect(
      service.create({
        userId: 'user-1',
        plateNumber: 'ABC1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2020,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(vehiclesRepository.create).not.toHaveBeenCalled();
  });

  it('propagates not found when updating a missing vehicle', async () => {
    const vehiclesRepository = {
      findByPlateNumber: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockRejectedValue(new NotFoundException('Vehicle not found')),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: VehiclesRepository, useValue: vehiclesRepository },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(VehiclesService);

    await expect(
      service.update('missing-vehicle-id', {
        color: 'Blue',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
