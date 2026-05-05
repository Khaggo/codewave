import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';

import { BackJobsAnalyticsResponseDto } from '../dto/back-jobs-analytics-response.dto';
import { AuditTrailAnalyticsResponseDto } from '../dto/audit-trail-analytics-response.dto';
import { DashboardAnalyticsResponseDto } from '../dto/dashboard-analytics-response.dto';
import { InvoiceAgingAnalyticsResponseDto } from '../dto/invoice-aging-analytics-response.dto';
import { LoyaltyAnalyticsResponseDto } from '../dto/loyalty-analytics-response.dto';
import { OperationsAnalyticsResponseDto } from '../dto/operations-analytics-response.dto';
import { AnalyticsService } from '../services/analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('service_adviser', 'super_admin')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@ApiForbiddenResponse({
  description: 'Only service advisers or super admins can access admin analytics dashboards.',
})
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('refresh')
  @ApiOperation({ summary: 'Rebuild the analytics snapshots from live source records.' })
  @ApiOkResponse({
    description: 'Refresh job metadata and the latest section timestamps after the rebuild completes.',
    schema: {
      type: 'object',
      properties: {
        refreshJob: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', example: 'completed' },
            triggerSource: { type: 'string', example: 'manual_refresh' },
            snapshotTypes: {
              type: 'array',
              items: { type: 'string', example: 'dashboard' },
            },
            sourceCounts: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        sectionTimestamps: {
          type: 'object',
          additionalProperties: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
        },
      },
    },
  })
  refresh(@Req() request: Request) {
    return this.analyticsService.triggerManualRefresh(request.user as { userId: string; role: string });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Read the admin dashboard overview from the rebuildable analytics snapshot.' })
  @ApiOkResponse({
    description: 'Dashboard overview metrics derived from operational source records.',
    type: DashboardAnalyticsResponseDto,
  })
  getDashboard(@Req() request: Request) {
    return this.analyticsService.getDashboard(request.user as { userId: string; role: string });
  }

  @Get('operations')
  @ApiOperation({ summary: 'Read operational demand, peak-hour, and service-adviser workload analytics.' })
  @ApiOkResponse({
    description: 'Operational analytics derived from booking and job-order activity.',
    type: OperationsAnalyticsResponseDto,
  })
  getOperations(@Req() request: Request) {
    return this.analyticsService.getOperations(request.user as { userId: string; role: string });
  }

  @Get('back-jobs')
  @ApiOperation({ summary: 'Read back-job trend analytics from the derived analytics snapshot.' })
  @ApiOkResponse({
    description: 'Back-job trend and repeat-source summaries.',
    type: BackJobsAnalyticsResponseDto,
  })
  getBackJobs(@Req() request: Request) {
    return this.analyticsService.getBackJobs(request.user as { userId: string; role: string });
  }

  @Get('loyalty')
  @ApiOperation({ summary: 'Read loyalty usage analytics from the derived analytics snapshot.' })
  @ApiOkResponse({
    description: 'Derived loyalty balance, transaction, and reward-usage summaries.',
    type: LoyaltyAnalyticsResponseDto,
  })
  getLoyalty(@Req() request: Request) {
    return this.analyticsService.getLoyalty(request.user as { userId: string; role: string });
  }

  @Get('invoice-aging')
  @ApiOperation({ summary: 'Read invoice-aging reminder analytics from the derived analytics snapshot.' })
  @ApiOkResponse({
    description: 'Invoice-aging reminder policy summaries derived from notification reminder rules.',
    type: InvoiceAgingAnalyticsResponseDto,
  })
  getInvoiceAging(@Req() request: Request) {
    return this.analyticsService.getInvoiceAging(request.user as { userId: string; role: string });
  }

  @Get('audit-trail')
  @ApiOperation({ summary: 'Read the audit-trail snapshot for sensitive staff actions and release decisions.' })
  @ApiOkResponse({
    description: 'Derived audit trail for staff-admin actions, QA overrides, and release decisions.',
    type: AuditTrailAnalyticsResponseDto,
  })
  getAuditTrail(@Req() request: Request) {
    return this.analyticsService.getAuditTrail(request.user as { userId: string; role: string });
  }
}
