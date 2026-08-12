import { and, desc, eq, ilike, inArray, lt, or, sql } from 'drizzle-orm';

import { vehicles } from '@main-modules/vehicles/schemas/vehicles.schema';
import { AppDatabase } from '@shared/db/database.types';

import {
  AccessoryActor,
  AccessoryCursor,
  assertAccessoryIdempotencyFingerprint,
  fingerprintAccessoryPayload,
  stableAccessoryStockLockOrder,
} from '../common/accessories-common';
import {
  accessoryCatalogAudits,
  accessoryCategories,
  accessoryFitmentRules,
  accessoryIdempotencyRecords,
  accessoryInventoryBalances,
  accessoryInventoryMovements,
  accessoryProductMedia,
  accessoryProducts,
  accessoryVariants,
} from '../schemas/accessories.schema';
import { fitmentForVehicle } from './accessories-repository.helpers';

export class AccessoriesCatalogRepository {
  constructor(private readonly db: AppDatabase) {}

  listCategories(includeDraft = false) {
    return this.db
      .select()
      .from(accessoryCategories)
      .where(includeDraft ? undefined : eq(accessoryCategories.status, 'active'))
      .orderBy(accessoryCategories.displayOrder, accessoryCategories.name);
  }


  async listProducts(input: {
    includeDraft: boolean;
    limit: number;
    cursor: AccessoryCursor | null;
    search?: string;
    categoryId?: string;
  }) {
    const conditions = [];
    if (!input.includeDraft) conditions.push(eq(accessoryProducts.status, 'active'));
    if (input.categoryId) conditions.push(eq(accessoryProducts.categoryId, input.categoryId));
    if (input.search) {
      conditions.push(
        or(
          ilike(accessoryProducts.name, `%${input.search}%`),
          ilike(accessoryProducts.description, `%${input.search}%`),
        )!,
      );
    }
    if (input.cursor) {
      const cursorDate = new Date(input.cursor.createdAt);
      conditions.push(
        or(
          lt(accessoryProducts.createdAt, cursorDate),
          and(eq(accessoryProducts.createdAt, cursorDate), lt(accessoryProducts.id, input.cursor.id)),
        )!,
      );
    }

    const rows = await this.db
      .select({
        product: accessoryProducts,
        category: accessoryCategories,
        startingPriceCents: sql<number | null>`(
          select min(v.price_cents)
          from accessory_variants v
          where v.product_id = ${accessoryProducts.id} and v.is_active = true
        )`,
        availableQuantity: sql<number>`coalesce((
          select sum(greatest(
            coalesce(i.on_hand_quantity, 0) - coalesce(i.reserved_quantity, 0),
            0
          ))
          from accessory_variants v
          left join accessory_inventory_balances i on i.variant_id = v.id
          where v.product_id = ${accessoryProducts.id} and v.is_active = true
        ), 0)`,
        mediaId: sql<string | null>`(
          select m.id
          from accessory_product_media m
          where m.product_id = ${accessoryProducts.id}
          order by m.display_order, m.id
          limit 1
        )`,
      })
      .from(accessoryProducts)
      .innerJoin(accessoryCategories, eq(accessoryCategories.id, accessoryProducts.categoryId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(accessoryProducts.createdAt), desc(accessoryProducts.id))
      .limit(input.limit + 1);

    return { rows: rows.slice(0, input.limit), hasMore: rows.length > input.limit };
  }


  async findProductBySlug(slug: string, includeDraft = false) {
    const [row] = await this.db
      .select({ product: accessoryProducts, category: accessoryCategories })
      .from(accessoryProducts)
      .innerJoin(accessoryCategories, eq(accessoryCategories.id, accessoryProducts.categoryId))
      .where(
        and(
          eq(accessoryProducts.slug, slug),
          ...(includeDraft ? [] : [eq(accessoryProducts.status, 'active')]),
        ),
      )
      .limit(1);
    if (!row) return null;
    const [variants, media] = await Promise.all([
      this.db
        .select({ variant: accessoryVariants, inventory: accessoryInventoryBalances })
        .from(accessoryVariants)
        .leftJoin(
          accessoryInventoryBalances,
          eq(accessoryInventoryBalances.variantId, accessoryVariants.id),
        )
        .where(eq(accessoryVariants.productId, row.product.id))
        .orderBy(accessoryVariants.name),
      this.db
        .select()
        .from(accessoryProductMedia)
        .where(eq(accessoryProductMedia.productId, row.product.id))
        .orderBy(accessoryProductMedia.displayOrder),
    ]);
    return { ...row, variants, media };
  }


  async findVariant(id: string, db: AppDatabase = this.db) {
    const [row] = await db
      .select({ variant: accessoryVariants, product: accessoryProducts })
      .from(accessoryVariants)
      .innerJoin(accessoryProducts, eq(accessoryProducts.id, accessoryVariants.productId))
      .where(eq(accessoryVariants.id, id))
      .limit(1);
    return row ?? null;
  }


  async resolveFitment(variantId: string, vehicleId: string, userId: string) {
    const [vehicle] = await this.db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
      .limit(1);
    if (!vehicle) return null;
    const rules = await this.db
      .select()
      .from(accessoryFitmentRules)
      .where(eq(accessoryFitmentRules.variantId, variantId));
    return { vehicle, ...fitmentForVehicle(rules, vehicle) };
  }


  async adjustStock(input: {
    actor: AccessoryActor;
    idempotencyKey: string;
    variantId: string;
    quantityDelta: number;
    reason: string;
  }) {
    const fingerprint = fingerprintAccessoryPayload(input);
    return this.db.transaction(async (tx) => {
      const [claimed] = await tx
        .insert(accessoryIdempotencyRecords)
        .values({
          actorUserId: input.actor.userId,
          scope: 'stock_adjustment',
          key: input.idempotencyKey,
          payloadFingerprint: fingerprint,
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
              eq(accessoryIdempotencyRecords.scope, 'stock_adjustment'),
              eq(accessoryIdempotencyRecords.key, input.idempotencyKey),
            ),
          )
          .limit(1);
        assertAccessoryIdempotencyFingerprint(existing.payloadFingerprint, fingerprint);
        return existing.responseSnapshot;
      }
      await tx.execute(
        sql`select variant_id from accessory_inventory_balances where variant_id = ${input.variantId} for update`,
      );
      const [balance] = await tx
        .select()
        .from(accessoryInventoryBalances)
        .where(eq(accessoryInventoryBalances.variantId, input.variantId))
        .limit(1);
      const onHandQuantity = (balance?.onHandQuantity ?? 0) + input.quantityDelta;
      const reservedQuantity = balance?.reservedQuantity ?? 0;
      if (onHandQuantity < reservedQuantity || onHandQuantity < 0) {
        const response = { stockConflict: true };
        await tx
          .update(accessoryIdempotencyRecords)
          .set({ responseSnapshot: response })
          .where(eq(accessoryIdempotencyRecords.id, claimed.id));
        return response;
      }
      await tx
        .insert(accessoryInventoryBalances)
        .values({ variantId: input.variantId, onHandQuantity, reservedQuantity })
        .onConflictDoUpdate({
          target: accessoryInventoryBalances.variantId,
          set: {
            onHandQuantity,
            version: sql`${accessoryInventoryBalances.version} + 1`,
            updatedAt: new Date(),
          },
        });
      await tx.insert(accessoryInventoryMovements).values({
        variantId: input.variantId,
        movementType: input.quantityDelta >= 0 ? 'stock_in' : 'adjustment',
        quantityDelta: input.quantityDelta,
        resultingOnHand: onHandQuantity,
        resultingReserved: reservedQuantity,
        sourceType: 'admin_adjustment',
        sourceId: claimed.id,
        actorUserId: input.actor.userId,
        reason: input.reason,
      });
      const response = { variantId: input.variantId, onHandQuantity, reservedQuantity };
      await tx
        .update(accessoryIdempotencyRecords)
        .set({ responseSnapshot: response })
        .where(eq(accessoryIdempotencyRecords.id, claimed.id));
      return response;
    });
  }


