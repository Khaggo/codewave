import { randomUUID } from 'crypto';
import { ConflictException } from '@nestjs/common';

export type SeededWorkClaim = {
  id: string;
  queueType: 'job_order' | 'qa';
  entityType: 'booking_handoff' | 'job_order';
  entityId: string;
  ownerUserId: string;
};

export class InMemoryStaffWorkQueuesService {
  private readonly claims = new Map<string, SeededWorkClaim>();

  seedClaim(payload: Omit<SeededWorkClaim, 'id'>): SeededWorkClaim {
    const claim = { id: randomUUID(), ...payload };
    this.claims.set(claim.id, claim);
    return claim;
  }

  assertClaimAccess(
    claimId: string | undefined,
    queueType: SeededWorkClaim['queueType'],
    entityType: SeededWorkClaim['entityType'],
    entityId: string,
    ownerUserId: string,
    options: { allowUnclaimedWithoutHeader?: boolean } = {},
  ) {
    const activeClaim = [...this.claims.values()].find(
      (claim) =>
        claim.queueType === queueType &&
        claim.entityType === entityType &&
        claim.entityId === entityId,
    );
    if (!claimId) {
      if (!activeClaim && options.allowUnclaimedWithoutHeader) {
        return null;
      }
      throw new ConflictException({
        code: 'WORK_CLAIM_REQUIRED',
        message: 'Claim this work before editing it.',
      });
    }

    const claim = this.claims.get(claimId);
    if (
      !claim ||
      claim.queueType !== queueType ||
      claim.entityType !== entityType ||
      claim.entityId !== entityId ||
      claim.ownerUserId !== ownerUserId
    ) {
      throw new ConflictException({
        code: 'WORK_CLAIM_CONFLICT',
        message: 'This work claim is not valid for the requested record.',
      });
    }

    return claim;
  }

  completeClaim(
    queueType: SeededWorkClaim['queueType'],
    entityType: SeededWorkClaim['entityType'],
    entityId: string,
    ownerUserId?: string,
  ) {
    const claim = [...this.claims.values()].find(
      (entry) =>
        entry.queueType === queueType &&
        entry.entityType === entityType &&
        entry.entityId === entityId &&
        (!ownerUserId || entry.ownerUserId === ownerUserId),
    );
    if (claim) {
      this.claims.delete(claim.id);
    }
    return Promise.resolve(claim ?? null);
  }
}
