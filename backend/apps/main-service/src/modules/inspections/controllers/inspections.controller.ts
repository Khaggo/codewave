import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

import { CreateInspectionDto } from '../dto/create-inspection.dto';
import { InspectionResponseDto } from '../dto/inspection-response.dto';
import { InspectionsService } from '../services/inspections.service';

@ApiTags('inspections')
@Controller()
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post('vehicles/:id/inspections')
  @ApiOperation({ summary: 'Create an inspection record for a vehicle.' })
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiCreatedResponse({
    description: 'The inspection was recorded successfully.',
    type: InspectionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The inspection payload is invalid.' })
  @ApiNotFoundResponse({ description: 'Vehicle or booking not found.' })
  @ApiConflictResponse({ description: 'The submitted booking reference is not valid for the vehicle.' })
  create(@Param('id') id: string, @Body() payload: CreateInspectionDto) {
    return this.inspectionsService.create(id, payload);
  }

  @Get('vehicles/:id/inspections')
  @ApiOperation({ summary: 'List inspections recorded for a vehicle.' })
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiOkResponse({
    description: 'Inspections attached to the vehicle.',
    type: InspectionResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found.' })
  findByVehicleId(@Param('id') id: string) {
    return this.inspectionsService.findByVehicleId(id);
  }
}
