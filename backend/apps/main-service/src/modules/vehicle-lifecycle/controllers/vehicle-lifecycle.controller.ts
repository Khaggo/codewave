import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { VehicleTimelineEventResponseDto } from '../dto/vehicle-timeline-event-response.dto';
import { VehicleLifecycleService } from '../services/vehicle-lifecycle.service';

@ApiTags('vehicle-lifecycle')
@Controller()
export class VehicleLifecycleController {
  constructor(private readonly vehicleLifecycleService: VehicleLifecycleService) {}

  @Get('vehicles/:id/timeline')
  @ApiOperation({ summary: 'Get the normalized lifecycle timeline for a vehicle.' })
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiOkResponse({
    description: 'Ordered lifecycle events for the target vehicle.',
    type: VehicleTimelineEventResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found.' })
  findByVehicleId(@Param('id') id: string) {
    return this.vehicleLifecycleService.findByVehicleId(id);
  }
}
