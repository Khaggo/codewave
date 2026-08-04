import { and, desc, eq, lt, or, sql } from 'drizzle-orm';

import { AppDatabase } from '@shared/db/database.types';

import { AccessoryCursor } from '../common/accessories-common';
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

export const isAccessoryPaymentSettlementEligibleStatus = (status: string) =>
  status === 'pending_payment' || status === 'expired';

export class AccessoriesPaymentsRepository {
  constructor(private readonly db: AppDatabase) {}

  async createPaymentAttempt(input: {
    orderId: string;
    amountCents: number;
    currencyCode: string;
    providerCheckoutId?: string;
    checkoutUrl?: string;
    expiresAt?: Date;
    failureReason?: string;
  }) {
    const [attempt] = await this.db
      .insert(accessoryPaymentAttempts)
      .values({
        ...input,
        status: input.failureReason ? 'failed' : 'pending',
      })
      .returning();
    return attempt;
  }


  async markOrderPaid(input: {
    orderId: string;
    providerPaymentId?: string;
    amountCents: number;
    currencyCode: string;
  }) {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select id from accessory_orders where id = ${input.orderId} for update`);
      const [order] = await tx
        .select()
        .from(accessoryOrders)
        .where(eq(accessoryOrders.id, input.orderId))
        .limit(1);
      if (!order) return { missing: true } as const;
      if (order.totalCents !== input.amountCents || order.currencyCode !== input.currencyCode) {
        return { amountMismatch: true } as const;
      }
      if (order.paymentStatus === 'paid') return { order, replay: true } as const;
      if (order.paymentStatus === 'exception') {
        return { order, replay: true, stockConflict: true } as const;
      }

      const recordPaymentException = async (reason: string) => {
        await tx
          .update(accessoryOrders)
          .set({
            status: 'payment_exception',
            paymentStatus: 'exception',
            version: sql`${accessoryOrders.version} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(accessoryOrders.id, order.id));
        await tx
          .insert(accessoryRefunds)
          .values({
            orderId: order.id,
            amountCents: order.totalCents,
            currencyCode: order.currencyCode,
            reason,
          })
          .onConflictDoNothing();
        await tx
          .update(accessoryPaymentAttempts)
          .set({
            status: 'paid',
            providerPaymentId: input.providerPaymentId,
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(accessoryPaymentAttempts.orderId, order.id));
        await tx.insert(accessoryOutbox).values({
          eventType: 'accessory.payment.exception',
          aggregateType: 'accessory_order',
          aggregateId: order.id,
          payload: { orderId: order.id, userId: order.userId, orderReference: order.orderReference },
        });
        return { stockConflict: true, paymentException: true } as const;
      };

      if (!isAccessoryPaymentSettlementEligibleStatus(order.status)) {
        return recordPaymentException(
          `Payment arrived after the order entered ${order.status}; fulfillment was not resumed.`,
        );
      }

      const orderItems = await tx
        .select()
        .from(accessoryOrderItems)
        .where(eq(accessoryOrderItems.orderId, order.id));
      const reservations = await tx
        .select()
        .from(accessoryInventoryReservations)
        .where(eq(accessoryInventoryReservations.orderId, order.id));
      const reservationByVariant = new Map(
        reservations.map((reservation) => [reservation.variantId, reservation]),
      );

