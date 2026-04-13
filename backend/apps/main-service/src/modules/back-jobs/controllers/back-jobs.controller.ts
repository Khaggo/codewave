import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
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

import { BackJobResponseDto } from '../dto/back-job-response.dto';
import { CreateBackJobDto } from '../dto/create-back-job.dto';
import { UpdateBackJobStatusDto } from '../dto/update-back-job-status.dto';
import { BackJobsService } from '../services/back-jobs.service';

@ApiTags('back-jobs')
@Controller()
export class BackJobsController {
  constructor(private readonly backJobsService: BackJobsService) {}

  @Post('back-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Create a reviewed back-job case tied to previous service history.' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'The back-job case was created successfully.',
    type: BackJobResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The back-job payload is invalid.' })
  @ApiConflictResponse({ description: 'The submitted lineage, vehicle ownership, or review evidence is invalid.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can open back-job cases.' })
  @ApiNotFoundResponse({ description: 'Customer, vehicle, original job order, or inspection not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  create(@Body() payload: CreateBackJobDto, @Req() request: Request) {
    return this.backJobsService.create(payload, request.user as { userId: string; role: string });
  }

  @Get('back-jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Get a back-job case by id.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Back-job identifier.',
    example: 'd6eaf1eb-6502-44fd-b1db-2e49f37ad6c6',
  })
  @ApiOkResponse({
    description: 'The matching back-job case.',
    type: BackJobResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Only the owning customer or staff reviewers can access this case.' })
  @ApiNotFoundResponse({ description: 'Back job not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findById(@Param('id') id: string, @Req() request: Request) {
    return this.backJobsService.findById(id, request.user as { userId: string; role: string });
  }

  @Patch('back-jobs/:id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Advance back-job review and rework statuses with explicit evidence checks.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Back-job identifier.',
    example: 'd6eaf1eb-6502-44fd-b1db-2e49f37ad6c6',
  })
  @ApiOkResponse({
    description: 'The updated back-job case.',
    type: BackJobResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The back-job status payload is invalid.' })
  @ApiConflictResponse({ description: 'The requested back-job transition or evidence linkage is not allowed.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can review back-job status.' })
  @ApiNotFoundResponse({ description: 'Back job or related inspection not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateStatus(@Param('id') id: string, @Body() payload: UpdateBackJobStatusDto, @Req() request: Request) {
    return this.backJobsService.updateStatus(id, payload, request.user as { userId: string; role: string });
  }

  @Get('vehicles/:id/back-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List back-job cases for a vehicle.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Vehicle identifier.',
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @ApiOkResponse({
    description: 'Back-job cases attached to the vehicle.',
    type: BackJobResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Only the owning customer or staff reviewers can access this history.' })
  @ApiNotFoundResponse({ description: 'Vehicle not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findByVehicleId(@Param('id') id: string, @Req() request: Request) {
    return this.backJobsService.findByVehicleId(id, request.user as { userId: string; role: string });
  }
}
