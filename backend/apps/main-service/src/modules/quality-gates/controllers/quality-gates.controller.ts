import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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

import { JobOrderQualityGateResponseDto } from '../dto/job-order-quality-gate-response.dto';
import { OverrideQualityGateDto } from '../dto/override-quality-gate.dto';
import { RecordQualityGateVerdictDto } from '../dto/record-quality-gate-verdict.dto';
import { QualityGatesService } from '../services/quality-gates.service';

@ApiTags('quality-gates')
@Controller('job-orders/:jobOrderId/qa')
export class QualityGatesController {
  constructor(private readonly qualityGatesService: QualityGatesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'head_technician', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Get the current QA gate state for a job order.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'jobOrderId',
    description: 'Job-order identifier.',
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  @ApiOkResponse({
    description: 'The current QA gate record for the target job order.',
    type: JobOrderQualityGateResponseDto,
  })
  @ApiConflictResponse({ description: 'The job order has not entered QA yet.' })
  @ApiForbiddenResponse({ description: 'Only assigned technicians or staff reviewers can access this quality gate.' })
  @ApiNotFoundResponse({ description: 'Job order or quality-gate actor not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findByJobOrderId(@Param('jobOrderId') jobOrderId: string, @Req() request: Request) {
    return this.qualityGatesService.getByJobOrderId(
      jobOrderId,
      request.user as { userId: string; role: string },
    );
  }

  @Patch('verdict')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('head_technician')
  @ApiOperation({ summary: 'Record the head-technician QA verdict after reviewing the pre-check summary.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'jobOrderId',
    description: 'Job-order identifier.',
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  @ApiBody({
    type: RecordQualityGateVerdictDto,
  })
  @ApiOkResponse({
    description: 'The quality gate was updated with the head-technician verdict.',
    type: JobOrderQualityGateResponseDto,
  })
  @ApiConflictResponse({
    description: 'The job order is not currently available for QA review.',
  })
  @ApiForbiddenResponse({
    description: 'Only head technicians can record the final QA verdict.',
  })
  @ApiNotFoundResponse({ description: 'Job order or quality-gate actor not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  recordVerdict(
    @Param('jobOrderId') jobOrderId: string,
    @Body() payload: RecordQualityGateVerdictDto,
    @Req() request: Request,
  ) {
    return this.qualityGatesService.recordReviewerVerdict(
      jobOrderId,
      payload,
      request.user as { userId: string; role: string },
    );
  }

  @Patch('override')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Approve a manual override for a blocked quality gate.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'jobOrderId',
    description: 'Job-order identifier.',
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  @ApiBody({
    type: OverrideQualityGateDto,
  })
  @ApiOkResponse({
    description: 'The quality gate was manually overridden and remains fully auditable.',
    type: JobOrderQualityGateResponseDto,
  })
  @ApiConflictResponse({
    description: 'The quality gate is unavailable or is not currently blocked.',
  })
  @ApiForbiddenResponse({
    description: 'Only super admins can approve manual quality-gate overrides.',
  })
  @ApiNotFoundResponse({ description: 'Job order or quality-gate actor not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  overrideBlockedGate(
    @Param('jobOrderId') jobOrderId: string,
    @Body() payload: OverrideQualityGateDto,
    @Req() request: Request,
  ) {
    return this.qualityGatesService.overrideBlockedGate(
      jobOrderId,
      payload,
      request.user as { userId: string; role: string },
    );
  }
}
