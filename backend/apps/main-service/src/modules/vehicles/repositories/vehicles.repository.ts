import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, lt, or, sql } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { vehicles } from '../schemas/vehicles.schema';
import { VehicleGarageCursor } from '../services/vehicle-garage-pagination';

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

  async findByPlateSignature(plateSignature: string) {
    const [vehicle] = await this.db
      .select()
      .from(vehicles)
      .where(
        sql`regexp_replace(upper(${vehicles.plateNumber}), '[^A-Z0-9]', '', 'g') = ${plateSignature}`,
      )
      .limit(1);

    return vehicle ?? null;
  }

  async findByUserId(userId: string) {
    return this.db.query.vehicles.findMany({
      where: eq(vehicles.userId, userId),
    });
  }

  async findGaragePage({
    userId,
    search,
    cursor,
    limit,
  }: {
    userId: string;
    search: string;
    cursor?: VehicleGarageCursor;
    limit: number;
  }) {
    const escapedSearch = search.replace(/[\\%_]/g, '\\$&');
    const searchCondition = search
      ? or(
          ilike(vehicles.plateNumber, `%${escapedSearch}%`),
          ilike(vehicles.make, `%${escapedSearch}%`),
          ilike(vehicles.model, `%${escapedSearch}%`),
        )
      : undefined;
    const filteredCondition = searchCondition
      ? and(eq(vehicles.userId, userId), searchCondition)
      : eq(vehicles.userId, userId);
    const pageCondition = cursor
      ? and(
          filteredCondition,
          or(
            lt(vehicles.createdAt, cursor.createdAt),
            and(eq(vehicles.createdAt, cursor.createdAt), lt(vehicles.id, cursor.id)),
          ),
        )
      : filteredCondition;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select({
          id: vehicles.id,
          plateNumber: vehicles.plateNumber,
          make: vehicles.make,
          model: vehicles.model,
          year: vehicles.year,
          color: vehicles.color,
          vin: vehicles.vin,
          createdAt: vehicles.createdAt,
        })
        .from(vehicles)
        .where(pageCondition)
        .orderBy(desc(vehicles.createdAt), desc(vehicles.id))
        .limit(limit + 1),
      this.db
        .select({ value: count() })
        .from(vehicles)
        .where(filteredCondition),
    ]);
    const hasNext = rows.length > limit;

    return {
      items: rows.slice(0, limit),
      total: Number(totalRows[0]?.value ?? 0),
      hasNext,
    };
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
