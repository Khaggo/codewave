import { Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { AddressResponseDto } from '../dto/address-response.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpsertAddressDto } from '../dto/upsert-address.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UsersService } from '../services/users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer identity record.' })
  @ApiCreatedResponse({
    description: 'The user was created successfully.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted user payload is invalid.' })
  @ApiConflictResponse({ description: 'A user with the same email already exists.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id.' })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiOkResponse({
    description: 'The matching user record.',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile fields.' })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiOkResponse({
    description: 'The updated user record.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted update payload is invalid.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Get(':id/addresses')
  @ApiOperation({ summary: 'List addresses attached to a user.' })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiOkResponse({
    description: 'The addresses currently attached to the user.',
    type: AddressResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async listAddresses(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.addresses ?? [];
  }

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Add an address to a user.' })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiCreatedResponse({
    description: 'The address was added successfully.',
    type: AddressResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted address payload is invalid.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  addAddress(@Param('id') id: string, @Body() payload: UpsertAddressDto) {
    return this.usersService.addAddress(id, payload);
  }

  @Patch(':id/addresses/:addressId')
  @ApiOperation({ summary: 'Update a user address.' })
  @ApiParam({
    name: 'id',
    description: 'User identifier.',
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @ApiParam({
    name: 'addressId',
    description: 'Address identifier.',
    example: '71b4200e-7747-4b0d-bd5d-c2c3ecdc0669',
  })
  @ApiOkResponse({
    description: 'The updated address record.',
    type: AddressResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The submitted address update payload is invalid.' })
  @ApiNotFoundResponse({ description: 'Address not found.' })
  updateAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() payload: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(id, addressId, payload);
  }
}
