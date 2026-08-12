import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateUserDto } from '../dto/create-user.dto';
import { CreateWalkInCustomerDto } from '../dto/create-walk-in-customer.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpsertAddressDto } from '../dto/upsert-address.dto';
import { UsersRepository } from '../repositories/users.repository';
import { CreateManagedUserInput } from '../users.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto) {
    return this.createManagedUser({
      ...createUserDto,
      role: 'customer',
    });
  }

  async createManagedUser(payload: CreateManagedUserInput) {
    const normalizedEmail = String(payload.email ?? '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Registered and staff identities require an email address');
    }

    const existingUser = await this.usersRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException('User email already exists');
    }

    const isStaffRole = payload.role !== 'customer';
    if (isStaffRole && !payload.staffCode) {
      throw new BadRequestException('Staff accounts require a staff code');
    }

    if (!isStaffRole && payload.staffCode) {
      throw new BadRequestException('Customer accounts cannot define a staff code');
    }

    if (payload.staffCode) {
      const existingStaffCode = await this.usersRepository.findByStaffCode(payload.staffCode);
      if (existingStaffCode) {
        throw new ConflictException('Staff code already exists');
      }
    }

    const normalizedPhone = this.normalizeOptionalPhilippineMobile(payload.phone);
    if (normalizedPhone) {
      const existingPhoneUser = await this.usersRepository.findActiveByPhone(normalizedPhone);
      if (existingPhoneUser) {
        throw new ConflictException('Phone number already exists');
      }
    }

    return this.usersRepository.create({
      ...payload,
      email: normalizedEmail,
      phone: normalizedPhone,
    });
  }

  async createWalkInCustomer(
    payload: CreateWalkInCustomerDto,
    actor: { userId: string; role: string },
  ) {
    if (!['service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can create walk-in customers');
    }

    const normalizedPhone = this.normalizeOptionalPhilippineMobile(payload.phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Walk-in customer phone number is required');
    }

    const nameParts = String(payload.fullName ?? '').trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      throw new BadRequestException('Walk-in customer full name must include a first and last name');
    }

    const normalizedPlateNumber = this.normalizeWalkInPlateNumber(payload.plateNumber);
    const result = await this.usersRepository.createWalkInCustomerWithVehicle({
      email: payload.email?.trim().toLowerCase() || null,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      phone: normalizedPhone,
      contactConsentAcknowledgedAt: new Date(),
      plateNumber: normalizedPlateNumber,
      make: payload.make.trim(),
      model: payload.model.trim(),
      year: payload.year,
      color: payload.color?.trim() || null,
      requestKey: payload.requestKey,
    });

    const customerLabel = `${result.user.firstName} ${result.user.lastName}`.trim();
    return {
      customerUserId: result.user.userId,
      customerIdentityKind: result.user.identityKind,
      vehicleId: result.vehicle.id,
      customerLabel,
      vehicleReference: result.vehicle.publicReference,
      vehicleLabel: `${result.vehicle.year} ${result.vehicle.make} ${result.vehicle.model} (${result.vehicle.plateNumber})`,
      arrivalType: 'walk_in' as const,
      customerCreated: result.customerCreated,
      customerReused: !result.customerCreated,
      vehicleCreated: result.vehicleCreated,
      vehicleReused: !result.vehicleCreated,
    };
  }

  async findById(id: string, actor?: { userId: string; role: string }) {
    if (actor) {
      this.assertUserActorCanAccessUser(id, actor);
    }
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findByStaffCode(staffCode: string) {
    return this.usersRepository.findByStaffCode(staffCode);
  }

  async listStaffAccounts(excludeUserId?: string) {
    return this.usersRepository.listStaffAccounts(excludeUserId);
  }

  async countActiveUsersByRole(role: 'technician' | 'head_technician' | 'service_adviser' | 'super_admin') {
    return this.usersRepository.countActiveByRole(role);
  }

  async listCustomersWithVehicles(query: import('../users.types').ListCustomersWithVehiclesQuery = {}) {
    return this.usersRepository.listCustomersWithVehicles(query);
  }

  async update(id: string, updateUserDto: UpdateUserDto, actor?: { userId: string; role: string }) {
    if (actor) {
      this.assertUserActorCanAccessUser(id, actor);
    }

    const normalizedPhone =
      updateUserDto.phone === undefined
        ? undefined
        : this.normalizeOptionalPhilippineMobile(updateUserDto.phone);

    if (normalizedPhone) {
      const existingPhoneUser = await this.usersRepository.findActiveByPhone(normalizedPhone, id);
      if (existingPhoneUser) {
        throw new ConflictException('Phone number already exists');
      }
    }

    return this.usersRepository.update(id, {
      ...updateUserDto,
      phone: normalizedPhone,
    });
  }

  async setActivationStatus(id: string, isActive: boolean) {
    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    return this.usersRepository.updateActivationStatus(id, isActive);
  }

  async addAddress(userId: string, payload: UpsertAddressDto, actor?: { userId: string; role: string }) {
    if (actor) {
      this.assertUserActorCanAccessUser(userId, actor);
    }
    return this.usersRepository.addAddress(userId, payload);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    payload: UpdateAddressDto,
    actor?: { userId: string; role: string },
  ) {
    if (actor) {
      this.assertUserActorCanAccessUser(userId, actor);
    }
    return this.usersRepository.updateAddress(userId, addressId, payload);
  }

  private assertUserActorCanAccessUser(userId: string, actor: { userId: string; role: string }) {
    if (!['customer', 'service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only authenticated customer, service adviser, or super admin accounts can access user profile records');
    }

    if (actor.role === 'customer' && actor.userId !== userId) {
      throw new ForbiddenException('Customers can only access their own user profile records');
    }
  }

  private normalizeOptionalPhilippineMobile(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    const normalized = String(value ?? '').replace(/\D/g, '').slice(0, 11);
    if (!normalized) {
      return undefined;
    }

    if (!/^09\d{9}$/.test(normalized)) {
      throw new BadRequestException('Phone number must be an 11-digit PH mobile number starting with 09');
    }

    return normalized;
  }

  private normalizeWalkInPlateNumber(value: string) {
    const normalized = String(value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9 -]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const signature = normalized.replace(/[^A-Z0-9]/g, '');
    if (!normalized || signature.length < 4 || signature.length > 10) {
      throw new BadRequestException('Vehicle plate number must use 4-10 letters or numbers');
    }
    return normalized;
  }
}
