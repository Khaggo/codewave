import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';

import { ClaimStaffWorkDto } from '../dto/claim-staff-work.dto';
import { ListStaffWorkQueueQueryDto } from '../dto/list-staff-work-queue-query.dto';
import { ReassignStaffWorkClaimDto } from '../dto/reassign-staff-work-claim.dto';
import { ReleaseStaffWorkClaimDto } from '../dto/release-staff-work-claim.dto';
import { UpdateStaffQueueSessionDto } from '../dto/update-staff-queue-session.dto';
import { StaffWorkQueuesService } from '../services/staff-work-queues.service';

type StaffRequest = Request & {
  user: {
    userId: string;
    role: string;
  };
};

@ApiTags('staff-work-queues')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('service_adviser', 'super_admin')
@Controller('staff-work-queues')
export class StaffWorkQueuesController {
  constructor(private readonly service: StaffWorkQueuesService) {}

  @Get(':queueType')
  @ApiOperation({ summary: 'List one bounded staff work queue page and its aggregate state.' })
  @ApiForbiddenResponse({ description: 'The current staff account cannot use operational queues.' })
  list(
    @Param('queueType') queueType: string,
    @Query() query: ListStaffWorkQueueQueryDto,
    @Req() request: StaffRequest,
  ) {
    return this.service.list(queueType, query, request.user);
  }

  @Put(':queueType/session')
  @ApiOperation({ summary: 'Start or pause automatic assignment for one staff queue.' })
  updateSession(
    @Param('queueType') queueType: string,
    @Body() payload: UpdateStaffQueueSessionDto,
    @Req() request: StaffRequest,
  ) {
    return this.service.updateSession(queueType, payload.available, request.user);
  }

  @Post(':queueType/dispatch')
  @ApiOperation({ summary: 'Refresh presence and atomically dispatch the next eligible work item.' })
  dispatch(
    @Param('queueType') queueType: string,
    @Req() request: StaffRequest,
  ) {
    return this.service.dispatch(queueType, request.user);
  }

  @Post(':queueType/claims')
  @ApiOperation({ summary: 'Atomically claim one selected unowned queue item.' })
  @ApiConflictResponse({ description: 'The work is owned by another staff member or the actor already has active work.' })
  claimSelected(
    @Param('queueType') queueType: string,
    @Body() payload: ClaimStaffWorkDto,
    @Req() request: StaffRequest,
  ) {
    return this.service.claimSelected(queueType, payload, request.user);
  }

  @Get(':queueType/presence')
  @ApiOperation({ summary: 'List staff availability and active workload for one queue.' })
  listPresence(
    @Param('queueType') queueType: string,
    @Req() request: StaffRequest,
  ) {
    return this.service.listPresence(queueType, request.user);
  }

  @Post('claims/:claimId/heartbeat')
  @ApiOperation({ summary: 'Renew an owned work claim lease.' })
  @ApiConflictResponse({ description: 'The claim expired or belongs to another staff member.' })
  heartbeat(
    @Param('claimId') claimId: string,
    @Req() request: StaffRequest,
  ) {
    return this.service.heartbeat(claimId, request.user);
  }

  @Post('claims/:claimId/release')
  @ApiOperation({ summary: 'Release owned queue work without completing its lifecycle stage.' })
  release(
    @Param('claimId') claimId: string,
    @Body() payload: ReleaseStaffWorkClaimDto,
    @Req() request: StaffRequest,
  ) {
    return this.service.release(claimId, payload.reason, request.user);
  }

  @Post('claims/:claimId/reassign')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Force-reassign active queue work with an auditable reason.' })
  reassign(
    @Param('claimId') claimId: string,
    @Body() payload: ReassignStaffWorkClaimDto,
    @Req() request: StaffRequest,
  ) {
    return this.service.reassign(
      claimId,
      payload.targetUserId,
      payload.reason,
      request.user,
    );
  }
}
