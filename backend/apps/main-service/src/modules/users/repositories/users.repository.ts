import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpsertAddressDto } from '../dto/upsert-address.dto';
import { addresses, userProfiles, users } from '../schemas/users.schema';
import { CreateManagedUserInput } from '../users.types';

@Injectable()
export class UsersRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async create(payload: CreateManagedUserInput | CreateUserDto) {
    return this.db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          email: payload.email,
          role: 'role' in payload ? payload.role : 'customer',
          staffCode: 'staffCode' in payload ? payload.staffCode ?? null : null,
        })
        .returning();

      const [createdProfile] = await tx
        .insert(userProfiles)
        .values({
          userId: createdUser.id,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone,
        })
        .returning();

      return {
        ...createdUser,
        profile: createdProfile,
      };
    });
  }

  async findById(id: string) {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        profile: true,
        addresses: {
          orderBy: desc(addresses.createdAt),
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        profile: true,
        addresses: true,
      },
    });
  }

  async findByStaffCode(staffCode: string) {
    return this.db.query.users.findFirst({
      where: eq(users.staffCode, staffCode),
      with: {
        profile: true,
        addresses: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.db.transaction(async (tx) => {
      const existingUser = await tx.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          profile: true,
        },
      });

      const currentUser = this.assertFound(existingUser, 'User not found');
      const currentProfile = Array.isArray(currentUser.profile)
        ? currentUser.profile[0] ?? null
        : currentUser.profile;

      if (currentProfile) {
        await tx
          .update(userProfiles)
          .set({
            firstName: updateUserDto.firstName ?? currentProfile.firstName,
            lastName: updateUserDto.lastName ?? currentProfile.lastName,
            phone: updateUserDto.phone ?? currentProfile.phone ?? null,
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, id));
      }

      return this.findById(id);
    });
  }

  async updateActivationStatus(id: string, isActive: boolean) {
    await this.db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return this.findById(id);
  }

  async addAddress(userId: string, payload: UpsertAddressDto) {
    return this.db.transaction(async (tx) => {
      const existingUser = await tx.query.users.findFirst({
        where: eq(users.id, userId),
      });

      this.assertFound(existingUser, 'User not found');

      if (payload.isDefault) {
        await tx
          .update(addresses)
          .set({
            isDefault: false,
            updatedAt: new Date(),
          })
          .where(eq(addresses.userId, userId));
      }

      const [createdAddress] = await tx
        .insert(addresses)
        .values({
          userId,
          ...payload,
        })
        .returning();

      return createdAddress;
    });
  }

  async updateAddress(userId: string, addressId: string, payload: UpdateAddressDto) {
    return this.db.transaction(async (tx) => {
      const existingAddress = await tx.query.addresses.findFirst({
        where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
      });

      this.assertFound(existingAddress, 'Address not found');

      if (payload.isDefault) {
        await tx
          .update(addresses)
          .set({
            isDefault: false,
            updatedAt: new Date(),
          })
          .where(eq(addresses.userId, userId));
      }

      const [updatedAddress] = await tx
        .update(addresses)
        .set({
          ...payload,
          updatedAt: new Date(),
        })
        .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
        .returning();

      return updatedAddress;
    });
  }
}
