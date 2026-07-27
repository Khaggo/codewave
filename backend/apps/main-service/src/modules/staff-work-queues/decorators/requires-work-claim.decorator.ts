import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

import {
  StaffWorkEntityType,
  StaffWorkQueueType,
} from '../repositories/staff-work-queues.repository';

export const WORK_CLAIM_REQUIREMENT = 'staff-work-claim-requirement';

export type WorkClaimRequirement = {
  queueType: StaffWorkQueueType;
  entityType: StaffWorkEntityType;
  entityIdKey: string;
  entityIdSource?: 'params' | 'body';
};

export const RequiresWorkClaim = (requirement: WorkClaimRequirement) =>
  applyDecorators(
    SetMetadata(WORK_CLAIM_REQUIREMENT, requirement),
    ApiHeader({
      name: 'X-Work-Claim-Id',
      required: true,
      description: 'Active staff-work claim for this queue record.',
    }),
  );
