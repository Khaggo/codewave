import { ConflictException, Injectable } from '@nestjs/common';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpsertAddressDto } from '../dto/upsert-address.dto';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.usersRepository.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictException('User email already exists');
    }

    return this.usersRepository.create(createUserDto);
  }

  async findById(id: string) {
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.usersRepository.update(id, updateUserDto);
  }

  async addAddress(userId: string, payload: UpsertAddressDto) {
    return this.usersRepository.addAddress(userId, payload);
  }

  async updateAddress(userId: string, addressId: string, payload: UpdateAddressDto) {
    return this.usersRepository.updateAddress(userId, addressId, payload);
  }
}
