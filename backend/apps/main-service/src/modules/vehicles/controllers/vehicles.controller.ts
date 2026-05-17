import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { VehiclesService } from '../services/vehicles.service';

@Controller()
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @Post('vehicles')
  create(@Body() createVehicleDto: CreateVehicleDto, @Req() request: Request) {
    return this.vehiclesService.create(
      createVehicleDto,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @Get('vehicles/:id')
  findById(@Param('id') id: string, @Req() request: Request) {
    return this.vehiclesService.findById(
      id,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @Patch('vehicles/:id')
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto, @Req() request: Request) {
    return this.vehiclesService.update(
      id,
      updateVehicleDto,
      request.user as { userId: string; role: string },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @Get('users/:userId/vehicles')
  findByUserId(@Param('userId') userId: string, @Req() request: Request) {
    return this.vehiclesService.findByUserId(
      userId,
      request.user as { userId: string; role: string },
    );
  }
}
