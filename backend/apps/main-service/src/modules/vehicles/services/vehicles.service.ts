import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';

import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { ListCustomerGarageQueryDto } from '../dto/list-customer-garage-query.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { VehiclesRepository } from '../repositories/vehicles.repository';
import {
  decodeVehicleGarageCursor,
  encodeVehicleGarageCursor,
  normalizeVehicleGarageSearch,
} from './vehicle-garage-pagination';

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

    const normalizedPlateNumber = this.normalizePlateNumber(createVehicleDto.plateNumber);
    const existingVehicle = await this.vehiclesRepository.findByPlateSignature(
      this.buildPlateSignature(normalizedPlateNumber),
    );
    if (existingVehicle) {
      throw new ConflictException('Vehicle plate number already exists');
    }

    return this.vehiclesRepository.create({
      ...createVehicleDto,
      plateNumber: normalizedPlateNumber,
    });
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

  async findGaragePage(
    userId: string,
    query: ListCustomerGarageQueryDto,
    actor?: { userId: string; role: string },
  ) {
    if (actor) {
      this.assertVehicleActorCanAccessUser(userId, actor);
    }

    const limit = query.limit ?? 3;
    const search = normalizeVehicleGarageSearch(query.search);
    const page = await this.vehiclesRepository.findGaragePage({
      userId,
      search,
      cursor: decodeVehicleGarageCursor(query.cursor, search),
      limit,
    });
    const lastItem = page.items[page.items.length - 1];

    return {
      items: page.items.map((vehicle) => ({
        id: vehicle.id,
        publicReference: vehicle.publicReference,
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        vin: vehicle.vin,
      })),
      page: {
        limit,
        total: page.total,
        hasNext: page.hasNext,
        nextCursor:
          page.hasNext && lastItem
            ? encodeVehicleGarageCursor(
                {
                  createdAt: lastItem.createdAt,
                  id: lastItem.id,
                },
                search,
              )
            : null,
      },
    };
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
      const normalizedPlateNumber = this.normalizePlateNumber(updateVehicleDto.plateNumber);
      const conflictingVehicle = await this.vehiclesRepository.findByPlateSignature(
        this.buildPlateSignature(normalizedPlateNumber),
      );
      if (conflictingVehicle && conflictingVehicle.id !== id) {
        throw new ConflictException('Vehicle plate number already exists');
      }

      updateVehicleDto = {
        ...updateVehicleDto,
        plateNumber: normalizedPlateNumber,
      };
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

  private normalizePlateNumber(value: string) {
    const normalizedPlateNumber = String(value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9 -]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const plateSignature = this.buildPlateSignature(normalizedPlateNumber);

    if (!normalizedPlateNumber) {
      throw new BadRequestException('Vehicle plate number is required');
    }

    if (plateSignature.length < 4 || plateSignature.length > 10) {
      throw new BadRequestException('Vehicle plate number must use 4-10 letters or numbers');
    }

    return normalizedPlateNumber;
  }

  private buildPlateSignature(value: string) {
    return String(value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }
}