  async createCategory(input: {
    actor: AccessoryActor;
    slug: string;
    name: string;
    description?: string;
  }) {
    return this.db.transaction(async (tx) => {
      const [category] = await tx
        .insert(accessoryCategories)
        .values({ ...input, createdByUserId: input.actor.userId, updatedByUserId: input.actor.userId })
        .returning();
      await tx.insert(accessoryCatalogAudits).values({
        entityType: 'category',
        entityId: category.id,
        action: 'created',
        actorUserId: input.actor.userId,
        snapshot: category,
      });
      return category;
    });
  }


  async createProduct(input: {
    actor: AccessoryActor;
    categoryId: string;
    slug: string;
    name: string;
    description?: string;
    isLighting?: boolean;
  }) {
    return this.db.transaction(async (tx) => {
      const [product] = await tx
        .insert(accessoryProducts)
        .values({ ...input, createdByUserId: input.actor.userId, updatedByUserId: input.actor.userId })
        .returning();
      await tx.insert(accessoryCatalogAudits).values({
        entityType: 'product',
        entityId: product.id,
        action: 'created',
        actorUserId: input.actor.userId,
        snapshot: product,
      });
      return product;
    });
  }


  async createVariant(input: {
    actor: AccessoryActor;
    productId: string;
    sku: string;
    name: string;
    priceCents: number;
    attributes?: Record<string, string>;
  }) {
    const { actor, ...values } = input;
    return this.db.transaction(async (tx) => {
      const [variant] = await tx.insert(accessoryVariants).values(values).returning();
      await tx
        .insert(accessoryInventoryBalances)
        .values({ variantId: variant.id })
        .onConflictDoNothing();
      await tx.insert(accessoryCatalogAudits).values({
        entityType: 'accessory_variant',
        entityId: variant.id,
        action: 'created',
        actorUserId: actor.userId,
        snapshot: variant,
      });
      return variant;
    });
  }


