import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import {
  WORK_CLAIM_REQUIREMENT,
  WorkClaimRequirement,
} from '../decorators/requires-work-claim.decorator';
import { StaffWorkQueuesService } from '../services/staff-work-queues.service';

type StaffRequest = Request & {
  user?: {
    userId?: string;
  };
};

@Injectable()
export class StaffWorkClaimGuard implements CanActivate {
  private readonly logger = new Logger(StaffWorkClaimGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly staffWorkQueuesService: StaffWorkQueuesService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requirement = this.reflector.getAllAndOverride<WorkClaimRequirement>(
      WORK_CLAIM_REQUIREMENT,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement) {
      return true;
    }
    const request = context.switchToHttp().getRequest<StaffRequest>();
    const ownerUserId = request.user?.userId;
    const source = requirement.entityIdSource === 'body' ? request.body : request.params;
    const entityId = String(source?.[requirement.entityIdKey] ?? '').trim();
    const rawClaimId = request.headers['x-work-claim-id'];
    const claimId = Array.isArray(rawClaimId) ? rawClaimId[0] : rawClaimId;

    if (!ownerUserId || !entityId) {
      throw new ConflictException({
        code: 'WORK_CLAIM_CONTEXT_MISSING',
        message: 'The active work assignment could not be verified.',
      });
    }

    const enforcementMode = this.configService.get<'observe' | 'strict'>(
      'staffWorkClaims.enforcementMode',
      'strict',
    );
    const verifiedClaim = await this.staffWorkQueuesService.assertClaimAccess(
      claimId,
      requirement.queueType,
      requirement.entityType,
      entityId,
      ownerUserId,
      { allowUnclaimedWithoutHeader: enforcementMode === 'observe' },
    );
    if (!verifiedClaim) {
      this.logger.warn({
        event: 'staff_work_claim_observed_missing',
        method: request.method,
        route: String(request.route?.path ?? request.path ?? '').replace(
          /\/[0-9a-f-]{16,}/gi,
          '/:id',
        ),
        queueType: requirement.queueType,
        entityType: requirement.entityType,
      });
    }

    return true;
  }
}
