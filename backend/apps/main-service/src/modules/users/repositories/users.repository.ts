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

@Injectable()
export class UsersRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async create(createUserDto: CreateUserDto) {
    return this.db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          email: createUserDto.email,
          role: createUserDto.role ?? 'customer',
        })
        .returning();

      const [createdProfile] = await tx
        .insert(userProfiles)
        .values({
          userId: createdUser.id,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          phone: createUserDto.phone,
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

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.db.transaction(async (tx) => {
      const existingUser = await tx.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          profile: true,
        },
      });

      const currentUser = this.assertFound(existingUser, 'User not found');

      if (typeof updateUserDto.isActive === 'boolean') {
        await tx
          .update(users)
          .set({
            isActive: updateUserDto.isActive,
            updatedAt: new Date(),
          })
          .where(eq(users.id, id));
      }

      if (currentUser.profile) {
        await tx
          .update(userProfiles)
          .set({
            firstName: updateUserDto.firstName ?? currentUser.profile.firstName,
            lastName: updateUserDto.lastName ?? currentUser.profile.lastName,
            phone: updateUserDto.phone ?? currentUser.profile.phone ?? null,
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, id));
      }

      return this.findById(id);
    });
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