  async updateVariant(input: {
    actor: AccessoryActor;
    variantId: string;
    version: number;
    name: string;
    priceCents: number;
    attributes?: Record<string, string>;
    isActive?: boolean;
  }) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(accessoryVariants)
        .where(eq(accessoryVariants.id, input.variantId))
        .limit(1);
      if (!current || current.version !== input.version) return null;
      const [updated] = await tx
        .update(accessoryVariants)
        .set({
          name: input.name,
          priceCents: input.priceCents,
          attributes: input.attributes ?? current.attributes,
          isActive: input.isActive ?? current.isActive,
          version: sql`${accessoryVariants.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(accessoryVariants.id, input.variantId),
            eq(accessoryVariants.version, input.version),
          ),
        )
        .returning();
      if (!updated) return null;
      await tx.insert(accessoryCatalogAudits).values({
        entityType: 'accessory_variant',
        entityId: updated.id,
        action: 'updated',
        actorUserId: input.actor.userId,
        snapshot: { before: current, after: updated },
      });
      return updated;
    });
  }


  async listStock(input: { limit: number; cursor: AccessoryCursor | null }) {
    const conditions = [];
    if (input.cursor) {
      const cursorDate = new Date(input.cursor.createdAt);
      conditions.push(
        or(
          lt(accessoryVariants.createdAt, cursorDate),
          and(
            eq(accessoryVariants.createdAt, cursorDate),
            lt(accessoryVariants.id, input.cursor.id),
          ),
        )!,
      );
    }
    const rows = await this.db
      .select({
        variant: accessoryVariants,
        product: accessoryProducts,
        inventory: accessoryInventoryBalances,
      })
      .from(accessoryVariants)
      .innerJoin(accessoryProducts, eq(accessoryProducts.id, accessoryVariants.productId))
      .leftJoin(
        accessoryInventoryBalances,
        eq(accessoryInventoryBalances.variantId, accessoryVariants.id),
      )
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(accessoryVariants.createdAt), desc(accessoryVariants.id))
      .limit(input.limit + 1);
    return { rows: rows.slice(0, input.limit), hasMore: rows.length > input.limit };
  }


  async createFitment(input: {
    actor: AccessoryActor;
    values: typeof accessoryFitmentRules.$inferInsert;
  }) {
    return this.db.transaction(async (tx) => {
      const [rule] = await tx.insert(accessoryFitmentRules).values(input.values).returning();
      await tx.insert(accessoryCatalogAudits).values({
        entityType: 'accessory_fitment',
        entityId: rule.id,
        action: 'created',
        actorUserId: input.actor.userId,
        snapshot: rule,
      });
      return rule;
    });
  }


  async createMedia(input: {
    actor: AccessoryActor;
    values: typeof accessoryProductMedia.$inferInsert;
  }) {
    return this.db.transaction(async (tx) => {
      const [media] = await tx.insert(accessoryProductMedia).values(input.values).returning();
      await tx.insert(accessoryCatalogAudits).values({
        entityType: 'accessory_media',
        entityId: media.id,
        action: 'created',
        actorUserId: input.actor.userId,
        snapshot: media,
      });
      return media;
    });
  }


  async findMedia(id: string, includeDraft = false) {
    const [row] = await this.db
      .select({ media: accessoryProductMedia })
      .from(accessoryProductMedia)
      .innerJoin(accessoryProducts, eq(accessoryProducts.id, accessoryProductMedia.productId))
      .where(
        and(
          eq(accessoryProductMedia.id, id),
          includeDraft ? undefined : eq(accessoryProducts.status, 'active'),
        ),
      )
      .limit(1);
    return row?.media ?? null;
  }


  async reviewLighting(input: {
    actor: AccessoryActor;
    productId: string;
    compatibilityApproved: boolean;
    complianceApproved: boolean;
    reason: string;
  }) {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const [product] = await tx
        .update(accessoryProducts)
        .set({
          compatibilityReviewedAt: input.compatibilityApproved ? now : null,
          compatibilityReviewedByUserId: input.compatibilityApproved ? input.actor.userId : null,
          complianceReviewedAt: input.complianceApproved ? now : null,
          complianceReviewedByUserId: input.complianceApproved ? input.actor.userId : null,
          version: sql`${accessoryProducts.version} + 1`,
          updatedAt: now,
        })
        .where(eq(accessoryProducts.id, input.productId))
        .returning();
      if (product) {
        await tx.insert(accessoryCatalogAudits).values({
          entityType: 'product',
          entityId: product.id,
          action: 'lighting_reviewed',
          actorUserId: input.actor.userId,
          reason: input.reason,
          snapshot: product,
        });
      }
      return product ?? null;
    });
  }


  async publishProduct(input: {
    actor: AccessoryActor;
    productId: string;
    version: number;
    status: 'draft' | 'active' | 'archived';
    reason: string;
  }) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(accessoryProducts)
        .where(eq(accessoryProducts.id, input.productId))
        .limit(1);
      if (!current || current.version !== input.version) return null;
      if (
        input.status === 'active' &&
        current.isLighting &&
        (!current.compatibilityReviewedAt || !current.complianceReviewedAt)
      ) {
        return { lightingReviewRequired: true } as const;
      }
      const [updated] = await tx
        .update(accessoryProducts)
        .set({
          status: input.status,
          version: sql`${accessoryProducts.version} + 1`,
          updatedByUserId: input.actor.userId,
          updatedAt: new Date(),
        })
        .where(
          and(eq(accessoryProducts.id, input.productId), eq(accessoryProducts.version, input.version)),
        )
        .returning();
      if (!updated) return null;
      await tx.insert(accessoryCatalogAudits).values({
        entityType: 'product',
        entityId: updated.id,
        action: `status_${input.status}`,
        actorUserId: input.actor.userId,
        reason: input.reason,
        snapshot: updated,
      });
      return updated;
    });
  }

}
