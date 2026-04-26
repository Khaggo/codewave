import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateUserDto } from '../dto/create-user.dto';
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
    const existingUser = await this.usersRepository.findByEmail(payload.email);

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

    return this.usersRepository.create(payload);
  }

  async findById(id: string) {
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

  async listCustomersWithVehicles() {
    return this.usersRepository.listCustomersWithVehicles();
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.usersRepository.update(id, updateUserDto);
  }

  async setActivationStatus(id: string, isActive: boolean) {
    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    return this.usersRepository.updateActivationStatus(id, isActive);
  }

  async addAddress(userId: string, payload: UpsertAddressDto) {
    return this.usersRepository.addAddress(userId, payload);
  }

  async updateAddress(userId: string, addressId: string, payload: UpdateAddressDto) {
    return this.usersRepository.updateAddress(userId, addressId, payload);
  }
}
