import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { AppDatabase } from '@shared/db/database.types';

import {
  assertAccessoryIdempotencyFingerprint,
  fingerprintAccessoryPayload,
} from '../common/accessories-common';
import {
  accessoryIdempotencyRecords,
  accessoryOutbox,
  accessoryPaymentEvents,
} from '../schemas/accessories.schema';

export const ACCESSORY_OUTBOX_PROCESSING_LEASE_MS = 5 * 60_000;

export const accessoryOutboxLeaseUntil = (now = new Date()) =>
  new Date(now.getTime() + ACCESSORY_OUTBOX_PROCESSING_LEASE_MS);

export class AccessoriesOperationsRepository {
  constructor(private readonly db: AppDatabase) {}

  async claimIdempotency(input: {
    actorUserId: string | null;
    scope: string;
    key: string;
    payload: unknown;
  }) {
    const payloadFingerprint = fingerprintAccessoryPayload(input.payload);
    const [created] = await this.db
      .insert(accessoryIdempotencyRecords)
      .values({
        actorUserId: input.actorUserId,
        scope: input.scope,
        key: input.key,
        payloadFingerprint,
      })
      .onConflictDoNothing()
      .returning();
    if (created) return { claimed: true, record: created } as const;
    const [existing] = await this.db
      .select()
      .from(accessoryIdempotencyRecords)
      .where(
        and(
          input.actorUserId
            ? eq(accessoryIdempotencyRecords.actorUserId, input.actorUserId)
            : sql`${accessoryIdempotencyRecords.actorUserId} IS NULL`,
          eq(accessoryIdempotencyRecords.scope, input.scope),
          eq(accessoryIdempotencyRecords.key, input.key),
        ),
      )
      .limit(1);
    assertAccessoryIdempotencyFingerprint(existing.payloadFingerprint, payloadFingerprint);
    return { claimed: false, record: existing } as const;
  }


  async completeIdempotency(
    id: string,
    responseSnapshot: Record<string, unknown>,
    resource?: { type: string; id: string },
  ) {
    await this.db
      .update(accessoryIdempotencyRecords)
      .set({
        responseSnapshot,
        resourceType: resource?.type,
        resourceId: resource?.id,
      })
      .where(eq(accessoryIdempotencyRecords.id, id));
  }

  async releaseIncompleteIdempotency(id: string) {
    await this.db
      .delete(accessoryIdempotencyRecords)
      .where(
        and(
          eq(accessoryIdempotencyRecords.id, id),
          isNull(accessoryIdempotencyRecords.resourceId),
          isNull(accessoryIdempotencyRecords.responseSnapshot),
        ),
      );
  }


  async insertPaymentEvent(input: typeof accessoryPaymentEvents.$inferInsert) {
    const [created] = await this.db
      .insert(accessoryPaymentEvents)
      .values(input)
      .onConflictDoNothing()
      .returning();
    return created ?? null;
  }


  async claimOutboxBatch(limit = 25) {
    return this.db.transaction(async (tx) => {
      const result = await tx.execute<{ id: string }>(sql`
        select id
        from accessory_outbox
        where status in ('pending', 'failed', 'processing')
          and available_at <= now()
          and attempts < 10
        order by available_at, id
        for update skip locked
        limit ${Math.max(1, Math.min(limit, 100))}
      `);
      const ids = result.rows.map((row) => row.id);
      if (!ids.length) return [];
      return tx
        .update(accessoryOutbox)
        .set({
          status: 'processing',
          attempts: sql`${accessoryOutbox.attempts} + 1`,
          availableAt: accessoryOutboxLeaseUntil(),
        })
        .where(inArray(accessoryOutbox.id, ids))
        .returning();
    });
  }


  async markOutboxSent(id: string) {
    await this.db
      .update(accessoryOutbox)
      .set({ status: 'sent', processedAt: new Date(), lastError: null })
      .where(eq(accessoryOutbox.id, id));
  }


  async markOutboxFailed(id: string, error: string) {
    await this.db
      .update(accessoryOutbox)
      .set({
        status: 'failed',
        lastError: error.slice(0, 1000),
        availableAt: new Date(Date.now() + 60_000),
      })
      .where(eq(accessoryOutbox.id, id));
  }
}
