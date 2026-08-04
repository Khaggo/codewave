import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';

import { AppDatabase } from '@shared/db/database.types';
import { users } from '@main-modules/users/schemas/users.schema';

import {
  ACCESSORY_FULFILLMENT_CLAIMABLE_STATUSES,
  AccessoryActor,
  AccessoryCursor,
  generateAccessoryPickupCode,
  hashAccessoryPickupCode,
} from '../common/accessories-common';
import {
  accessoryFulfillmentHistory,
  accessoryInventoryBalances,
  accessoryInventoryMovements,
  accessoryInventoryReservations,
  accessoryOrderItems,
  accessoryOrders,
  accessoryOutbox,
  accessoryPaymentAttempts,
  accessoryRefunds,
} from '../schemas/accessories.schema';
import { releaseAccessoryReservations } from './accessories-repository.helpers';

export class AccessoriesOrdersRepository {
  constructor(private readonly db: AppDatabase) {}

  async findAssignableStaff(userId: string) {
    const [user] = await this.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          inArray(users.role, ['service_adviser', 'super_admin']),
          eq(users.isActive, true),
          sql`${users.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    return user ?? null;
  }

  async findOrder(id: string) {
    const [order] = await this.db
      .select()
      .from(accessoryOrders)
      .where(eq(accessoryOrders.id, id))
      .limit(1);
    if (!order) return null;
    const [items, history, paymentAttempts, refunds] = await Promise.all([
      this.db.select().from(accessoryOrderItems).where(eq(accessoryOrderItems.orderId, id)),
      this.db
        .select()
        .from(accessoryFulfillmentHistory)
        .where(eq(accessoryFulfillmentHistory.orderId, id))
        .orderBy(accessoryFulfillmentHistory.createdAt),
      this.db
        .select()
        .from(accessoryPaymentAttempts)
        .where(eq(accessoryPaymentAttempts.orderId, id))
        .orderBy(desc(accessoryPaymentAttempts.createdAt)),
      this.db.select().from(accessoryRefunds).where(eq(accessoryRefunds.orderId, id)),
    ]);
    return { ...order, items, history, paymentAttempts, refunds };
  }


  async listOrders(input: {
    userId?: string;
    status?: typeof accessoryOrders.$inferSelect.status;
    limit: number;
    cursor: AccessoryCursor | null;
  }) {
    const conditions = [];
    if (input.userId) conditions.push(eq(accessoryOrders.userId, input.userId));
    if (input.status) conditions.push(eq(accessoryOrders.status, input.status));
    if (input.cursor) {
      const cursorDate = new Date(input.cursor.createdAt);
      conditions.push(
        or(
          lt(accessoryOrders.createdAt, cursorDate),
          and(eq(accessoryOrders.createdAt, cursorDate), lt(accessoryOrders.id, input.cursor.id)),
        )!,
      );
    }
    const rows = await this.db
      .select()
      .from(accessoryOrders)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(accessoryOrders.createdAt), desc(accessoryOrders.id))
      .limit(input.limit + 1);
    return { rows: rows.slice(0, input.limit), hasMore: rows.length > input.limit };
  }


  async takeOrder(orderId: string, actor: AccessoryActor, expectedVersion: number) {
    const [updated] = await this.db
      .update(accessoryOrders)
      .set({
        assignedToUserId: actor.userId,
        version: sql`${accessoryOrders.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accessoryOrders.id, orderId),
          eq(accessoryOrders.version, expectedVersion),
          inArray(accessoryOrders.status, [...ACCESSORY_FULFILLMENT_CLAIMABLE_STATUSES]),
          sql`${accessoryOrders.assignedToUserId} IS NULL`,
        ),
      )
      .returning();
    return updated ?? null;
  }


  async reassignOrder(input: {
    actor: AccessoryActor;
    orderId: string;
    expectedVersion: number;
    assigneeUserId: string;
    reason: string;
  }) {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(accessoryOrders)
        .set({
          assignedToUserId: input.assigneeUserId,
          version: sql`${accessoryOrders.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(accessoryOrders.id, input.orderId),
            eq(accessoryOrders.version, input.expectedVersion),
          ),
        )
        .returning();
      if (updated) {
        await tx.insert(accessoryFulfillmentHistory).values({
          orderId: updated.id,
          previousStatus: updated.status,
          nextStatus: updated.status,
          actorUserId: input.actor.userId,
          reason: input.reason,
          metadata: { reassignedToUserId: input.assigneeUserId },
        });
      }
      return updated ?? null;
    });
  }


  async transitionOrder(input: {
    actor: AccessoryActor;
    orderId: string;
    expectedVersion: number;
    status: 'preparing' | 'ready_for_pickup' | 'collected';
    reason?: string;
  }) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(accessoryOrders)
        .where(eq(accessoryOrders.id, input.orderId))
        .limit(1);
      if (
        !current ||
        current.version !== input.expectedVersion ||
        current.assignedToUserId !== input.actor.userId
      ) {
        return null;
      }
      const allowed =
        (input.status === 'preparing' && ['reserved', 'paid'].includes(current.status)) ||
        (input.status === 'ready_for_pickup' && current.status === 'preparing') ||
        (input.status === 'collected' && current.status === 'ready_for_pickup');
      if (!allowed) return { invalidTransition: true } as const;
      const now = new Date();

      if (
        input.status === 'collected' &&
        current.paymentMethod === 'pay_at_shop' &&
        current.paymentStatus !== 'paid'
      ) {
        const items = await tx
          .select()
          .from(accessoryOrderItems)
          .where(eq(accessoryOrderItems.orderId, current.id));
        const reservations = await tx
          .select()
          .from(accessoryInventoryReservations)
          .where(
            and(
              eq(accessoryInventoryReservations.orderId, current.id),
              eq(accessoryInventoryReservations.status, 'active'),
            ),
          );
        const reservationsByVariant = new Map(
          reservations.map((reservation) => [reservation.variantId, reservation]),
        );

        for (const item of [...items].sort((left, right) =>
          String(left.variantId).localeCompare(String(right.variantId)),
        )) {
          if (!item.variantId) return { stockConflict: true } as const;
          await tx.execute(
            sql`select variant_id from accessory_inventory_balances where variant_id = ${item.variantId} for update`,
          );
          const [balance] = await tx
            .select()
            .from(accessoryInventoryBalances)
            .where(eq(accessoryInventoryBalances.variantId, item.variantId))
            .limit(1);
          const reservation = reservationsByVariant.get(item.variantId);
          if (
            !balance ||
            !reservation ||
            balance.onHandQuantity < item.quantity ||
            balance.reservedQuantity < item.quantity
          ) {
            return { stockConflict: true } as const;
          }
          const nextOnHand = balance.onHandQuantity - item.quantity;
          const nextReserved = balance.reservedQuantity - item.quantity;
          await tx
            .update(accessoryInventoryBalances)
            .set({
              onHandQuantity: nextOnHand,
              reservedQuantity: nextReserved,
              version: sql`${accessoryInventoryBalances.version} + 1`,
              updatedAt: now,
            })
            .where(eq(accessoryInventoryBalances.variantId, item.variantId));
          await tx
            .update(accessoryInventoryReservations)
            .set({ status: 'consumed', consumedAt: now })
            .where(
              and(
                eq(accessoryInventoryReservations.id, reservation.id),
                eq(accessoryInventoryReservations.status, 'active'),
              ),
            );
          await tx.insert(accessoryInventoryMovements).values({
            variantId: item.variantId,
            movementType: 'sale',
            quantityDelta: -item.quantity,
            resultingOnHand: nextOnHand,
            resultingReserved: nextReserved,
            sourceType: 'accessory_order',
            sourceId: current.id,
            actorUserId: input.actor.userId,
            reason: 'Pay-at-shop collection',
          });
        }
      }
      const [updated] = await tx
        .update(accessoryOrders)
        .set({
          status: input.status,
          preparedAt: input.status === 'preparing' ? now : current.preparedAt,
          readyAt: input.status === 'ready_for_pickup' ? now : current.readyAt,
          collectedAt: input.status === 'collected' ? now : current.collectedAt,
          pickupCodeHash: input.status === 'collected' ? null : current.pickupCodeHash,
          pickupCodeAttempts: input.status === 'collected' ? 0 : current.pickupCodeAttempts,
          pickupCodeLockedUntil: input.status === 'collected' ? null : current.pickupCodeLockedUntil,
          paymentStatus:
            input.status === 'collected' && current.paymentMethod === 'pay_at_shop'
              ? 'paid'
              : current.paymentStatus,
          version: sql`${accessoryOrders.version} + 1`,
          updatedAt: now,
        })
        .where(
          and(eq(accessoryOrders.id, input.orderId), eq(accessoryOrders.version, input.expectedVersion)),
        )
        .returning();
      if (!updated) return null;
      await tx.insert(accessoryFulfillmentHistory).values({
        orderId: updated.id,
        previousStatus: current.status,
        nextStatus: updated.status,
        actorUserId: input.actor.userId,
        reason: input.reason,
      });
      await tx.insert(accessoryOutbox).values({
        eventType: `accessory.order.${input.status}`,
        aggregateType: 'accessory_order',
        aggregateId: updated.id,
        payload: { orderId: updated.id, userId: updated.userId, orderReference: updated.orderReference },
      });
      return updated;
    });
  }


  async cancelOrder(input: {
    actor: AccessoryActor;
    orderId: string;
    reason: string;
    force?: boolean;
  }) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from accessory_orders where id = ${input.orderId} for update`,
      );
      const [current] = await tx
        .select()
        .from(accessoryOrders)
        .where(eq(accessoryOrders.id, input.orderId))
        .limit(1);
      if (!current) return null;
      if (['cancelled', 'refund_pending'].includes(current.status)) return current;
      if (
        ['collected', 'refunded'].includes(current.status) ||
        (!input.force && ['preparing', 'ready_for_pickup'].includes(current.status))
      ) {
        return { adminExceptionRequired: true, order: current } as const;
      }
      const paid = current.paymentStatus === 'paid';
      const nextStatus = paid ? 'refund_pending' : 'cancelled';
      const [updated] = await tx
        .update(accessoryOrders)
        .set({
          status: nextStatus,
          paymentStatus: paid ? 'refund_pending' : current.paymentStatus,
          cancelledAt: new Date(),
          version: sql`${accessoryOrders.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(accessoryOrders.id, current.id))
        .returning();
      if (paid) {
        await tx
          .insert(accessoryRefunds)
          .values({
            orderId: current.id,
            amountCents: current.totalCents,
            reason: input.reason,
            requestedByUserId: input.actor.userId,
          })
          .onConflictDoNothing();
      }
      await tx.insert(accessoryFulfillmentHistory).values({
        orderId: current.id,
        previousStatus: current.status,
        nextStatus,
        actorUserId: input.actor.userId,
        reason: input.reason,
      });
      await tx.insert(accessoryOutbox).values({
        eventType: paid ? 'accessory.refund.requested' : 'accessory.order.cancelled',
        aggregateType: 'accessory_order',
        aggregateId: current.id,
        payload: { orderId: current.id, userId: current.userId },
      });
      if (!paid) await releaseAccessoryReservations(current.id, input.actor.userId, tx);
      return updated;
    });
  }


  async regeneratePickupCode(orderId: string) {
    const code = generateAccessoryPickupCode();
    const [updated] = await this.db
      .update(accessoryOrders)
      .set({
        pickupCodeHash: hashAccessoryPickupCode(orderId, code),
        pickupCodeAttempts: 0,
        pickupCodeLockedUntil: null,
        version: sql`${accessoryOrders.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(accessoryOrders.id, orderId))
      .returning();
    return updated ? { order: updated, pickupCode: code } : null;
  }


  async recordPickupFailure(orderId: string, lockUntil: Date | null) {
    await this.db
      .update(accessoryOrders)
      .set({
        pickupCodeAttempts: sql`${accessoryOrders.pickupCodeAttempts} + 1`,
        pickupCodeLockedUntil: lockUntil,
        updatedAt: new Date(),
      })
      .where(eq(accessoryOrders.id, orderId));
  }


  async releaseExpiredReservations(now = new Date()) {
    const rows = await this.db
      .select({ orderId: accessoryOrders.id })
      .from(accessoryOrders)
      .where(
        and(
          inArray(accessoryOrders.status, ['pending_payment', 'reserved']),
          lt(accessoryOrders.reservationExpiresAt, now),
          sql`${accessoryOrders.preparedAt} IS NULL`,
        ),
      )
      .limit(100);
    let released = 0;
    for (const row of rows) {
      const didRelease = await this.db.transaction(async (tx) => {
        await tx.execute(
          sql`select id from accessory_orders where id = ${row.orderId} for update`,
        );
        const [eligible] = await tx
          .select({ id: accessoryOrders.id })
          .from(accessoryOrders)
          .where(
            and(
              eq(accessoryOrders.id, row.orderId),
              inArray(accessoryOrders.status, ['pending_payment', 'reserved']),
              lt(accessoryOrders.reservationExpiresAt, now),
              sql`${accessoryOrders.preparedAt} IS NULL`,
            ),
          )
          .limit(1);
        if (!eligible) return false;
        await releaseAccessoryReservations(row.orderId, null, tx);
        await tx
          .update(accessoryOrders)
          .set({ status: 'expired', paymentStatus: 'expired', updatedAt: now })
          .where(
            and(
              eq(accessoryOrders.id, row.orderId),
              inArray(accessoryOrders.status, ['pending_payment', 'reserved']),
              sql`${accessoryOrders.preparedAt} IS NULL`,
            ),
          );
        return true;
      });
      if (didRelease) released += 1;
    }
    return released;
  }

}
