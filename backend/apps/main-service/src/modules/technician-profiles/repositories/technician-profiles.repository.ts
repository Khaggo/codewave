import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { technicianProfiles } from '../schemas/technician-profiles.schema';

@Injectable()
export class TechnicianProfilesRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async list(options?: { specialty?: string; activeOnly?: boolean }) {
    const filters = [];

    if (options?.activeOnly) {
      filters.push(eq(technicianProfiles.isActive, true));
    }

    if (options?.specialty) {
      filters.push(
        sql`${technicianProfiles.specialties} @> ${JSON.stringify([options.specialty])}::jsonb`,
      );
    }

    return this.db.query.technicianProfiles.findMany({
      where: filters.length ? and(...filters) : undefined,
      orderBy: [asc(technicianProfiles.fullName)],
    });
  }

  async findById(id: string) {
    return this.db.query.technicianProfiles.findFirst({
      where: eq(technicianProfiles.id, id),
    });
  }

  async findActiveByIds(ids: string[]) {
    if (!ids.length) {
      return [];
    }

    return this.db.query.technicianProfiles.findMany({
      where: and(inArray(technicianProfiles.id, ids), eq(technicianProfiles.isActive, true)),
      orderBy: [asc(technicianProfiles.fullName)],
    });
  }

  async findByMigratedUserId(userId: string) {
    return this.db.query.technicianProfiles.findFirst({
      where: eq(technicianProfiles.migratedFromUserId, userId),
    });
  }

  async create(payload: {
    code: string;
    fullName: string;
    specialties: string[];
    phone?: string | null;
    notes?: string | null;
    migratedFromUserId?: string | null;
  }) {
    try {
      const [created] = await this.db
        .insert(technicianProfiles)
        .values({
          code: payload.code,
          fullName: payload.fullName,
          specialties: payload.specialties,
          phone: payload.phone ?? null,
          notes: payload.notes ?? null,
          migratedFromUserId: payload.migratedFromUserId ?? null,
        })
        .returning();

      return this.assertFound(created, 'Technician profile not found');
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Technician profile code already exists');
      }

      throw error;
    }
  }

  async update(
    id: string,
    payload: {
      fullName?: string;
      specialties?: string[];
      phone?: string | null;
      notes?: string | null;
      isActive?: boolean;
    },
  ) {
    const [updated] = await this.db
      .update(technicianProfiles)
      .set({
        fullName: payload.fullName,
        specialties: payload.specialties,
        phone: payload.phone,
        notes: payload.notes,
        isActive: payload.isActive,
        updatedAt: new Date(),
      })
      .where(eq(technicianProfiles.id, id))
      .returning();

    return updated ?? null;
  }
}
