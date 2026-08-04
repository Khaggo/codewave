import { Inject, Injectable } from '@nestjs/common';

import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { AccessoryActor, AccessoryCursor } from '../common/accessories-common';
import {
  accessoryFitmentRules,
  accessoryOrders,
  accessoryPaymentEvents,
  accessoryProductMedia,
} from '../schemas/accessories.schema';
import { AccessoriesCatalogRepository } from './accessories-catalog.repository';
import { AccessoriesCartRepository } from './accessories-cart.repository';
import { AccessoriesOperationsRepository } from './accessories-operations.repository';
import { AccessoriesOrdersRepository } from './accessories-orders.repository';
import { AccessoriesPaymentsRepository } from './accessories-payments.repository';
import { CheckoutInput } from './accessories-repository.helpers';

@Injectable()
export class AccessoriesRepository {
  private readonly catalog: AccessoriesCatalogRepository;
  private readonly cart: AccessoriesCartRepository;
  private readonly orders: AccessoriesOrdersRepository;
  private readonly payments: AccessoriesPaymentsRepository;
  private readonly operations: AccessoriesOperationsRepository;

  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    this.catalog = new AccessoriesCatalogRepository(db);
    this.cart = new AccessoriesCartRepository(db);
    this.orders = new AccessoriesOrdersRepository(db);
    this.payments = new AccessoriesPaymentsRepository(db);
    this.operations = new AccessoriesOperationsRepository(db);
  }

  listCategories(includeDraft = false) {
    return this.catalog.listCategories(includeDraft);
  }

  async listProducts(input: {
    includeDraft: boolean;
    limit: number;
    cursor: AccessoryCursor | null;
    search?: string;
    categoryId?: string;
  }) {
    return this.catalog.listProducts(input);
  }

  async findProductBySlug(slug: string, includeDraft = false) {
    return this.catalog.findProductBySlug(slug, includeDraft);
  }

  async findVariant(id: string, db: AppDatabase = this.db) {
    return this.catalog.findVariant(id, db);
  }

  async resolveFitment(variantId: string, vehicleId: string, userId: string) {
    return this.catalog.resolveFitment(variantId, vehicleId, userId);
  }

  async getOrCreateCart(userId: string) {
    return this.cart.getOrCreateCart(userId);
  }

  async getCart(userId: string) {
    return this.cart.getCart(userId);
  }

  async replaceCart(input: {
    userId: string;
    version: number;
    selectedVehicleId?: string | null;
    items: Array<{ variantId: string; quantity: number }>;
  }) {
    return this.cart.replaceCart(input);
  }

  async patchCartItem(input: {
    userId: string;
    version: number;
    variantId: string;
    quantity: number;
  }) {
    return this.cart.patchCartItem(input);
  }

  async deleteCartItem(input: { userId: string; version: number; variantId?: string }) {
    return this.cart.deleteCartItem(input);
  }

  async checkout(input: CheckoutInput) {
    return this.cart.checkout(input);
  }

  async findOrder(id: string) {
    return this.orders.findOrder(id);
  }

  async findAssignableStaff(userId: string) {
    return this.orders.findAssignableStaff(userId);
  }

  async listOrders(input: {
    userId?: string;
    status?: typeof accessoryOrders.$inferSelect.status;
    limit: number;
    cursor: AccessoryCursor | null;
  }) {
    return this.orders.listOrders(input);
  }

  async adjustStock(input: {
    actor: AccessoryActor;
    idempotencyKey: string;
    variantId: string;
    quantityDelta: number;
    reason: string;
  }) {
    return this.catalog.adjustStock(input);
  }

  async createCategory(input: {
    actor: AccessoryActor;
    slug: string;
    name: string;
    description?: string;
  }) {
    return this.catalog.createCategory(input);
  }

  async createProduct(input: {
    actor: AccessoryActor;
    categoryId: string;
    slug: string;
    name: string;
    description?: string;
    isLighting?: boolean;
  }) {
    return this.catalog.createProduct(input);
  }

  async createVariant(input: {
    actor: AccessoryActor;
    productId: string;
    sku: string;
    name: string;
    priceCents: number;
    attributes?: Record<string, string>;
  }) {
    return this.catalog.createVariant(input);
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
    return this.catalog.updateVariant(input);
  }

  async listStock(input: { limit: number; cursor: AccessoryCursor | null }) {
    return this.catalog.listStock(input);
  }

  async createFitment(input: {
    actor: AccessoryActor;
    values: typeof accessoryFitmentRules.$inferInsert;
  }) {
    return this.catalog.createFitment(input);
  }

  async createMedia(input: {
    actor: AccessoryActor;
    values: typeof accessoryProductMedia.$inferInsert;
  }) {
    return this.catalog.createMedia(input);
  }

  async findMedia(id: string, includeDraft = false) {
    return this.catalog.findMedia(id, includeDraft);
  }

  async reviewLighting(input: {
    actor: AccessoryActor;
    productId: string;
    compatibilityApproved: boolean;
    complianceApproved: boolean;
    reason: string;
  }) {
    return this.catalog.reviewLighting(input);
  }

  async publishProduct(input: {
    actor: AccessoryActor;
    productId: string;
    version: number;
    status: 'draft' | 'active' | 'archived';
    reason: string;
  }) {
    return this.catalog.publishProduct(input);
  }

  async takeOrder(orderId: string, actor: AccessoryActor, expectedVersion: number) {
    return this.orders.takeOrder(orderId, actor, expectedVersion);
  }

  async reassignOrder(input: {
    actor: AccessoryActor;
    orderId: string;
    expectedVersion: number;
    assigneeUserId: string;
    reason: string;
  }) {
    return this.orders.reassignOrder(input);
  }

  async transitionOrder(input: {
    actor: AccessoryActor;
    orderId: string;
    expectedVersion: number;
    status: 'preparing' | 'ready_for_pickup' | 'collected';
    reason?: string;
  }) {
    return this.orders.transitionOrder(input);
  }

  async cancelOrder(input: {
    actor: AccessoryActor;
    orderId: string;
    reason: string;
    force?: boolean;
  }) {
    return this.orders.cancelOrder(input);
  }

  async regeneratePickupCode(orderId: string) {
    return this.orders.regeneratePickupCode(orderId);
  }

  async recordPickupFailure(orderId: string, lockUntil: Date | null) {
    return this.orders.recordPickupFailure(orderId, lockUntil);
  }

  async releaseExpiredReservations(now = new Date()) {
    return this.orders.releaseExpiredReservations(now);
  }

  async createPaymentAttempt(input: {
    orderId: string;
    amountCents: number;
    currencyCode: string;
    providerCheckoutId?: string;
    checkoutUrl?: string;
    expiresAt?: Date;
    failureReason?: string;
  }) {
    return this.payments.createPaymentAttempt(input);
  }

  async markOrderPaid(input: {
    orderId: string;
    providerPaymentId?: string;
    amountCents: number;
    currencyCode: string;
  }) {
    return this.payments.markOrderPaid(input);
  }

  async completeRefund(input: {
    refundId: string;
    actorUserId: string;
    providerRefundId: string;
  }) {
    return this.payments.completeRefund(input);
  }

  async claimRefund(refundId: string) {
    return this.payments.claimRefund(refundId);
  }

  async releaseRefundClaim(refundId: string) {
    return this.payments.releaseRefundClaim(refundId);
  }

  async listRefunds(input: { limit: number; cursor: AccessoryCursor | null }) {
    return this.payments.listRefunds(input);
  }

  async findRefund(id: string) {
    return this.payments.findRefund(id);
  }

  async claimIdempotency(input: {
    actorUserId: string | null;
    scope: string;
    key: string;
    payload: unknown;
  }) {
    return this.operations.claimIdempotency(input);
  }

  async completeIdempotency(
    id: string,
    responseSnapshot: Record<string, unknown>,
    resource?: { type: string; id: string },
  ) {
    return this.operations.completeIdempotency(id, responseSnapshot, resource);
  }

  async releaseIncompleteIdempotency(id: string) {
    return this.operations.releaseIncompleteIdempotency(id);
  }

  async insertPaymentEvent(input: typeof accessoryPaymentEvents.$inferInsert) {
    return this.operations.insertPaymentEvent(input);
  }

  async claimOutboxBatch(limit = 25) {
    return this.operations.claimOutboxBatch(limit);
  }

  async markOutboxSent(id: string) {
    return this.operations.markOutboxSent(id);
  }

  async markOutboxFailed(id: string, error: string) {
    return this.operations.markOutboxFailed(id, error);
  }
}
