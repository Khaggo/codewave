import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { AccessoriesRepository } from '@main-modules/accessories/repositories/accessories.repository';
import {
  accessoryCartItems,
  accessoryCarts,
  accessoryCategories,
  accessoryFitmentRules,
  accessoryInventoryBalances,
  accessoryInventoryMovements,
  accessoryInventoryReservations,
  accessoryOrders,
  accessoryOutbox,
  accessoryProducts,
  accessoryVariants,
} from '@main-modules/accessories/schemas/accessories.schema';
import { users } from '@main-modules/users/schemas/users.schema';
import * as schema from '@shared/db/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for the Accessories concurrency smoke.');

const pool = new Pool({ connectionString, connectionTimeoutMillis: 5_000, max: 110 });
const db = drizzle(pool, { schema });
const repository = new AccessoriesRepository(db);

async function runFinalUnitRace(workerCount: number) {
  const marker = `${Date.now()}-${workerCount}-${randomUUID().slice(0, 8)}`;
  const categoryId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const userIds = Array.from({ length: workerCount }, () => randomUUID());
  const cartIds = Array.from({ length: workerCount }, () => randomUUID());
  let orderIds: string[] = [];

  try {
    await db.insert(users).values(
      userIds.map((id, index) => ({
        id,
        email: `accessories-race-${marker}-${index}@autocare.test`,
        role: 'customer' as const,
      })),
    );
    await db.insert(accessoryCategories).values({
      id: categoryId,
      slug: `accessories-race-${marker}`,
      name: `Accessories race ${marker}`,
      status: 'active',
    });
    await db.insert(accessoryProducts).values({
      id: productId,
      categoryId,
      slug: `accessories-race-product-${marker}`,
      name: 'Final-unit race fixture',
      status: 'active',
    });
    await db.insert(accessoryVariants).values({
      id: variantId,
      productId,
      sku: `RACE-${marker}`,
      name: 'Final unit',
      priceCents: 10000,
    });
    await db.insert(accessoryFitmentRules).values({
      variantId,
      status: 'universal',
    });
    await db.insert(accessoryInventoryBalances).values({
      variantId,
      onHandQuantity: 1,
      reservedQuantity: 0,
    });
    await db.insert(accessoryCarts).values(
      cartIds.map((id, index) => ({ id, userId: userIds[index] })),
    );
    await db.insert(accessoryCartItems).values(
      cartIds.map((cartId) => ({ cartId, variantId, quantity: 1 })),
    );

    const results = await Promise.all(
      userIds.map((userId, index) =>
        repository.checkout({
          actor: { userId, role: 'customer' },
          idempotencyKey: `race-${marker}-${index}`,
          paymentMethod: 'pay_at_shop',
          contact: {
            name: `Race customer ${index}`,
            phone: '09000000000',
            email: `accessories-race-${marker}-${index}@autocare.test`,
          },
          acknowledgements: [],
        }),
      ),
    );

    const winners = results.filter((result) => 'orderId' in result);
    const rejected = results.filter((result) => 'outOfStockVariantId' in result);
    assert.equal(winners.length, 1, `${workerCount}-worker race must have exactly one winner.`);
    assert.equal(rejected.length, workerCount - 1, 'Every losing checkout must report out of stock.');

    orderIds = (
      await db
        .select({ id: accessoryOrders.id })
        .from(accessoryOrders)
        .where(inArray(accessoryOrders.userId, userIds))
    ).map((row) => row.id);
    const [balance] = await db
      .select()
      .from(accessoryInventoryBalances)
      .where(eq(accessoryInventoryBalances.variantId, variantId));
    const reservations = await db
      .select()
      .from(accessoryInventoryReservations)
      .where(
        and(
          eq(accessoryInventoryReservations.variantId, variantId),
          eq(accessoryInventoryReservations.status, 'active'),
        ),
      );
    assert.equal(balance.onHandQuantity, 1);
    assert.equal(balance.reservedQuantity, 1);
    assert.equal(reservations.length, 1);
  } finally {
    if (!orderIds.length) {
      orderIds = (
        await db
          .select({ id: accessoryOrders.id })
          .from(accessoryOrders)
          .where(inArray(accessoryOrders.userId, userIds))
      ).map((row) => row.id);
    }
    if (orderIds.length) {
      await db.delete(accessoryOutbox).where(inArray(accessoryOutbox.aggregateId, orderIds));
      await db.delete(accessoryOrders).where(inArray(accessoryOrders.id, orderIds));
    }
    await db
      .delete(accessoryInventoryMovements)
      .where(eq(accessoryInventoryMovements.variantId, variantId));
    await db.delete(accessoryCarts).where(inArray(accessoryCarts.id, cartIds));
    await db.delete(users).where(inArray(users.id, userIds));
    await db.delete(accessoryVariants).where(eq(accessoryVariants.id, variantId));
    await db.delete(accessoryProducts).where(eq(accessoryProducts.id, productId));
    await db.delete(accessoryCategories).where(eq(accessoryCategories.id, categoryId));
  }
}

async function main() {
  try {
    await runFinalUnitRace(2);
    await runFinalUnitRace(100);
    console.log('Accessories concurrency smoke passed: 2-worker and 100-worker final-unit races.');
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
