import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';
import { vehicles } from '@main-modules/vehicles/schemas/vehicles.schema';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpsertAddressDto } from '../dto/upsert-address.dto';
import { addresses, userProfiles, users } from '../schemas/users.schema';
import { CreateManagedUserInput, CreateWalkInCustomerInput, ListCustomersWithVehiclesQuery } from '../users.types';

type CustomerCursor = { createdAt: string; id: string };

const encodeCustomerCursor = (cursor: CustomerCursor) =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

const decodeCustomerCursor = (value?: string): CustomerCursor | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as CustomerCursor;
    if (!parsed.id || Number.isNaN(new Date(parsed.createdAt).getTime())) throw new Error('invalid');
    return parsed;
  } catch {
    throw new BadRequestException('Invalid customer list cursor');
  }
};

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
          birthday: null,
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

  async createWalkInCustomerWithVehicle(payload: CreateWalkInCustomerInput) {
    const plateSignature = payload.plateNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const lockKeys = [
      `walk-in-email:${payload.email ?? ''}`,
      `walk-in-phone:${payload.phone}`,
      `walk-in-plate:${plateSignature}`,
    ]
      .filter((key) => !key.endsWith(':'))
      .sort();

    return this.db.transaction(async (tx) => {
      // Advisory locks serialize matching contact/plate retries. The hashtext collision risk is theoretical;
      // the database unique plate constraint remains the final exact-duplicate guard.
      for (const lockKey of lockKeys) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
      }

      const contactProjection = {
        userId: users.id,
        email: users.email,
        role: users.role,
        identityKind: users.identityKind,
        deletedAt: users.deletedAt,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        phone: userProfiles.phone,
      };

      const [phoneMatch] = await tx
        .select(contactProjection)
        .from(userProfiles)
        .innerJoin(users, eq(userProfiles.userId, users.id))
        .where(and(eq(userProfiles.phone, payload.phone), isNull(users.deletedAt)))
        .limit(1);

      const [emailMatch] = payload.email
        ? await tx
            .select(contactProjection)
            .from(users)
            .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
            .where(sql`lower(${users.email}) = ${payload.email.toLowerCase()}`)
            .limit(1)
        : [];

      const contactMatches = [phoneMatch, emailMatch].filter(Boolean) as Array<
        typeof phoneMatch
      >;
      const matchedUserIds = new Set(contactMatches.map((match) => match.userId));
      if (matchedUserIds.size > 1) {
        throw new ConflictException({
          code: 'WALK_IN_CONTACT_MATCH_CONFLICT',
          message: 'Phone and email match different existing identities; select the correct customer.',
          matches: contactMatches.map((match) => ({
            customerUserId: match.userId,
            customerLabel: `${match.firstName} ${match.lastName}`.trim(),
            matchedBy: [
              match.userId === phoneMatch?.userId ? 'phone' : null,
              match.userId === emailMatch?.userId ? 'email' : null,
            ].filter(Boolean),
          })),
        });
      }

      const matchedContact = contactMatches[0];
      if (matchedContact && matchedContact.role !== 'customer') {
        throw new ConflictException({
          code: 'WALK_IN_CONTACT_MATCH_NON_CUSTOMER',
          message: 'The supplied contact belongs to a staff identity and cannot be reused as a customer.',
          customerUserId: matchedContact.userId,
        });
      }

      if (
        matchedContact &&
        (matchedContact.firstName + ' ' + matchedContact.lastName).trim().toLowerCase() !==
          `${payload.firstName} ${payload.lastName}`.trim().toLowerCase()
      ) {
        throw new ConflictException({
          code: 'WALK_IN_CONTACT_MATCH_NAME_CONFLICT',
          message: 'The supplied contact matches an existing customer with a different name; confirm the customer before continuing.',
          customerUserId: matchedContact.userId,
          customerLabel: `${matchedContact.firstName} ${matchedContact.lastName}`.trim(),
        });
      }

      if (matchedContact && payload.email && matchedContact.email && matchedContact.email.toLowerCase() !== payload.email) {
        throw new ConflictException({
          code: 'WALK_IN_CONTACT_MATCH_EMAIL_CONFLICT',
          message: 'The supplied phone matches a customer with a different email; confirm the customer before continuing.',
          customerUserId: matchedContact.userId,
        });
      }

      const [vehicleMatch] = await tx
        .select({
          id: vehicles.id,
          publicReference: vehicles.publicReference,
          userId: vehicles.userId,
          plateNumber: vehicles.plateNumber,
          make: vehicles.make,
          model: vehicles.model,
          year: vehicles.year,
          color: vehicles.color,
        })
        .from(vehicles)
        .where(
          sql`regexp_replace(upper(${vehicles.plateNumber}), '[^A-Z0-9]', '', 'g') = ${plateSignature}`,
        )
        .limit(1);

      if (vehicleMatch && (!matchedContact || vehicleMatch.userId !== matchedContact.userId)) {
        throw new ConflictException({
          code: 'WALK_IN_VEHICLE_OWNERSHIP_CONFLICT',
          message: 'The vehicle plate is already owned by another customer; select that customer or resolve the ownership conflict.',
          vehicleId: vehicleMatch.id,
          vehicleReference: vehicleMatch.publicReference,
          existingCustomerUserId: vehicleMatch.userId,
        });
      }

      if (
        vehicleMatch &&
        (vehicleMatch.make !== payload.make ||
          vehicleMatch.model !== payload.model ||
          vehicleMatch.year !== payload.year ||
          (payload.color ?? null) !== (vehicleMatch.color ?? null))
      ) {
        throw new ConflictException({
          code: 'WALK_IN_VEHICLE_DETAILS_CONFLICT',
          message: 'The vehicle plate matches an existing vehicle with different details; confirm the vehicle before continuing.',
          vehicleId: vehicleMatch.id,
          vehicleReference: vehicleMatch.publicReference,
        });
      }

      let user = matchedContact;
      let customerCreated = false;
      if (!user) {
        const [createdUser] = await tx
          .insert(users)
          .values({
            email: payload.email ?? null,
            role: 'customer',
            identityKind: 'walk_in',
          })
          .returning({
            userId: users.id,
            email: users.email,
            role: users.role,
            identityKind: users.identityKind,
            deletedAt: users.deletedAt,
          });

        await tx.insert(userProfiles).values({
          userId: createdUser.userId,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone,
          contactConsentAcknowledgedAt: payload.contactConsentAcknowledgedAt,
          birthday: null,
        });
        user = {
          ...createdUser,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone,
        };
        customerCreated = true;
      }

      let vehicle = vehicleMatch;
      let vehicleCreated = false;
      if (!vehicle) {
        const [createdVehicle] = await tx
          .insert(vehicles)
          .values({
            userId: user.userId,
            plateNumber: payload.plateNumber,
            make: payload.make,
            model: payload.model,
            year: payload.year,
            color: payload.color ?? null,
          })
          .returning();
        vehicle = createdVehicle;
        vehicleCreated = true;
      }

      return {
        user,
        vehicle,
        customerCreated,
        vehicleCreated,
      };
    });
  }

  async findActiveByPhone(phone: string, excludeUserId?: string) {
    const matchedProfile = await this.db.query.userProfiles.findFirst({
      where: eq(userProfiles.phone, phone),
      with: {
        user: true,
      },
    });

    const matchedUser = matchedProfile?.user ?? null;
    if (!matchedUser) {
      return null;
    }

    if (excludeUserId && matchedUser.id === excludeUserId) {
      return null;
    }

    if (!matchedUser.isActive || matchedUser.deletedAt) {
      return null;
    }

    return this.findById(matchedUser.id);
  }

  async listStaffAccounts(excludeUserId?: string) {
    const filters = [ne(users.role, 'customer'), isNull(users.deletedAt)];

    if (excludeUserId) {
      filters.push(ne(users.id, excludeUserId));
    }

    return this.db.query.users.findMany({
      where: and(...filters),
      with: {
        profile: true,
        addresses: {
          orderBy: desc(addresses.createdAt),
        },
      },
      orderBy: desc(users.createdAt),
    });
  }

  async countActiveByRole(role: 'technician' | 'head_technician' | 'service_adviser' | 'super_admin') {
    const activeUsers = await this.db.query.users.findMany({
      where: and(eq(users.role, role), eq(users.isActive, true), isNull(users.deletedAt)),
      columns: {
        id: true,
      },
    });

    return activeUsers.length;
  }

  async listCustomersWithVehicles(query: ListCustomersWithVehiclesQuery = {}) {
    const limit = Math.min(25, Math.max(1, query.limit ?? 25));
    const cursor = decodeCustomerCursor(query.cursor);
    const search = String(query.search ?? '').trim();
    const conditions = [eq(users.role, 'customer'), isNull(users.deletedAt)];
    if (query.customerId) conditions.push(eq(users.id, query.customerId));
    if (search) {
      const pattern = `%${search.replace(/[%_]/g, '\\$&')}%`;
      conditions.push(or(
        ilike(users.email, pattern),
        ilike(userProfiles.firstName, pattern),
        ilike(userProfiles.lastName, pattern),
        ilike(sql<string>`concat_ws(' ', ${userProfiles.firstName}, ${userProfiles.lastName})`, pattern),
      )!);
    }
    if (cursor) {
      const cursorDate = new Date(cursor.createdAt);
      conditions.push(or(
        lt(users.createdAt, cursorDate),
        and(eq(users.createdAt, cursorDate), lt(users.id, cursor.id)),
      )!);
    }

    const keyRows = await this.db
      .select({ id: users.id, createdAt: users.createdAt })
      .from(users)
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit + 1);
    const pageKeys = keyRows.slice(0, limit);
    const customerIds = pageKeys.map((row) => row.id);
    const unorderedCustomerRows = customerIds.length ? await this.db.query.users.findMany({
      where: inArray(users.id, customerIds),
      with: {
        profile: true,
        addresses: { orderBy: desc(addresses.createdAt) },
      },
    }) : [];
    const orderById = new Map(customerIds.map((id, index) => [id, index]));
    const customerRows = unorderedCustomerRows.sort((left, right) =>
      (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0));
    const vehicleRows = customerIds.length
      ? await this.db.query.vehicles.findMany({
          where: inArray(vehicles.userId, customerIds),
          orderBy: desc(vehicles.createdAt),
        })
      : [];
    const vehiclesByUserId = new Map<string, (typeof vehicleRows)[number][]>();

    vehicleRows.forEach((vehicle) => {
      const currentVehicles = vehiclesByUserId.get(vehicle.userId) ?? [];
      currentVehicles.push(vehicle);
      vehiclesByUserId.set(vehicle.userId, currentVehicles);
    });

    const items = customerRows.map((user) => ({
      ...user,
      vehicles: vehiclesByUserId.get(user.id) ?? [],
    }));
    const last = pageKeys.length > 0 ? pageKeys[pageKeys.length - 1] : undefined;
    return {
      items,
      nextCursor: keyRows.length > limit && last
        ? encodeCustomerCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null,
    };
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
            birthday: updateUserDto.birthday ?? currentProfile.birthday ?? null,
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, id));
      }

      const updatedUser = await tx.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          profile: true,
          addresses: {
            orderBy: desc(addresses.createdAt),
          },
        },
      });

      return this.assertFound(updatedUser, 'User not found');
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
