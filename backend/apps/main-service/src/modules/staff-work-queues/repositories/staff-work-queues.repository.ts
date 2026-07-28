import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gt, lt, sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import {
  staffQueueSessions,
  staffWorkClaims,
} from '../schemas/staff-work-queues.schema';
import {
  getStaffWorkQueueSummary,
  mapStaffWorkQueueRow,
  type QueueRow,
  rowsFromResult,
} from './staff-work-queue-read-model';

export type StaffWorkQueueType = 'job_order' | 'qa';
export type StaffWorkEntityType = 'booking_handoff' | 'job_order';

type QueueCandidate = {
  entityId: string;
  entityType: StaffWorkEntityType;
};

type QueuePageOptions = {
  view: 'my' | 'team' | 'unassigned' | 'blocked' | 'history';
  search: string;
  offset: number;
  limit: number;
};

const ACTIVE_SESSION_WINDOW_MS = 90_000;
const CLAIM_LEASE_MS = 15 * 60_000;

@Injectable()
export class StaffWorkQueuesRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {}

  async expireClaims(now = new Date()) {
    await this.db
      .update(staffWorkClaims)
      .set({
        status: 'expired',
        releasedAt: now,
        releaseReason: 'Lease expired after the owner stopped sending heartbeats.',
        updatedAt: now,
      })
      .where(and(eq(staffWorkClaims.status, 'active'), lt(staffWorkClaims.leaseExpiresAt, now)));

    await this.db.execute(sql`
      UPDATE staff_work_claims claim
      SET
        status = 'released',
        released_at = ${now},
        release_reason = 'Work moved to another workflow stage.',
        updated_at = ${now}
      WHERE claim.status = 'active'
        AND (
          (
            claim.queue_type = 'job_order'
            AND claim.entity_type = 'job_order'
            AND NOT EXISTS (
              SELECT 1
              FROM job_orders job
              LEFT JOIN job_order_quality_gates gate ON gate.job_order_id = job.id
              WHERE job.id = claim.entity_id
                AND (
                  job.status IN ('draft', 'assigned', 'in_progress', 'blocked')
                  OR (
                    job.status = 'ready_for_qa'
                    AND gate.status IN ('passed', 'overridden')
                    AND gate.reviewer_verdict = 'passed'
                  )
                )
            )
          )
          OR (
            claim.queue_type = 'qa'
            AND claim.entity_type = 'job_order'
            AND NOT EXISTS (
              SELECT 1
              FROM job_orders job
              JOIN job_order_quality_gates gate ON gate.job_order_id = job.id
              WHERE job.id = claim.entity_id
                AND job.status = 'ready_for_qa'
                AND gate.reviewer_verdict = 'pending'
                AND gate.pre_check_status IN ('completed', 'unavailable')
            )
          )
        )
    `);
  }

  async getSession(userId: string, queueType: StaffWorkQueueType) {
    return this.db.query.staffQueueSessions.findFirst({
      where: and(
        eq(staffQueueSessions.userId, userId),
        eq(staffQueueSessions.queueType, queueType),
      ),
    });
  }

  async setSessionAvailability(
    userId: string,
    queueType: StaffWorkQueueType,
    available: boolean,
  ) {
    const now = new Date();
    const [session] = await this.db
      .insert(staffQueueSessions)
      .values({
        userId,
        queueType,
        status: available ? 'available' : 'paused',
        lastSeenAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [staffQueueSessions.userId, staffQueueSessions.queueType],
        set: {
          status: available ? 'available' : 'paused',
          lastSeenAt: now,
          updatedAt: now,
        },
      })
      .returning();

    return session;
  }

  async touchAvailableSession(userId: string, queueType: StaffWorkQueueType) {
    const now = new Date();
    const [session] = await this.db
      .update(staffQueueSessions)
      .set({ lastSeenAt: now, updatedAt: now })
      .where(and(
        eq(staffQueueSessions.userId, userId),
        eq(staffQueueSessions.queueType, queueType),
        eq(staffQueueSessions.status, 'available'),
      ))
      .returning();

    return session ?? null;
  }

  async getActiveClaimsForOwner(userId: string, queueType: StaffWorkQueueType) {
    await this.expireClaims();
    return this.db.query.staffWorkClaims.findMany({
      where: and(
        eq(staffWorkClaims.queueType, queueType),
        eq(staffWorkClaims.ownerUserId, userId),
        eq(staffWorkClaims.status, 'active'),
      ),
      orderBy: [desc(staffWorkClaims.claimedAt)],
    });
  }

  async getActiveClaimForOwner(userId: string, queueType: StaffWorkQueueType) {
    const claims = await this.getActiveClaimsForOwner(userId, queueType);
    return claims[0] ?? null;
  }

  async dispatchNext(userId: string, queueType: StaffWorkQueueType, capacity: number) {
    const now = new Date();
    const activeSince = new Date(now.getTime() - ACTIVE_SESSION_WINDOW_MS);
    const leaseExpiresAt = new Date(now.getTime() + CLAIM_LEASE_MS);

    return this.db.transaction(async (tx) => {
      await tx
        .update(staffWorkClaims)
        .set({
          status: 'expired',
          releasedAt: now,
          releaseReason: 'Lease expired after the owner stopped sending heartbeats.',
          updatedAt: now,
        })
        .where(and(eq(staffWorkClaims.status, 'active'), lt(staffWorkClaims.leaseExpiresAt, now)));

      const nextSessionResult = await tx.execute(sql`
        SELECT session.id, session.user_id
        FROM staff_queue_sessions session
        WHERE session.queue_type = ${queueType}
          AND session.status = 'available'
          AND session.last_seen_at >= ${activeSince}
          AND (
            SELECT COUNT(*)
            FROM staff_work_claims claim
            WHERE claim.owner_user_id = session.user_id
              AND claim.queue_type = session.queue_type
              AND claim.status = 'active'
          ) < ${capacity}
        ORDER BY session.last_assigned_at ASC NULLS FIRST, session.created_at ASC, session.user_id ASC
        FOR UPDATE OF session SKIP LOCKED
        LIMIT 1
      `);
      const nextSession = rowsFromResult(nextSessionResult)[0];
      if (!nextSession || nextSession.user_id !== userId) {
        return null;
      }

      const candidate = await this.selectNextCandidate(tx, queueType);
      if (!candidate) {
        return null;
      }

      const [claim] = await tx
        .insert(staffWorkClaims)
        .values({
          queueType,
          entityType: candidate.entityType,
          entityId: candidate.entityId,
          ownerUserId: userId,
          status: 'active',
          claimedAt: now,
          heartbeatAt: now,
          leaseExpiresAt,
          updatedAt: now,
        })
        .returning();

      await tx
        .update(staffQueueSessions)
        .set({ lastAssignedAt: now, lastSeenAt: now, updatedAt: now })
        .where(eq(staffQueueSessions.id, String(nextSession.id)));

      return claim;
    });
  }

  async claimSelected(
    userId: string,
    queueType: StaffWorkQueueType,
    entityType: StaffWorkEntityType,
    entityId: string,
    capacity: number,
  ) {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + CLAIM_LEASE_MS);

    return this.db.transaction(async (tx) => {
      await tx
        .update(staffWorkClaims)
        .set({
          status: 'expired',
          releasedAt: now,
          releaseReason: 'Lease expired after the owner stopped sending heartbeats.',
          updatedAt: now,
        })
        .where(and(eq(staffWorkClaims.status, 'active'), lt(staffWorkClaims.leaseExpiresAt, now)));

      await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);

      const ownerClaimCountResult = await tx.execute(sql`
        SELECT COUNT(*)::int AS active_count
        FROM staff_work_claims
        WHERE queue_type = ${queueType}
          AND owner_user_id = ${userId}
          AND status = 'active'
      `);
      const ownerClaimCount = Number(rowsFromResult(ownerClaimCountResult)[0]?.active_count ?? 0);
      if (ownerClaimCount >= capacity) {
        throw new ConflictException({
          code: 'WORK_CAPACITY_REACHED',
          message: `You are already holding the maximum of ${capacity} ${queueType === 'qa' ? 'QA reviews' : 'Job Orders'}.`,
          capacity,
        });
      }

      const eligibilityResult = queueType === 'qa'
        ? await tx.execute(sql`
            SELECT job.id
            FROM job_orders job
            JOIN job_order_quality_gates gate ON gate.job_order_id = job.id
            WHERE ${entityType} = 'job_order'
              AND job.id = ${entityId}
              AND job.status = 'ready_for_qa'
              AND gate.reviewer_verdict = 'pending'
              AND gate.pre_check_status IN ('completed', 'unavailable')
            FOR UPDATE OF job
          `)
        : entityType === 'job_order'
          ? await tx.execute(sql`
              SELECT job.id
              FROM job_orders job
              LEFT JOIN job_order_quality_gates gate ON gate.job_order_id = job.id
              WHERE job.id = ${entityId}
                AND (
                  job.status IN ('draft', 'assigned', 'in_progress', 'blocked')
                  OR (
                  job.status = 'ready_for_qa'
                  AND gate.status IN ('passed', 'overridden')
                  AND gate.reviewer_verdict = 'passed'
                )
                )
              FOR UPDATE OF job
            `)
          : await tx.execute(sql`
              SELECT booking.id
              FROM bookings booking
              WHERE booking.id = ${entityId}
                AND booking.status IN ('confirmed', 'in_service')
                AND NOT EXISTS (
                  SELECT 1 FROM job_orders existing
                  WHERE existing.source_type = 'booking' AND existing.source_id = booking.id
                )
              FOR UPDATE OF booking
            `);

      if (rowsFromResult(eligibilityResult).length === 0) {
        throw new ConflictException({
          code: 'WORK_NOT_ELIGIBLE',
          message: 'This item is no longer eligible for the selected queue.',
        });
      }

      const existingEntityClaim = await tx.query.staffWorkClaims.findFirst({
        where: and(
          eq(staffWorkClaims.queueType, queueType),
          eq(staffWorkClaims.entityType, entityType),
          eq(staffWorkClaims.entityId, entityId),
          eq(staffWorkClaims.ownerUserId, userId),
          eq(staffWorkClaims.status, 'active'),
        ),
      });
      if (existingEntityClaim) {
        return existingEntityClaim;
      }

      const activeEntityClaim = await tx.query.staffWorkClaims.findFirst({
        where: and(
          eq(staffWorkClaims.queueType, queueType),
          eq(staffWorkClaims.entityType, entityType),
          eq(staffWorkClaims.entityId, entityId),
          eq(staffWorkClaims.status, 'active'),
        ),
      });
      if (activeEntityClaim) {
        throw new ConflictException({
          code: 'WORK_CLAIM_CONFLICT',
          message: 'Another staff member claimed this work first.',
          claim: activeEntityClaim,
        });
      }

      const [claim] = await tx
        .insert(staffWorkClaims)
        .values({
          queueType,
          entityType,
          entityId,
          ownerUserId: userId,
          status: 'active',
          claimedAt: now,
          heartbeatAt: now,
          leaseExpiresAt,
          updatedAt: now,
        })
        .returning();

      await tx
        .update(staffQueueSessions)
        .set({ lastAssignedAt: now, lastSeenAt: now, updatedAt: now })
        .where(and(
          eq(staffQueueSessions.userId, userId),
          eq(staffQueueSessions.queueType, queueType),
        ));

      return claim;
    });
  }

  async heartbeatClaim(claimId: string, ownerUserId: string) {
    const now = new Date();
    const [claim] = await this.db
      .update(staffWorkClaims)
      .set({
        heartbeatAt: now,
        leaseExpiresAt: new Date(now.getTime() + CLAIM_LEASE_MS),
        updatedAt: now,
      })
      .where(and(
        eq(staffWorkClaims.id, claimId),
        eq(staffWorkClaims.ownerUserId, ownerUserId),
        eq(staffWorkClaims.status, 'active'),
        gt(staffWorkClaims.leaseExpiresAt, now),
      ))
      .returning();

    if (!claim) {
      throw new ConflictException({
        code: 'WORK_CLAIM_CONFLICT',
        message: 'This work claim is no longer active or belongs to another staff member.',
      });
    }

    await this.db
      .update(staffQueueSessions)
      .set({
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(staffQueueSessions.userId, ownerUserId),
        eq(staffQueueSessions.queueType, claim.queueType),
        eq(staffQueueSessions.status, 'available'),
      ));

    return claim;
  }

  async releaseClaim(claimId: string, actorUserId: string, isSupervisor: boolean, reason?: string) {
    const claim = await this.db.query.staffWorkClaims.findFirst({
      where: eq(staffWorkClaims.id, claimId),
    });
    if (!claim) {
      throw new NotFoundException('Work claim not found');
    }
    if (!isSupervisor && claim.ownerUserId !== actorUserId) {
      throw new ConflictException({
        code: 'WORK_CLAIM_CONFLICT',
        message: 'Only the claim owner or a super admin can release this work.',
        ownerUserId: claim.ownerUserId,
        leaseExpiresAt: claim.leaseExpiresAt,
      });
    }
    if (claim.status !== 'active') {
      return claim;
    }

    const now = new Date();
    const [released] = await this.db
      .update(staffWorkClaims)
      .set({
        status: isSupervisor && claim.ownerUserId !== actorUserId ? 'reassigned' : 'released',
        releasedAt: now,
        releaseReason: reason?.trim() || 'Released by staff.',
        updatedAt: now,
      })
      .where(and(eq(staffWorkClaims.id, claimId), eq(staffWorkClaims.status, 'active')))
      .returning();

    return released ?? claim;
  }

  async reassignClaim(
    claimId: string,
    targetUserId: string,
    reason: string,
    capacities: Record<StaffWorkQueueType, number>,
  ) {
    const now = new Date();
    return this.db.transaction(async (tx) => {
      const current = await tx.query.staffWorkClaims.findFirst({
        where: eq(staffWorkClaims.id, claimId),
      });
      if (!current) {
        throw new NotFoundException('Work claim not found');
      }
      if (current.status !== 'active') {
        throw new ConflictException('Only active work can be reassigned');
      }

      await tx.execute(sql`SELECT id FROM users WHERE id = ${targetUserId} FOR UPDATE`);
      const targetClaimCountResult = await tx.execute(sql`
        SELECT COUNT(*)::int AS active_count
        FROM staff_work_claims
        WHERE queue_type = ${current.queueType}
          AND owner_user_id = ${targetUserId}
          AND status = 'active'
      `);
      const targetClaimCount = Number(
        rowsFromResult(targetClaimCountResult)[0]?.active_count ?? 0,
      );
      const targetCapacity = capacities[current.queueType];
      if (targetClaimCount >= targetCapacity) {
        throw new ConflictException({
          code: 'WORK_CAPACITY_REACHED',
          message: `The target staff member is already holding the maximum of ${targetCapacity} items in this queue.`,
          capacity: targetCapacity,
        });
      }

      await tx
        .update(staffWorkClaims)
        .set({
          status: 'reassigned',
          releasedAt: now,
          releaseReason: reason,
          updatedAt: now,
        })
        .where(and(eq(staffWorkClaims.id, claimId), eq(staffWorkClaims.status, 'active')));

      const [replacement] = await tx
        .insert(staffWorkClaims)
        .values({
          queueType: current.queueType,
          entityType: current.entityType,
          entityId: current.entityId,
          ownerUserId: targetUserId,
          status: 'active',
          claimedAt: now,
          heartbeatAt: now,
          leaseExpiresAt: new Date(now.getTime() + CLAIM_LEASE_MS),
          releaseReason: `Reassigned from claim ${claimId}: ${reason}`,
          updatedAt: now,
        })
        .returning();

      return replacement;
    });
  }

  async completeActiveClaim(
    queueType: StaffWorkQueueType,
    entityType: StaffWorkEntityType,
    entityId: string,
    ownerUserId?: string,
  ) {
    const now = new Date();
    const ownerCondition = ownerUserId
      ? eq(staffWorkClaims.ownerUserId, ownerUserId)
      : sql`true`;

    const [claim] = await this.db
      .update(staffWorkClaims)
      .set({
        status: 'completed',
        completedAt: now,
        releasedAt: now,
        releaseReason: 'Queue stage completed.',
        updatedAt: now,
      })
      .where(and(
        eq(staffWorkClaims.queueType, queueType),
        eq(staffWorkClaims.entityType, entityType),
        eq(staffWorkClaims.entityId, entityId),
        eq(staffWorkClaims.status, 'active'),
        ownerCondition,
      ))
      .returning();

    return claim ?? null;
  }

  async assertActiveClaim(
    claimId: string,
    queueType: StaffWorkQueueType,
    entityType: StaffWorkEntityType,
    entityId: string,
    ownerUserId: string,
  ) {
    const now = new Date();
    const claim = await this.db.query.staffWorkClaims.findFirst({
      where: and(
        eq(staffWorkClaims.id, claimId),
        eq(staffWorkClaims.queueType, queueType),
        eq(staffWorkClaims.entityType, entityType),
        eq(staffWorkClaims.entityId, entityId),
        eq(staffWorkClaims.ownerUserId, ownerUserId),
        eq(staffWorkClaims.status, 'active'),
        gt(staffWorkClaims.leaseExpiresAt, now),
      ),
    });

    if (!claim) {
      const current = await this.db.query.staffWorkClaims.findFirst({
        where: and(
          eq(staffWorkClaims.queueType, queueType),
          eq(staffWorkClaims.entityType, entityType),
          eq(staffWorkClaims.entityId, entityId),
          eq(staffWorkClaims.status, 'active'),
        ),
      });
      throw new ConflictException({
        code: 'WORK_CLAIM_CONFLICT',
        message: current
          ? 'Another staff member owns this work.'
          : 'Claim this work from the queue before editing it.',
        ownerUserId: current?.ownerUserId ?? null,
        leaseExpiresAt: current?.leaseExpiresAt ?? null,
      });
    }

    return claim;
  }

  async assertClaimAccess(
    claimId: string | undefined,
    queueType: StaffWorkQueueType,
    entityType: StaffWorkEntityType,
    entityId: string,
    ownerUserId: string,
    options: { allowUnclaimedWithoutHeader?: boolean } = {},
  ) {
    await this.expireClaims();

    const activeClaim = await this.db.query.staffWorkClaims.findFirst({
      where: and(
        eq(staffWorkClaims.queueType, queueType),
        eq(staffWorkClaims.entityType, entityType),
        eq(staffWorkClaims.entityId, entityId),
        eq(staffWorkClaims.status, 'active'),
      ),
    });

    if (!activeClaim && !claimId && options.allowUnclaimedWithoutHeader) {
      return null;
    }
    if (!claimId) {
      throw new ConflictException({
        code: 'WORK_CLAIM_REQUIRED',
        claim: activeClaim ?? null,
        message: activeClaim
          ? 'This record is assigned to another active queue session.'
          : 'Claim this work from the queue before editing it.',
      });
    }

    return this.assertActiveClaim(claimId, queueType, entityType, entityId, ownerUserId);
  }

  async listQueue(
    queueType: StaffWorkQueueType,
    actorUserId: string,
    options: QueuePageOptions,
  ) {
    await this.expireClaims();

    if (options.view === 'history') {
      return this.listClaimHistory(queueType, actorUserId, options);
    }

    const result = queueType === 'qa'
      ? await this.listQaQueue(actorUserId, options)
      : await this.listJobOrderQueue(actorUserId, options);
    const rows = rowsFromResult(result);

    return {
      items: rows.slice(0, options.limit).map((row) => this.mapQueueRow(row, actorUserId)),
      hasNext: rows.length > options.limit,
    };
  }

  async getQueueSummary(queueType: StaffWorkQueueType, actorUserId: string) {
    await this.expireClaims();
    return getStaffWorkQueueSummary(this.db, queueType, actorUserId);
  }

  async listPresence(queueType: StaffWorkQueueType, actorUserId: string) {
    await this.expireClaims();
    const result = await this.db.execute(sql`
      SELECT
        session.user_id,
        session.status::text AS session_status,
        session.last_seen_at,
        session.last_assigned_at,
        CONCAT_WS(' ', profile.first_name, profile.last_name) AS staff_name,
        app_user.staff_code,
        claim.id AS claim_id,
        claim.entity_id,
        claim.entity_type::text AS entity_type,
        claim.claimed_at,
        claim.lease_expires_at
      FROM staff_queue_sessions session
      JOIN users app_user ON app_user.id = session.user_id
      LEFT JOIN user_profiles profile ON profile.user_id = session.user_id
      LEFT JOIN staff_work_claims claim
        ON claim.queue_type = session.queue_type
        AND claim.owner_user_id = session.user_id
        AND claim.status = 'active'
      WHERE session.queue_type = ${queueType}
      ORDER BY
        CASE WHEN session.user_id = ${actorUserId} THEN 0 ELSE 1 END,
        CASE WHEN session.status = 'available' THEN 0 ELSE 1 END,
        session.last_seen_at DESC
    `);

    return rowsFromResult(result).map((row) => ({
      userId: String(row.user_id),
      staffName: String(row.staff_name ?? '').trim() || 'Staff member',
      staffCode: row.staff_code ? String(row.staff_code) : null,
      available: row.session_status === 'available',
      isCurrentUser: String(row.user_id) === actorUserId,
      lastSeenAt: new Date(String(row.last_seen_at)).toISOString(),
      lastAssignedAt: row.last_assigned_at
        ? new Date(String(row.last_assigned_at)).toISOString()
        : null,
      activeClaim: row.claim_id
        ? {
            id: String(row.claim_id),
            entityId: String(row.entity_id),
            entityType: String(row.entity_type),
            claimedAt: new Date(String(row.claimed_at)).toISOString(),
            leaseExpiresAt: new Date(String(row.lease_expires_at)).toISOString(),
          }
        : null,
    }));
  }

  private async selectNextCandidate(
    tx: any,
    queueType: StaffWorkQueueType,
  ): Promise<QueueCandidate | null> {
    const result = queueType === 'qa'
      ? await tx.execute(sql`
          SELECT job.id AS entity_id, 'job_order'::text AS entity_type
          FROM job_orders job
          JOIN job_order_quality_gates gate ON gate.job_order_id = job.id
          LEFT JOIN staff_work_claims claim
            ON claim.queue_type = 'qa'
            AND claim.entity_type = 'job_order'
            AND claim.entity_id = job.id
            AND claim.status = 'active'
          WHERE job.status = 'ready_for_qa'
            AND gate.reviewer_verdict = 'pending'
            AND gate.pre_check_status IN ('completed', 'unavailable')
            AND claim.id IS NULL
          ORDER BY
            CASE WHEN COALESCE(gate.last_audit_completed_at, gate.created_at) <= NOW() - INTERVAL '2 hours' THEN 1 ELSE 0 END DESC,
            gate.risk_score DESC,
            COALESCE(gate.last_audit_completed_at, gate.created_at) ASC,
            job.id ASC
          FOR UPDATE OF job SKIP LOCKED
          LIMIT 1
        `)
      : await tx.execute(sql`
          SELECT job.id AS entity_id, 'job_order'::text AS entity_type
          FROM job_orders job
          LEFT JOIN staff_work_claims claim
            ON claim.queue_type = 'job_order'
            AND claim.entity_type = 'job_order'
            AND claim.entity_id = job.id
            AND claim.status = 'active'
          LEFT JOIN bookings booking
            ON job.source_type = 'booking' AND booking.id = job.source_id
          LEFT JOIN job_order_quality_gates gate ON gate.job_order_id = job.id
          WHERE (
              job.status IN ('draft', 'assigned', 'in_progress', 'blocked')
              OR (
                job.status = 'ready_for_qa'
                AND gate.status IN ('passed', 'overridden')
                AND gate.reviewer_verdict = 'passed'
              )
            )
            AND claim.id IS NULL
          ORDER BY
            CASE
              WHEN booking.scheduled_date < CURRENT_DATE THEN 6
              WHEN booking.scheduled_date = CURRENT_DATE THEN 5
              WHEN job.status = 'ready_for_qa' THEN 4
              WHEN job.status = 'blocked' THEN 3
              WHEN job.status = 'in_progress' THEN 2
              ELSE 1
            END DESC,
            job.updated_at ASC,
            job.id ASC
          FOR UPDATE OF job SKIP LOCKED
          LIMIT 1
        `);

    const row = rowsFromResult(result)[0];
    if (row) {
      return {
        entityId: String(row.entity_id),
        entityType: row.entity_type as StaffWorkEntityType,
      };
    }

    if (queueType !== 'job_order') {
      return null;
    }

    const handoffResult = await tx.execute(sql`
      SELECT booking.id AS entity_id, 'booking_handoff'::text AS entity_type
      FROM bookings booking
      LEFT JOIN staff_work_claims claim
        ON claim.queue_type = 'job_order'
        AND claim.entity_type = 'booking_handoff'
        AND claim.entity_id = booking.id
        AND claim.status = 'active'
      WHERE booking.status IN ('confirmed', 'in_service')
        AND claim.id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM job_orders existing
          WHERE existing.source_type = 'booking' AND existing.source_id = booking.id
        )
      ORDER BY
        CASE
          WHEN booking.scheduled_date < CURRENT_DATE THEN 3
          WHEN booking.scheduled_date = CURRENT_DATE THEN 2
          ELSE 1
        END DESC,
        booking.scheduled_date ASC,
        booking.updated_at ASC,
        booking.id ASC
      FOR UPDATE OF booking SKIP LOCKED
      LIMIT 1
    `);
    const handoff = rowsFromResult(handoffResult)[0];
    return handoff
      ? { entityId: String(handoff.entity_id), entityType: 'booking_handoff' }
      : null;
  }

  private listQaQueue(actorUserId: string, options: QueuePageOptions) {
    const search = options.search ? `%${options.search}%` : null;
    return this.db.execute(sql`
      SELECT
        job.id AS entity_id,
        'job_order'::text AS entity_type,
        job.id AS job_order_id,
        NULL::uuid AS booking_id,
        COALESCE(booking.booking_reference, 'JO-' || LEFT(job.id::text, 8)) AS reference,
        job.status::text AS status,
        gate.risk_score,
        gate.blocking_reason,
        NULL::text AS priority_reason,
        COALESCE(gate.last_audit_completed_at, gate.created_at) AS queue_entered_at,
        CONCAT_WS(' ', customer_profile.first_name, customer_profile.last_name) AS customer_name,
        CONCAT_WS(' ', vehicle.year::text, vehicle.make, vehicle.model) AS vehicle_name,
        vehicle.plate_number,
        claim.id AS claim_id,
        claim.owner_user_id,
        claim.lease_expires_at,
        CONCAT_WS(' ', owner_profile.first_name, owner_profile.last_name) AS owner_name
      FROM job_orders job
      JOIN job_order_quality_gates gate ON gate.job_order_id = job.id
      LEFT JOIN bookings booking
        ON job.source_type = 'booking' AND booking.id = job.source_id
      LEFT JOIN user_profiles customer_profile ON customer_profile.user_id = job.customer_user_id
      LEFT JOIN vehicles vehicle ON vehicle.id = job.vehicle_id
      LEFT JOIN staff_work_claims claim
        ON claim.queue_type = 'qa'
        AND claim.entity_type = 'job_order'
        AND claim.entity_id = job.id
        AND claim.status = 'active'
      LEFT JOIN user_profiles owner_profile ON owner_profile.user_id = claim.owner_user_id
      WHERE job.status = 'ready_for_qa'
        AND gate.reviewer_verdict = 'pending'
        AND gate.pre_check_status IN ('completed', 'unavailable')
        AND (${options.view} <> 'my' OR claim.owner_user_id = ${actorUserId})
        AND (${options.view} <> 'unassigned' OR claim.id IS NULL)
        AND (
          ${search}::text IS NULL
          OR COALESCE(booking.booking_reference, '') ILIKE ${search}
          OR CONCAT_WS(' ', customer_profile.first_name, customer_profile.last_name) ILIKE ${search}
          OR CONCAT_WS(' ', vehicle.make, vehicle.model, vehicle.plate_number) ILIKE ${search}
        )
      ORDER BY
        CASE WHEN COALESCE(gate.last_audit_completed_at, gate.created_at) <= NOW() - INTERVAL '2 hours' THEN 1 ELSE 0 END DESC,
        gate.risk_score DESC,
        COALESCE(gate.last_audit_completed_at, gate.created_at) ASC,
        job.id ASC
      LIMIT ${options.limit + 1}
      OFFSET ${options.offset}
    `);
  }

  private listJobOrderQueue(actorUserId: string, options: QueuePageOptions) {
    const search = options.search ? `%${options.search}%` : null;
    return this.db.execute(sql`
      WITH candidates AS (
        SELECT
          job.id AS entity_id,
          'job_order'::text AS entity_type,
          job.id AS job_order_id,
          booking.id AS booking_id,
          COALESCE(booking.booking_reference, 'JO-' || LEFT(job.id::text, 8)) AS reference,
          job.status::text AS status,
          job.updated_at AS queue_entered_at,
          job.customer_user_id,
          job.vehicle_id,
          CASE
            WHEN booking.scheduled_date < CURRENT_DATE THEN 6
            WHEN booking.scheduled_date = CURRENT_DATE THEN 5
            WHEN job.status = 'ready_for_qa' THEN 4
            WHEN job.status = 'blocked' THEN 3
            WHEN job.status = 'in_progress' THEN 2
            ELSE 1
          END AS priority_rank,
          CASE
            WHEN booking.scheduled_date < CURRENT_DATE THEN 'Overdue scheduled work'
            WHEN booking.scheduled_date = CURRENT_DATE THEN 'Due today'
            WHEN job.status = 'ready_for_qa' THEN 'QA cleared; ready to finalize'
            WHEN job.status = 'blocked' THEN 'Blocked work'
            WHEN job.status = 'in_progress' THEN 'Work in progress'
            ELSE 'Waiting to start'
          END AS priority_reason
        FROM job_orders job
        LEFT JOIN bookings booking
          ON job.source_type = 'booking' AND booking.id = job.source_id
        LEFT JOIN job_order_quality_gates gate ON gate.job_order_id = job.id
        WHERE (
          job.status IN ('draft', 'assigned', 'in_progress', 'blocked')
          OR (
            job.status = 'ready_for_qa'
            AND gate.status IN ('passed', 'overridden')
            AND gate.reviewer_verdict = 'passed'
          )
        )

        UNION ALL

        SELECT
          booking.id,
          'booking_handoff'::text,
          NULL::uuid,
          booking.id,
          COALESCE(booking.booking_reference, 'BK-' || LEFT(booking.id::text, 8)),
          booking.status::text,
          booking.updated_at,
          booking.user_id,
          booking.vehicle_id,
          CASE
            WHEN booking.scheduled_date < CURRENT_DATE THEN 5
            WHEN booking.scheduled_date = CURRENT_DATE THEN 4
            ELSE 1
          END,
          CASE
            WHEN booking.scheduled_date < CURRENT_DATE THEN 'Overdue booking handoff'
            WHEN booking.scheduled_date = CURRENT_DATE THEN 'Booking handoff due today'
            ELSE 'Upcoming booking handoff'
          END
        FROM bookings booking
        WHERE booking.status IN ('confirmed', 'in_service')
          AND NOT EXISTS (
            SELECT 1 FROM job_orders existing
            WHERE existing.source_type = 'booking' AND existing.source_id = booking.id
          )
      )
      SELECT
        candidate.*,
        0::int AS risk_score,
        NULL::text AS blocking_reason,
        CONCAT_WS(' ', customer_profile.first_name, customer_profile.last_name) AS customer_name,
        CONCAT_WS(' ', vehicle.year::text, vehicle.make, vehicle.model) AS vehicle_name,
        vehicle.plate_number,
        claim.id AS claim_id,
        claim.owner_user_id,
        claim.lease_expires_at,
        CONCAT_WS(' ', owner_profile.first_name, owner_profile.last_name) AS owner_name
      FROM candidates candidate
      LEFT JOIN user_profiles customer_profile ON customer_profile.user_id = candidate.customer_user_id
      LEFT JOIN vehicles vehicle ON vehicle.id = candidate.vehicle_id
      LEFT JOIN staff_work_claims claim
        ON claim.queue_type = 'job_order'
        AND claim.entity_type = candidate.entity_type::staff_work_entity_type
        AND claim.entity_id = candidate.entity_id
        AND claim.status = 'active'
      LEFT JOIN user_profiles owner_profile ON owner_profile.user_id = claim.owner_user_id
      WHERE (${options.view} <> 'my' OR claim.owner_user_id = ${actorUserId})
        AND (${options.view} <> 'unassigned' OR claim.id IS NULL)
        AND (${options.view} <> 'blocked' OR candidate.status = 'blocked')
        AND (
          ${search}::text IS NULL
          OR candidate.reference ILIKE ${search}
          OR CONCAT_WS(' ', customer_profile.first_name, customer_profile.last_name) ILIKE ${search}
          OR CONCAT_WS(' ', vehicle.make, vehicle.model, vehicle.plate_number) ILIKE ${search}
        )
      ORDER BY candidate.priority_rank DESC, candidate.queue_entered_at ASC, candidate.entity_id ASC
      LIMIT ${options.limit + 1}
      OFFSET ${options.offset}
    `);
  }

  private async listClaimHistory(
    queueType: StaffWorkQueueType,
    actorUserId: string,
    options: QueuePageOptions,
  ) {
    const search = options.search ? `%${options.search}%` : null;
    const result = await this.db.execute(sql`
      SELECT
        claim.entity_id,
        claim.entity_type::text,
        CASE WHEN claim.entity_type = 'job_order' THEN claim.entity_id ELSE NULL END AS job_order_id,
        CASE WHEN claim.entity_type = 'booking_handoff' THEN claim.entity_id ELSE NULL END AS booking_id,
        COALESCE(booking.booking_reference, 'WORK-' || LEFT(claim.entity_id::text, 8)) AS reference,
        claim.status::text AS status,
        0::int AS risk_score,
        claim.release_reason AS blocking_reason,
        NULL::text AS priority_reason,
        claim.claimed_at AS queue_entered_at,
        NULL::text AS customer_name,
        NULL::text AS vehicle_name,
        NULL::text AS plate_number,
        claim.id AS claim_id,
        claim.owner_user_id,
        claim.lease_expires_at,
        CONCAT_WS(' ', owner_profile.first_name, owner_profile.last_name) AS owner_name
      FROM staff_work_claims claim
      LEFT JOIN job_orders job
        ON claim.entity_type = 'job_order' AND job.id = claim.entity_id
      LEFT JOIN bookings booking
        ON (claim.entity_type = 'booking_handoff' AND booking.id = claim.entity_id)
        OR (job.source_type = 'booking' AND booking.id = job.source_id)
      LEFT JOIN user_profiles owner_profile ON owner_profile.user_id = claim.owner_user_id
      WHERE claim.queue_type = ${queueType}
        AND claim.status <> 'active'
        AND (${search}::text IS NULL OR COALESCE(booking.booking_reference, claim.entity_id::text) ILIKE ${search})
      ORDER BY COALESCE(claim.completed_at, claim.released_at, claim.updated_at) DESC, claim.id DESC
      LIMIT ${options.limit + 1}
      OFFSET ${options.offset}
    `);
    const rows = rowsFromResult(result);
    return {
      items: rows.slice(0, options.limit).map((row) => this.mapQueueRow(row, actorUserId)),
      hasNext: rows.length > options.limit,
    };
  }

  private mapQueueRow(row: QueueRow, actorUserId: string) {
    return mapStaffWorkQueueRow(row, actorUserId);
  }
}
