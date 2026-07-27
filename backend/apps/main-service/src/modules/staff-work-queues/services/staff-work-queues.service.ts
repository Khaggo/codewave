import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UsersService } from '@main-modules/users/services/users.service';

import { ClaimStaffWorkDto } from '../dto/claim-staff-work.dto';
import { ListStaffWorkQueueQueryDto } from '../dto/list-staff-work-queue-query.dto';
import {
  StaffWorkEntityType,
  StaffWorkQueuesRepository,
  StaffWorkQueueType,
} from '../repositories/staff-work-queues.repository';

type StaffActor = {
  userId: string;
  role: string;
};

@Injectable()
export class StaffWorkQueuesService {
  constructor(
    private readonly repository: StaffWorkQueuesRepository,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async list(queueTypeValue: string, query: ListStaffWorkQueueQueryDto, actor: StaffActor) {
    const queueType = this.parseQueueType(queueTypeValue);
    await this.assertStaffActor(actor);

    const limit = query.limit ?? 25;
    const offset = this.decodeCursor(query.cursor);
    const view = query.view ?? 'team';
    const search = String(query.search ?? '').trim().toLowerCase();
    const capacity = this.getCapacity(queueType);
    const [page, summary, session, activeClaims] = await Promise.all([
      this.repository.listQueue(queueType, actor.userId, {
        view,
        search,
        offset,
        limit,
      }),
      this.repository.getQueueSummary(queueType, actor.userId),
      this.repository.getSession(actor.userId, queueType),
      this.repository.getActiveClaimsForOwner(actor.userId, queueType),
    ]);
    const currentClaim = activeClaims[0] ?? null;

    return {
      items: page.items,
      page: {
        limit,
        hasNext: page.hasNext,
        nextCursor: page.hasNext ? this.encodeCursor(offset + limit) : null,
      },
      summary,
      session: {
        available: session?.status === 'available',
        lastSeenAt: session?.lastSeenAt?.toISOString() ?? null,
        capacity,
        activeClaimCount: activeClaims.length,
        remainingCapacity: Math.max(0, capacity - activeClaims.length),
        activeClaims: activeClaims.map((claim) => ({
          id: claim.id,
          entityId: claim.entityId,
          entityType: claim.entityType,
          claimedAt: claim.claimedAt.toISOString(),
          leaseExpiresAt: claim.leaseExpiresAt.toISOString(),
        })),
        currentClaimId: currentClaim?.id ?? null,
        currentClaim: currentClaim
          ? {
              id: currentClaim.id,
              entityId: currentClaim.entityId,
              entityType: currentClaim.entityType,
              claimedAt: currentClaim.claimedAt.toISOString(),
              leaseExpiresAt: currentClaim.leaseExpiresAt.toISOString(),
            }
          : null,
      },
    };
  }

  async claimSelected(
    queueTypeValue: string,
    payload: ClaimStaffWorkDto,
    actor: StaffActor,
  ) {
    const queueType = this.parseQueueType(queueTypeValue);
    await this.assertStaffActor(actor);
    await this.repository.setSessionAvailability(actor.userId, queueType, true);
    const claim = await this.repository.claimSelected(
      actor.userId,
      queueType,
      payload.entityType,
      payload.entityId,
      this.getCapacity(queueType),
    );

    return {
      assigned: true,
      reason: null,
      claim,
    };
  }

  async listPresence(queueTypeValue: string, actor: StaffActor) {
    const queueType = this.parseQueueType(queueTypeValue);
    await this.assertStaffActor(actor);
    return this.repository.listPresence(queueType, actor.userId);
  }

  async updateSession(queueTypeValue: string, available: boolean, actor: StaffActor) {
    const queueType = this.parseQueueType(queueTypeValue);
    await this.assertStaffActor(actor);
    const session = await this.repository.setSessionAvailability(
      actor.userId,
      queueType,
      available,
    );
    const activeClaims = await this.repository.getActiveClaimsForOwner(actor.userId, queueType);
    const capacity = this.getCapacity(queueType);

    return {
      available: session.status === 'available',
      lastSeenAt: session.lastSeenAt.toISOString(),
      capacity,
      activeClaimCount: activeClaims.length,
      remainingCapacity: Math.max(0, capacity - activeClaims.length),
      currentClaimId: activeClaims[0]?.id ?? null,
    };
  }

  async dispatch(queueTypeValue: string, actor: StaffActor) {
    const queueType = this.parseQueueType(queueTypeValue);
    await this.assertStaffActor(actor);
    const session = await this.repository.touchAvailableSession(actor.userId, queueType);
    if (!session) {
      return {
        assigned: false,
        reason: 'QUEUE_PAUSED',
        claim: null,
      };
    }

    const capacity = this.getCapacity(queueType);
    const activeClaims = await this.repository.getActiveClaimsForOwner(actor.userId, queueType);
    if (activeClaims.length >= capacity) {
      return {
        assigned: false,
        reason: 'CAPACITY_REACHED',
        claim: null,
        capacity,
      };
    }

    const claim = await this.repository.dispatchNext(actor.userId, queueType, capacity);
    return {
      assigned: Boolean(claim),
      reason: claim ? null : 'NO_ELIGIBLE_WORK',
      claim,
    };
  }

  async heartbeat(claimId: string, actor: StaffActor) {
    await this.assertStaffActor(actor);
    return this.repository.heartbeatClaim(claimId, actor.userId);
  }

  async release(claimId: string, reason: string | undefined, actor: StaffActor) {
    await this.assertStaffActor(actor);
    return this.repository.releaseClaim(
      claimId,
      actor.userId,
      actor.role === 'super_admin',
      reason,
    );
  }

  async reassign(
    claimId: string,
    targetUserId: string,
    reason: string,
    actor: StaffActor,
  ) {
    await this.assertStaffActor(actor);
    if (actor.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can reassign active queue work');
    }

    const target = await this.usersService.findById(targetUserId);
    if (!target || !target.isActive || !['service_adviser', 'super_admin'].includes(target.role)) {
      throw new BadRequestException('Target staff member is not active or cannot work this queue');
    }

    return this.repository.reassignClaim(
      claimId,
      targetUserId,
      reason.trim(),
      {
        job_order: this.getCapacity('job_order'),
        qa: this.getCapacity('qa'),
      },
    );
  }

  assertActiveClaim(
    claimId: string,
    queueType: StaffWorkQueueType,
    entityType: StaffWorkEntityType,
    entityId: string,
    ownerUserId: string,
  ) {
    return this.repository.assertActiveClaim(
      claimId,
      queueType,
      entityType,
      entityId,
      ownerUserId,
    );
  }

  assertClaimAccess(
    claimId: string | undefined,
    queueType: StaffWorkQueueType,
    entityType: StaffWorkEntityType,
    entityId: string,
    ownerUserId: string,
    options?: { allowUnclaimedWithoutHeader?: boolean },
  ) {
    return this.repository.assertClaimAccess(
      claimId,
      queueType,
      entityType,
      entityId,
      ownerUserId,
      options,
    );
  }

  async completeClaim(
    queueType: StaffWorkQueueType,
    entityType: StaffWorkEntityType,
    entityId: string,
    ownerUserId?: string,
  ) {
    const completedClaim = await this.repository.completeActiveClaim(
      queueType,
      entityType,
      entityId,
      ownerUserId,
    );
    if (completedClaim && ownerUserId) {
      await this.repository.dispatchNext(
        ownerUserId,
        queueType,
        this.getCapacity(queueType),
      );
    }
    return completedClaim;
  }

  private parseQueueType(value: string): StaffWorkQueueType {
    if (value !== 'job_order' && value !== 'qa') {
      throw new BadRequestException('queueType must be job_order or qa');
    }
    return value;
  }

  private getCapacity(queueType: StaffWorkQueueType) {
    const configKey = queueType === 'qa'
      ? 'staffWorkClaims.capacities.qa'
      : 'staffWorkClaims.capacities.jobOrder';
    return this.configService.get<number>(configKey) ?? (queueType === 'qa' ? 6 : 12);
  }

  private async assertStaffActor(actor: StaffActor) {
    if (!actor?.userId || !['service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can use staff work queues');
    }

    const user = await this.usersService.findById(actor.userId);
    if (!user || !user.isActive || !['service_adviser', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('The staff account is not active or cannot use work queues');
    }

    return user;
  }

  private encodeCursor(offset: number) {
    return Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor?: string) {
    if (!cursor) {
      return 0;
    }

    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        offset?: unknown;
      };
      const offset = Number(parsed.offset);
      if (!Number.isInteger(offset) || offset < 0) {
        throw new Error('Invalid offset');
      }
      return offset;
    } catch {
      throw new BadRequestException('cursor is invalid');
    }
  }
}
