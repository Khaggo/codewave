import { and, eq, sql } from 'drizzle-orm';

import { vehicles } from '@main-modules/vehicles/schemas/vehicles.schema';
import { AppDatabase } from '@shared/db/database.types';

import { AccessoryActor } from '../common/accessories-common';
import {
  AccessoryContactSnapshot,
  AccessoryFitmentSnapshot,
  AccessoryVehicleSnapshot,
  accessoryFitmentRules,
  accessoryInventoryBalances,
  accessoryInventoryMovements,
  accessoryInventoryReservations,
} from '../schemas/accessories.schema';

export type CheckoutInput = {
  actor: AccessoryActor;
  idempotencyKey: string;
  paymentMethod: 'paymongo' | 'pay_at_shop';
  contact: AccessoryContactSnapshot;
  acknowledgements: Array<{ variantId: string; acknowledgedUnverified: boolean }>;
};

export const fitmentForVehicle = (
  rules: Array<typeof accessoryFitmentRules.$inferSelect>,
  vehicle: typeof vehicles.$inferSelect | null,
): { status: AccessoryFitmentSnapshot['status']; ruleId: string | null } => {
  const universal = rules.find((rule) => rule.status === 'universal');
  if (universal) return { status: 'universal', ruleId: universal.id };
  if (!vehicle) return { status: 'unverified', ruleId: null };

  const normalizedMake = vehicle.make.trim().toLowerCase();
  const normalizedModel = vehicle.model.trim().toLowerCase();
  const matching = rules.filter((rule) => {
    if (rule.make && rule.make.trim().toLowerCase() !== normalizedMake) return false;
    if (rule.model && rule.model.trim().toLowerCase() !== normalizedModel) return false;
    if (rule.yearFrom && vehicle.year < rule.yearFrom) return false;
    if (rule.yearTo && vehicle.year > rule.yearTo) return false;
    return true;
  });
  const incompatible = matching.find((rule) => rule.status === 'incompatible');
  if (incompatible) return { status: 'incompatible', ruleId: incompatible.id };
  const compatible = matching.find((rule) => rule.status === 'compatible');
  if (compatible) return { status: 'compatible', ruleId: compatible.id };
  const unverified = matching.find((rule) => rule.status === 'unverified');
  return { status: 'unverified', ruleId: unverified?.id ?? null };
};

export async function releaseAccessoryReservations(
  orderId: string,
  actorUserId: string | null,
  tx: AppDatabase,
) {
  const reservations = await tx
    .select()
    .from(accessoryInventoryReservations)
    .where(
      and(
        eq(accessoryInventoryReservations.orderId, orderId),
        eq(accessoryInventoryReservations.status, 'active'),
      ),
    );
  for (const reservation of reservations.sort((a, b) => a.variantId.localeCompare(b.variantId))) {
    await tx.execute(
      sql`select variant_id from accessory_inventory_balances where variant_id = ${reservation.variantId} for update`,
    );
    const [balance] = await tx
      .select()
      .from(accessoryInventoryBalances)
      .where(eq(accessoryInventoryBalances.variantId, reservation.variantId))
      .limit(1);
    if (!balance) continue;
    const nextReserved = Math.max(0, balance.reservedQuantity - reservation.quantity);
    await tx
      .update(accessoryInventoryBalances)
      .set({ reservedQuantity: nextReserved, updatedAt: new Date() })
      .where(eq(accessoryInventoryBalances.variantId, reservation.variantId));
    await tx
      .update(accessoryInventoryReservations)
      .set({ status: 'released', releasedAt: new Date() })
      .where(
        and(
          eq(accessoryInventoryReservations.id, reservation.id),
          eq(accessoryInventoryReservations.status, 'active'),
        ),
      );
    await tx.insert(accessoryInventoryMovements).values({
      variantId: reservation.variantId,
      movementType: 'reservation_release',
      quantityDelta: -reservation.quantity,
      resultingOnHand: balance.onHandQuantity,
      resultingReserved: nextReserved,
      sourceType: 'accessory_order',
      sourceId: orderId,
      actorUserId,
    });
  }
}
