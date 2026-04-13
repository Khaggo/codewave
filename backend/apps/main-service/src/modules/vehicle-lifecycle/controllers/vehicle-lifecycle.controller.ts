import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';

import { ReviewVehicleLifecycleSummaryDto } from '../dto/review-vehicle-lifecycle-summary.dto';
import { VehicleLifecycleSummaryResponseDto } from '../dto/vehicle-lifecycle-summary-response.dto';
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

  @Post('vehicles/:id/lifecycle-summary/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Generate a review-gated AI lifecycle summary for a vehicle.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiCreatedResponse({
    description: 'A new lifecycle summary draft was generated and stored in pending review state.',
    type: VehicleLifecycleSummaryResponseDto,
  })
  @ApiConflictResponse({ description: 'No lifecycle evidence is available to generate a summary yet.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can generate lifecycle summaries.' })
  @ApiNotFoundResponse({ description: 'Vehicle or reviewer not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  generateLifecycleSummary(@Param('id') id: string, @Req() request: Request) {
    return this.vehicleLifecycleService.generateLifecycleSummary(
      id,
      request.user as { userId: string; role: string },
    );
  }

  @Patch('vehicles/:id/lifecycle-summary/:summaryId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Approve or reject a generated lifecycle summary for customer visibility.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiParam({
    name: 'summaryId',
    description: 'Lifecycle summary identifier.',
    example: '3f50eb2d-b8d8-476a-a0ea-6dcbc09087ee',
  })
  @ApiOkResponse({
    description: 'The lifecycle summary review state after approval or rejection.',
    type: VehicleLifecycleSummaryResponseDto,
  })
  @ApiConflictResponse({ description: 'The lifecycle summary has already been reviewed.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can review lifecycle summaries.' })
  @ApiNotFoundResponse({ description: 'Vehicle, summary, or reviewer not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  reviewLifecycleSummary(
    @Param('id') id: string,
    @Param('summaryId') summaryId: string,
    @Body() payload: ReviewVehicleLifecycleSummaryDto,
    @Req() request: Request,
  ) {
    return this.vehicleLifecycleService.reviewLifecycleSummary(
      id,
      summaryId,
      payload,
      request.user as { userId: string; role: string },
    );
  }
}
