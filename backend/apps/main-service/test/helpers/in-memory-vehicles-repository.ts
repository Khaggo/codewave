import { randomUUID } from 'crypto';

import { NotFoundException } from '@nestjs/common';

import { CreateVehicleDto } from '../../src/modules/vehicles/dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../../src/modules/vehicles/dto/update-vehicle.dto';
import { findInMemoryGaragePage } from './in-memory-vehicles-garage';

export type VehicleRecord = {
  id: string;
  userId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  vin: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class InMemoryVehiclesRepository {
  private readonly vehicles = new Map<string, VehicleRecord>();

  peekById(id: string) {
    return this.vehicles.get(id) ?? null;
  }

  async create(createVehicleDto: CreateVehicleDto) {
    const now = new Date();
    const vehicle: VehicleRecord = {
      id: randomUUID(),
      userId: createVehicleDto.userId,
      plateNumber: createVehicleDto.plateNumber,
      make: createVehicleDto.make,
      model: createVehicleDto.model,
      year: createVehicleDto.year,
      color: createVehicleDto.color ?? null,
      vin: createVehicleDto.vin ?? null,
      notes: createVehicleDto.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.vehicles.set(vehicle.id, vehicle);
    return { ...vehicle };
  }

  async findById(id: string) {
    const vehicle = this.vehicles.get(id);
    return vehicle ? { ...vehicle } : null;
  }

  async findByPlateNumber(plateNumber: string) {
    const vehicle = Array.from(this.vehicles.values()).find(
      (entry) => entry.plateNumber === plateNumber,
    );
    return vehicle ? { ...vehicle } : null;
  }

  async findByPlateSignature(plateSignature: string) {
    const vehicle = Array.from(this.vehicles.values()).find(
      (entry) =>
        entry.plateNumber.replace(/[^a-z0-9]/gi, '').toUpperCase() ===
        plateSignature,
    );
    return vehicle ? { ...vehicle } : null;
  }

  async findByUserId(userId: string) {
    return Array.from(this.vehicles.values())
      .filter((vehicle) => vehicle.userId === userId)
      .map((vehicle) => ({ ...vehicle }));
  }

  async findGaragePage(query: {
    userId: string;
    search: string;
    cursor?: { createdAt: Date; id: string };
    limit: number;
  }) {
    return findInMemoryGaragePage(this.vehicles.values(), query);
  }

  async findOwnedByUser(vehicleId: string, userId: string) {
    const vehicle = Array.from(this.vehicles.values()).find(
      (entry) => entry.id === vehicleId && entry.userId === userId,
    );

    return vehicle ? { ...vehicle } : null;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const updatedVehicle: VehicleRecord = {
      ...vehicle,
      ...updateVehicleDto,
      updatedAt: new Date(),
    };

    this.vehicles.set(id, updatedVehicle);
    return { ...updatedVehicle };
  }
}