      for (const item of [...orderItems].sort((a, b) =>
        String(a.variantId).localeCompare(String(b.variantId)),
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
        if (!balance) return { stockConflict: true } as const;
        const reservation = reservationByVariant.get(item.variantId);
        const hasActiveReservation = reservation?.status === 'active';
        const available = balance.onHandQuantity - balance.reservedQuantity;
        if (!hasActiveReservation && available < item.quantity) {
          return recordPaymentException('Late payment arrived after stock reservation expired.');
        }
      }

      for (const item of orderItems) {
        if (!item.variantId) continue;
        const [balance] = await tx
          .select()
          .from(accessoryInventoryBalances)
          .where(eq(accessoryInventoryBalances.variantId, item.variantId))
          .limit(1);
        const reservation = reservationByVariant.get(item.variantId);
        const hasActiveReservation = reservation?.status === 'active';
        const nextOnHand = balance.onHandQuantity - item.quantity;
        const nextReserved = hasActiveReservation
          ? balance.reservedQuantity - item.quantity
          : balance.reservedQuantity;
        await tx
          .update(accessoryInventoryBalances)
          .set({
            onHandQuantity: nextOnHand,
            reservedQuantity: nextReserved,
            version: sql`${accessoryInventoryBalances.version} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(accessoryInventoryBalances.variantId, item.variantId));
        if (hasActiveReservation) {
          await tx
            .update(accessoryInventoryReservations)
            .set({ status: 'consumed', consumedAt: new Date() })
            .where(
              and(
                eq(accessoryInventoryReservations.id, reservation.id),
                eq(accessoryInventoryReservations.status, 'active'),
              ),
            );
        }
        await tx.insert(accessoryInventoryMovements).values({
          variantId: item.variantId,
          movementType: 'sale',
          quantityDelta: -item.quantity,
          resultingOnHand: nextOnHand,
          resultingReserved: nextReserved,
          sourceType: 'accessory_order',
          sourceId: order.id,
        });
      }

      const [updated] = await tx
        .update(accessoryOrders)
        .set({
          status: 'paid',
          paymentStatus: 'paid',
          version: sql`${accessoryOrders.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(accessoryOrders.id, order.id))
        .returning();
      await tx
        .update(accessoryPaymentAttempts)
        .set({
          status: 'paid',
          providerPaymentId: input.providerPaymentId,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(accessoryPaymentAttempts.orderId, order.id));
      await tx.insert(accessoryFulfillmentHistory).values({
        orderId: order.id,
        previousStatus: order.status,
        nextStatus: updated.status,
        reason: 'Payment confirmed',
      });
      await tx.insert(accessoryOutbox).values({
        eventType: 'accessory.payment.paid',
        aggregateType: 'accessory_order',
        aggregateId: order.id,
        payload: { orderId: order.id, userId: order.userId, orderReference: order.orderReference },
      });
      return { order: updated } as const;
    });
  }


  async claimRefund(refundId: string, now = new Date()) {
    const staleProcessingCutoff = new Date(now.getTime() - 5 * 60_000);
    const [refund] = await this.db
      .update(accessoryRefunds)
      .set({ status: 'processing', updatedAt: now })
      .where(
        and(
          eq(accessoryRefunds.id, refundId),
          or(
            eq(accessoryRefunds.status, 'requested'),
            and(
              eq(accessoryRefunds.status, 'processing'),
              lt(accessoryRefunds.updatedAt, staleProcessingCutoff),
            ),
          ),
        ),
      )
      .returning();
    return refund ?? null;
  }

  async releaseRefundClaim(refundId: string) {
    await this.db
      .update(accessoryRefunds)
      .set({ status: 'requested', updatedAt: new Date() })
      .where(
        and(
          eq(accessoryRefunds.id, refundId),
          eq(accessoryRefunds.status, 'processing'),
        ),
      );
  }

  async completeRefund(input: {
    refundId: string;
    actorUserId: string;
    providerRefundId: string;
  }) {
    return this.db.transaction(async (tx) => {
      const [refund] = await tx
        .update(accessoryRefunds)
        .set({
          status: 'completed',
          approvedByUserId: input.actorUserId,
          providerRefundId: input.providerRefundId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(accessoryRefunds.id, input.refundId),
            eq(accessoryRefunds.status, 'processing'),
          ),
        )
        .returning();
      if (!refund) return null;
      await tx
        .update(accessoryOrders)
        .set({
          status: 'refunded',
          paymentStatus: 'refunded',
          version: sql`${accessoryOrders.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(accessoryOrders.id, refund.orderId));
      await tx.insert(accessoryOutbox).values({
        eventType: 'accessory.refund.completed',
        aggregateType: 'accessory_order',
        aggregateId: refund.orderId,
        payload: { orderId: refund.orderId, refundId: refund.id },
      });
      return refund;
    });
  }


  async listRefunds(input: { limit: number; cursor: AccessoryCursor | null }) {
    const rows = await this.db
      .select()
      .from(accessoryRefunds)
      .where(
        input.cursor
          ? or(
              lt(accessoryRefunds.createdAt, new Date(input.cursor.createdAt)),
              and(
                eq(accessoryRefunds.createdAt, new Date(input.cursor.createdAt)),
                lt(accessoryRefunds.id, input.cursor.id),
              ),
            )
          : undefined,
      )
      .orderBy(desc(accessoryRefunds.createdAt), desc(accessoryRefunds.id))
      .limit(input.limit + 1);
    return { rows: rows.slice(0, input.limit), hasMore: rows.length > input.limit };
  }


  async findRefund(id: string) {
    const [refund] = await this.db
      .select()
      .from(accessoryRefunds)
      .where(eq(accessoryRefunds.id, id))
      .limit(1);
    return refund ?? null;
  }

}
