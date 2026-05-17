import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

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

  async create(createVehicleDto: CreateVehicleDto, actor?: { userId: string; role: string }) {
    if (actor) {
      this.assertVehicleActorCanAccessUser(createVehicleDto.userId, actor);
    }
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

  async findById(id: string, actor?: { userId: string; role: string }) {
    const vehicle = await this.vehiclesRepository.findById(id);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (actor) {
      this.assertVehicleActorCanAccessUser(vehicle.userId, actor);
    }

    return vehicle;
  }

  async findByUserId(userId: string, actor?: { userId: string; role: string }) {
    if (actor) {
      this.assertVehicleActorCanAccessUser(userId, actor);
    }
    return this.vehiclesRepository.findByUserId(userId);
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto, actor?: { userId: string; role: string }) {
    const existingVehicle = await this.vehiclesRepository.findById(id);
    if (!existingVehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (actor) {
      this.assertVehicleActorCanAccessUser(existingVehicle.userId, actor);
    }

    if (updateVehicleDto.plateNumber) {
      const conflictingVehicle = await this.vehiclesRepository.findByPlateNumber(updateVehicleDto.plateNumber);
      if (conflictingVehicle && conflictingVehicle.id !== id) {
        throw new ConflictException('Vehicle plate number already exists');
      }
    }

    return this.vehiclesRepository.update(id, updateVehicleDto);
  }

  private assertVehicleActorCanAccessUser(userId: string, actor: { userId: string; role: string }) {
    if (!['customer', 'service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only customers, service advisers, or super admins can access vehicle records');
    }

    if (actor.role === 'customer' && actor.userId !== userId) {
      throw new ForbiddenException('Customers can only access their own vehicle records');
    }
  }
}
