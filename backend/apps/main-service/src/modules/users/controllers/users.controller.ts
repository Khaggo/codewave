import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
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

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'technician', 'head_technician', 'service_adviser', 'super_admin')
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
  async findById(@Param('id') id: string, @Req() request: Request) {
    const user = await this.usersService.findById(
      id,
      request.user as { userId: string; role: string },
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'technician', 'head_technician', 'service_adviser', 'super_admin')
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
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() request: Request) {
    return this.usersService.update(
      id,
      updateUserDto,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'technician', 'head_technician', 'service_adviser', 'super_admin')
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
  async listAddresses(@Param('id') id: string, @Req() request: Request) {
    const user = await this.usersService.findById(
      id,
      request.user as { userId: string; role: string },
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.addresses ?? [];
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'technician', 'head_technician', 'service_adviser', 'super_admin')
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
  addAddress(@Param('id') id: string, @Body() payload: UpsertAddressDto, @Req() request: Request) {
    return this.usersService.addAddress(
      id,
      payload,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'technician', 'head_technician', 'service_adviser', 'super_admin')
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
    @Req() request: Request,
  ) {
    return this.usersService.updateAddress(
      id,
      addressId,
      payload,
      request.user as { userId: string; role: string },
    );
  }
}
