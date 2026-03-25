import { Test } from '@nestjs/testing';

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
});
