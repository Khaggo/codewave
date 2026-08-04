import { and, eq, inArray, sql } from 'drizzle-orm';

import { vehicles } from '@main-modules/vehicles/schemas/vehicles.schema';
import { AppDatabase } from '@shared/db/database.types';

import {
  AccessoryActor,
  assertAccessoryIdempotencyFingerprint,
  createAccessoryReference,
  fingerprintAccessoryPayload,
  generateAccessoryPickupCode,
  hashAccessoryPickupCode,
  stableAccessoryStockLockOrder,
} from '../common/accessories-common';
import {
  AccessoryFitmentSnapshot,
  AccessoryVehicleSnapshot,
  accessoryCartItems,
  accessoryCarts,
  accessoryFitmentRules,
  accessoryFulfillmentHistory,
  accessoryIdempotencyRecords,
  accessoryInventoryBalances,
  accessoryInventoryMovements,
  accessoryInventoryReservations,
  accessoryOrderItems,
  accessoryOrders,
  accessoryOutbox,
  accessoryProducts,
  accessoryVariants,
} from '../schemas/accessories.schema';
import { CheckoutInput, fitmentForVehicle } from './accessories-repository.helpers';

export class AccessoriesCartRepository {
  constructor(private readonly db: AppDatabase) {}

  async getOrCreateCart(userId: string) {
    const [existing] = await this.db
      .select()
      .from(accessoryCarts)
      .where(and(eq(accessoryCarts.userId, userId), eq(accessoryCarts.isActive, true)))
      .limit(1);
    if (existing) return existing;
    const [created] = await this.db.insert(accessoryCarts).values({ userId }).returning();
    return created;
  }


  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.db
      .select({
        item: accessoryCartItems,
        variant: accessoryVariants,
        product: accessoryProducts,
        inventory: accessoryInventoryBalances,
      })
      .from(accessoryCartItems)
      .innerJoin(accessoryVariants, eq(accessoryVariants.id, accessoryCartItems.variantId))
      .innerJoin(accessoryProducts, eq(accessoryProducts.id, accessoryVariants.productId))
      .leftJoin(
        accessoryInventoryBalances,
        eq(accessoryInventoryBalances.variantId, accessoryVariants.id),
      )
      .where(eq(accessoryCartItems.cartId, cart.id))
      .orderBy(accessoryCartItems.createdAt);
    return { ...cart, items };
  }


  async replaceCart(input: {
    userId: string;
    version: number;
    selectedVehicleId?: string | null;
    items: Array<{ variantId: string; quantity: number }>;
  }) {
    return this.db.transaction(async (tx) => {
      const [cart] = await tx
        .select()
        .from(accessoryCarts)
        .where(and(eq(accessoryCarts.userId, input.userId), eq(accessoryCarts.isActive, true)))
        .limit(1);
      if (!cart || cart.version !== input.version) return null;
      if (input.selectedVehicleId) {
        const [ownedVehicle] = await tx
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(
            and(eq(vehicles.id, input.selectedVehicleId), eq(vehicles.userId, input.userId)),
          )
          .limit(1);
        if (!ownedVehicle) return { ownershipConflict: true } as const;
      }
      const variantIds = stableAccessoryStockLockOrder(input.items.map((item) => item.variantId));
      const variants = variantIds.length
        ? await tx
            .select({ id: accessoryVariants.id })
            .from(accessoryVariants)
            .innerJoin(accessoryProducts, eq(accessoryProducts.id, accessoryVariants.productId))
            .where(
              and(
                inArray(accessoryVariants.id, variantIds),
                eq(accessoryVariants.isActive, true),
                eq(accessoryProducts.status, 'active'),
              ),
            )
        : [];
      if (variants.length !== variantIds.length) return { catalogConflict: true } as const;
      await tx.delete(accessoryCartItems).where(eq(accessoryCartItems.cartId, cart.id));
      if (input.items.length) {
        await tx.insert(accessoryCartItems).values(
          input.items.map((item) => ({ cartId: cart.id, ...item })),
        );
      }
      const [updated] = await tx
        .update(accessoryCarts)
        .set({
          selectedVehicleId: input.selectedVehicleId ?? null,
          version: sql`${accessoryCarts.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(accessoryCarts.id, cart.id), eq(accessoryCarts.version, input.version)))
        .returning();
      return updated ?? null;
    });
  }


  async patchCartItem(input: {
    userId: string;
    version: number;
    variantId: string;
    quantity: number;
  }) {
    const current = await this.getCart(input.userId);
    const items = current.items
      .filter(({ item }) => item.variantId !== input.variantId)
      .map(({ item }) => ({ variantId: item.variantId, quantity: item.quantity }));
    items.push({ variantId: input.variantId, quantity: input.quantity });
    return this.replaceCart({
      userId: input.userId,
      version: input.version,
      selectedVehicleId: current.selectedVehicleId,
      items,
    });
  }


  async deleteCartItem(input: { userId: string; version: number; variantId?: string }) {
    const current = await this.getCart(input.userId);
    const items = input.variantId
      ? current.items
          .filter(({ item }) => item.variantId !== input.variantId)
          .map(({ item }) => ({ variantId: item.variantId, quantity: item.quantity }))
      : [];
    return this.replaceCart({
      userId: input.userId,
      version: input.version,
      selectedVehicleId: current.selectedVehicleId,
      items,
    });
  }


  async checkout(input: CheckoutInput) {
    const payloadFingerprint = fingerprintAccessoryPayload({
      paymentMethod: input.paymentMethod,
      contact: input.contact,
      acknowledgements: input.acknowledgements,
    });

    return this.db.transaction(async (tx) => {
      const [claimed] = await tx
        .insert(accessoryIdempotencyRecords)
        .values({
          actorUserId: input.actor.userId,
          scope: 'checkout',
          key: input.idempotencyKey,
          payloadFingerprint,
        })
        .onConflictDoNothing()
        .returning();
      if (!claimed) {
        const [existing] = await tx
          .select()
          .from(accessoryIdempotencyRecords)
          .where(
            and(
              eq(accessoryIdempotencyRecords.actorUserId, input.actor.userId),
              eq(accessoryIdempotencyRecords.scope, 'checkout'),
              eq(accessoryIdempotencyRecords.key, input.idempotencyKey),
            ),
          )
          .limit(1);
        assertAccessoryIdempotencyFingerprint(existing.payloadFingerprint, payloadFingerprint);
        if (existing.resourceId) return { replayOrderId: existing.resourceId } as const;
        return { inProgress: true } as const;
      }
      const rejectCheckout = async <T extends Record<string, unknown>>(result: T): Promise<T> => {
        await tx
          .delete(accessoryIdempotencyRecords)
          .where(eq(accessoryIdempotencyRecords.id, claimed.id));
        return result;
      };

      const [cart] = await tx
        .select()
        .from(accessoryCarts)
        .where(and(eq(accessoryCarts.userId, input.actor.userId), eq(accessoryCarts.isActive, true)))
        .limit(1);
      if (!cart) return rejectCheckout({ emptyCart: true } as const);
      await tx.execute(sql`select id from accessory_carts where id = ${cart.id} for update`);
      const [lockedCart] = await tx
        .select()
        .from(accessoryCarts)
        .where(and(eq(accessoryCarts.id, cart.id), eq(accessoryCarts.isActive, true)))
        .limit(1);
      if (!lockedCart) return rejectCheckout({ emptyCart: true } as const);
      const cartItems = await tx
        .select({ item: accessoryCartItems, variant: accessoryVariants, product: accessoryProducts })
        .from(accessoryCartItems)
        .innerJoin(accessoryVariants, eq(accessoryVariants.id, accessoryCartItems.variantId))
        .innerJoin(accessoryProducts, eq(accessoryProducts.id, accessoryVariants.productId))
        .where(eq(accessoryCartItems.cartId, cart.id));
      if (!cartItems.length) return rejectCheckout({ emptyCart: true } as const);

      const vehicle = lockedCart.selectedVehicleId
        ? (
            await tx
              .select()
              .from(vehicles)
              .where(
                and(eq(vehicles.id, lockedCart.selectedVehicleId), eq(vehicles.userId, input.actor.userId)),
              )
              .limit(1)
          )[0] ?? null
        : null;
      if (lockedCart.selectedVehicleId && !vehicle) {
        return rejectCheckout({ ownershipConflict: true } as const);
      }

      const variantIds = stableAccessoryStockLockOrder(
        cartItems.map(({ variant }) => variant.id),
      );
      const rules = await tx
        .select()
        .from(accessoryFitmentRules)
        .where(inArray(accessoryFitmentRules.variantId, variantIds));
      const acknowledgements = new Map(
        input.acknowledgements.map((item) => [item.variantId, item.acknowledgedUnverified]),
      );
      const fitments = new Map<string, AccessoryFitmentSnapshot>();
      for (const { variant, product } of cartItems) {
        if (!variant.isActive || product.status !== 'active') {
          return rejectCheckout({ catalogConflict: true } as const);
        }
        const result = fitmentForVehicle(
          rules.filter((rule) => rule.variantId === variant.id),
          vehicle,
        );
        if (result.status === 'incompatible') {
          return rejectCheckout({ incompatibleVariantId: variant.id } as const);
        }
        const acknowledgedUnverified = acknowledgements.get(variant.id) === true;
        if (result.status === 'unverified' && !acknowledgedUnverified) {
          return rejectCheckout({ acknowledgementRequiredVariantId: variant.id } as const);
        }
        fitments.set(variant.id, { ...result, acknowledgedUnverified });
      }

      const balances = new Map<string, typeof accessoryInventoryBalances.$inferSelect>();
      for (const variantId of variantIds) {
        await tx.execute(
          sql`select variant_id from accessory_inventory_balances where variant_id = ${variantId} for update`,
        );
        const [balance] = await tx
          .select()
          .from(accessoryInventoryBalances)
          .where(eq(accessoryInventoryBalances.variantId, variantId))
          .limit(1);
        if (!balance) return rejectCheckout({ outOfStockVariantId: variantId } as const);
        balances.set(variantId, balance);
      }
      for (const { item } of cartItems) {
        const balance = balances.get(item.variantId)!;
        if (balance.onHandQuantity - balance.reservedQuantity < item.quantity) {
          return rejectCheckout({ outOfStockVariantId: item.variantId } as const);
        }
      }

      const subtotalCents = cartItems.reduce(
        (total, { item, variant }) => total + item.quantity * variant.priceCents,
        0,
      );
      const expiresAt = new Date(
        Date.now() + (input.paymentMethod === 'paymongo' ? 15 * 60_000 : 24 * 60 * 60_000),
      );
      const vehicleSnapshot: AccessoryVehicleSnapshot | null = vehicle
        ? {
            vehicleId: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            plateNumber: vehicle.plateNumber,
          }
        : null;
      const [order] = await tx
        .insert(accessoryOrders)
        .values({
          orderReference: createAccessoryReference(),
          userId: input.actor.userId,
          selectedVehicleId: vehicle?.id ?? null,
          status: input.paymentMethod === 'paymongo' ? 'pending_payment' : 'reserved',
          paymentMethod: input.paymentMethod,
          subtotalCents,
          totalCents: subtotalCents,
          contactSnapshot: input.contact,
          vehicleSnapshot,
          reservationExpiresAt: expiresAt,
        })
        .returning();
      const pickupCode = generateAccessoryPickupCode();
      await tx
        .update(accessoryOrders)
        .set({ pickupCodeHash: hashAccessoryPickupCode(order.id, pickupCode) })
        .where(eq(accessoryOrders.id, order.id));

      await tx.insert(accessoryOrderItems).values(
        cartItems.map(({ item, variant, product }) => ({
          orderId: order.id,
          variantId: variant.id,
          skuSnapshot: variant.sku,
          productNameSnapshot: product.name,
          variantNameSnapshot: variant.name,
          unitPriceCents: variant.priceCents,
          quantity: item.quantity,
          lineTotalCents: item.quantity * variant.priceCents,
          fitmentSnapshot: fitments.get(variant.id)!,
        })),
      );
      await tx.insert(accessoryInventoryReservations).values(
        cartItems.map(({ item }) => ({
          orderId: order.id,
          variantId: item.variantId,
          quantity: item.quantity,
          expiresAt,
        })),
      );
      for (const { item } of cartItems) {
        const balance = balances.get(item.variantId)!;
        const nextReserved = balance.reservedQuantity + item.quantity;
        await tx
          .update(accessoryInventoryBalances)
          .set({
            reservedQuantity: nextReserved,
            version: sql`${accessoryInventoryBalances.version} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(accessoryInventoryBalances.variantId, item.variantId));
        await tx.insert(accessoryInventoryMovements).values({
          variantId: item.variantId,
          movementType: 'reservation',
          quantityDelta: item.quantity,
          resultingOnHand: balance.onHandQuantity,
          resultingReserved: nextReserved,
          sourceType: 'accessory_order',
          sourceId: order.id,
          actorUserId: input.actor.userId,
        });
      }
      await tx
        .update(accessoryCarts)
        .set({ isActive: false, version: sql`${accessoryCarts.version} + 1`, updatedAt: new Date() })
        .where(eq(accessoryCarts.id, cart.id));
      await tx.insert(accessoryFulfillmentHistory).values({
        orderId: order.id,
        nextStatus: order.status,
        actorUserId: input.actor.userId,
        reason: 'Customer checkout',
      });
      await tx.insert(accessoryOutbox).values({
        eventType: 'accessory.order.created',
        aggregateType: 'accessory_order',
        aggregateId: order.id,
        payload: { orderId: order.id, userId: order.userId, orderReference: order.orderReference },
      });
      await tx
        .update(accessoryIdempotencyRecords)
        .set({
          resourceType: 'accessory_order',
          resourceId: order.id,
          responseSnapshot: { orderId: order.id, orderReference: order.orderReference },
        })
        .where(eq(accessoryIdempotencyRecords.id, claimed.id));
      return { orderId: order.id, pickupCode } as const;
    });
  }

}

