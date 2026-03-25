import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { vehicles } from '../schemas/vehicles.schema';

@Injectable()
export class VehiclesRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async create(createVehicleDto: CreateVehicleDto) {
    const [vehicle] = await this.db.insert(vehicles).values(createVehicleDto).returning();
    return vehicle;
  }

  async findById(id: string) {
    return this.db.query.vehicles.findFirst({
      where: eq(vehicles.id, id),
    });
  }

  async findByPlateNumber(plateNumber: string) {
    return this.db.query.vehicles.findFirst({
      where: eq(vehicles.plateNumber, plateNumber),
    });
  }

  async findByUserId(userId: string) {
    return this.db.query.vehicles.findMany({
      where: eq(vehicles.userId, userId),
    });
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    const [vehicle] = await this.db
      .update(vehicles)
      .set({
        ...updateVehicleDto,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, id))
      .returning();

    return this.assertFound(vehicle, 'Vehicle not found');
  }

  async findOwnedByUser(vehicleId: string, userId: string) {
    return this.db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)),
    });
  }
}
