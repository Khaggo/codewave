import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { VehiclesService } from '../services/vehicles.service';

@Controller()
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post('vehicles')
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get('vehicles/:id')
  findById(@Param('id') id: string) {
    return this.vehiclesService.findById(id);
  }

  @Patch('vehicles/:id')
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Get('users/:userId/vehicles')
  findByUserId(@Param('userId') userId: string) {
    return this.vehiclesService.findByUserId(userId);
  }
}
