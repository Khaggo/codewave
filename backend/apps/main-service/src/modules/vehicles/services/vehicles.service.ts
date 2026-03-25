import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';

import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { VehiclesRepository } from '../repositories/vehicles.repository';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly usersService: UsersService,
  ) {}

  async create(createVehicleDto: CreateVehicleDto) {
    const user = await this.usersService.findById(createVehicleDto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingVehicle = await this.vehiclesRepository.findByPlateNumber(createVehicleDto.plateNumber);
    if (existingVehicle) {
      throw new ConflictException('Vehicle plate number already exists');
    }

    return this.vehiclesRepository.create(createVehicleDto);
  }

  async findById(id: string) {
    const vehicle = await this.vehiclesRepository.findById(id);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async findByUserId(userId: string) {
    return this.vehiclesRepository.findByUserId(userId);
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    if (updateVehicleDto.plateNumber) {
      const existingVehicle = await this.vehiclesRepository.findByPlateNumber(updateVehicleDto.plateNumber);
      if (existingVehicle && existingVehicle.id !== id) {
        throw new ConflictException('Vehicle plate number already exists');
      }
    }

    return this.vehiclesRepository.update(id, updateVehicleDto);
  }
}
