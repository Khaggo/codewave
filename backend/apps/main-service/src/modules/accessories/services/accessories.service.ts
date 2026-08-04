import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  isAccessoryFulfillmentClaimableStatus,
  AccessoryActor,
  accessoryError,
  assertAccessoryAdmin,
  assertAccessoryOwner,
  assertAccessoryStaff,
  decodeAccessoryCursor,
  encodeAccessoryCursor,
  normalizeAccessoryPageSize,
  parseAccessoryVersion,
  requireIdempotencyKey,
  verifyAccessoryPickupCode,
} from '../common/accessories-common';
import { AccessoriesFeatureService } from '../common/accessories-feature.service';
import {
  AccessoryCheckoutDto,
  AccessoryFitmentQueryDto,
  AccessoryPageQueryDto,
  AccessoryProductPageQueryDto,
  AdjustAccessoryStockDto,
  CancelAccessoryOrderDto,
  CreateAccessoryCategoryDto,
  CreateAccessoryFitmentDto,
  CreateAccessoryProductDto,
  CreateAccessoryVariantDto,
  PatchAccessoryCartDto,
  PublishAccessoryProductDto,
  ReassignAccessoryOrderDto,
  ReplaceAccessoryCartDto,
  ReviewAccessoryLightingDto,
  TransitionAccessoryOrderDto,
  UpdateAccessoryVariantDto,
} from '../dto/accessories.dto';
import { AccessoriesRepository } from '../repositories/accessories.repository';
import { AccessoriesPaymentService } from './accessories-payment.service';

const customerCategory = (category: Record<string, any>) => ({
  id: category.id,
  slug: category.slug,
  name: category.name,
  description: category.description,
  displayOrder: category.displayOrder,
});

const customerProduct = (product: Record<string, any>) => ({
  id: product.id,
  categoryId: product.categoryId,
  slug: product.slug,
  name: product.name,
  description: product.description,
  isLighting: product.isLighting,
});

const customerVariant = (variant: Record<string, any>) => ({
  id: variant.id,
  productId: variant.productId,
  sku: variant.sku,
  name: variant.name,
  attributes: variant.attributes,
  priceCents: variant.priceCents,
  currencyCode: variant.currencyCode,
});

const customerOrderSummary = (order: Record<string, any>) => ({
  id: order.id,
  orderReference: order.orderReference,
  status: order.status,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  currencyCode: order.currencyCode,
  subtotalCents: order.subtotalCents,
  totalCents: order.totalCents,
  contact: order.contactSnapshot,
  vehicle: order.vehicleSnapshot,
  reservationExpiresAt: order.reservationExpiresAt,
  preparedAt: order.preparedAt,
  readyAt: order.readyAt,
  collectedAt: order.collectedAt,
  cancelledAt: order.cancelledAt,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  version: order.version,
});

@Injectable()
export class AccessoriesService {
  constructor(
    private readonly feature: AccessoriesFeatureService,
    private readonly repository: AccessoriesRepository,
    private readonly payments: AccessoriesPaymentService,
  ) {}

  capabilities() {
    return this.feature.capabilities();
  }

  listCategories(actor: AccessoryActor, admin = false) {
    this.feature.requireCatalog(actor.role);
    const includeDraft = admin && actor.role === 'super_admin';
    const result = this.repository.listCategories(includeDraft);
    return includeDraft ? result : result.then((rows) => rows.map(customerCategory));
  }

  async listProducts(query: AccessoryProductPageQueryDto, actor: AccessoryActor, admin = false) {
    this.feature.requireCatalog(actor.role);
    const limit = normalizeAccessoryPageSize(query.limit);
    const page = await this.repository.listProducts({
      includeDraft: admin && actor.role === 'super_admin',
      limit,
      cursor: decodeAccessoryCursor(query.cursor),
      search: query.search?.trim(),
      categoryId: query.categoryId,
    });
    const last = page.rows[page.rows.length - 1]?.product;
    return {
      items: admin
        ? page.rows
        : page.rows.map((row) => ({
            product: customerProduct(row.product),
            category: customerCategory(row.category),
            startingPriceCents: row.startingPriceCents,
            media: row.mediaId ? [{ id: row.mediaId, altText: row.product.name }] : [],
          })),
      nextCursor:
        page.hasMore && last
          ? encodeAccessoryCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async getProduct(slug: string, actor: AccessoryActor, admin = false) {
    this.feature.requireCatalog(actor.role);
    const product = await this.repository.findProductBySlug(
      slug,
      admin && actor.role === 'super_admin',
    );
    if (!product) {
      throw new NotFoundException(
        accessoryError('ACCESSORY_PRODUCT_NOT_FOUND', 'Accessory product not found.'),
      );
    }
    if (admin) return product;
    return {
      product: customerProduct(product.product),
      category: customerCategory(product.category),
      variants: product.variants
        .filter((row) => row.variant.isActive)
        .map((row) => ({
          variant: customerVariant(row.variant),
          inventory: {
            availableQuantity: Math.max(
              0,
              Number(row.inventory?.onHandQuantity ?? 0) -
                Number(row.inventory?.reservedQuantity ?? 0),
            ),
          },
        })),
      media: product.media.map((media) => ({
        id: media.id,
        altText: media.altText,
        displayOrder: media.displayOrder,
        mimeType: media.mimeType,
      })),
    };
  }

  async getFitment(variantId: string, query: AccessoryFitmentQueryDto, actor: AccessoryActor) {
    this.feature.requireCatalog(actor.role);
    const fitment = await this.repository.resolveFitment(variantId, query.vehicleId, actor.userId);
    if (!fitment) {
      throw new NotFoundException(
        accessoryError('ACCESSORY_VEHICLE_NOT_FOUND', 'Owned vehicle not found.'),
      );
    }
    return fitment;
  }

  async getCart(actor: AccessoryActor) {
    this.feature.requireCatalog(actor.role);
    return this.toCustomerCart(await this.repository.getCart(actor.userId));
  }

  async replaceCart(
    payload: ReplaceAccessoryCartDto,
    rawVersion: string | undefined,
    actor: AccessoryActor,
  ) {
    this.feature.requireCatalog(actor.role);
    const result = await this.repository.replaceCart({
      userId: actor.userId,
      version: parseAccessoryVersion(rawVersion),
      selectedVehicleId: payload.selectedVehicleId,
      items: payload.items,
    });
    this.assertCartResult(result);
    return this.toCustomerCart(await this.repository.getCart(actor.userId));
  }

  async patchCart(
    payload: PatchAccessoryCartDto,
    rawVersion: string | undefined,
    actor: AccessoryActor,
  ) {
    this.feature.requireCatalog(actor.role);
    const result = await this.repository.patchCartItem({
      userId: actor.userId,
      version: parseAccessoryVersion(rawVersion),
      variantId: payload.variantId,
      quantity: payload.quantity,
    });
    this.assertCartResult(result);
    return this.toCustomerCart(await this.repository.getCart(actor.userId));
  }

  async deleteCart(
    variantId: string | undefined,
    rawVersion: string | undefined,
    actor: AccessoryActor,
  ) {
    this.feature.requireCatalog(actor.role);
    const result = await this.repository.deleteCartItem({
      userId: actor.userId,
      version: parseAccessoryVersion(rawVersion),
      variantId,
    });
    this.assertCartResult(result);
    return this.toCustomerCart(await this.repository.getCart(actor.userId));
  }

  async previewCheckout(payload: AccessoryCheckoutDto, actor: AccessoryActor) {
    this.feature.requireOrdering();
    const cart = await this.repository.getCart(actor.userId);
    if (!cart.items.length) {
      throw new ConflictException(accessoryError('ACCESSORY_CART_EMPTY', 'The cart is empty.'));
    }
    const subtotalCents = cart.items.reduce(
      (total, { item, variant }) => total + item.quantity * variant.priceCents,
      0,
    );
    return {
      currencyCode: 'PHP',
      subtotalCents,
      totalCents: subtotalCents,
      paymentMethod: payload.paymentMethod,
      reservationMinutes: payload.paymentMethod === 'paymongo' ? 15 : 24 * 60,
      pickupOnly: true,
      cartVersion: cart.version,
    };
  }

  async checkout(
    payload: AccessoryCheckoutDto,
    rawIdempotencyKey: string | undefined,
    actor: AccessoryActor,
  ) {
    this.feature.requireOrdering();
    const idempotencyKey = requireIdempotencyKey(rawIdempotencyKey);
    const result = await this.repository.checkout({
      actor,
      idempotencyKey,
      paymentMethod: payload.paymentMethod,
      contact: payload.contact,
      acknowledgements: payload.fitmentAcknowledgements ?? [],
    });
    if ('inProgress' in result) {
      throw new ConflictException(
        accessoryError('ACCESSORY_REQUEST_IN_PROGRESS', 'Checkout is still being processed.'),
      );
    }
    if ('emptyCart' in result) {
      throw new ConflictException(accessoryError('ACCESSORY_CART_EMPTY', 'The cart is empty.'));
    }
    if ('ownershipConflict' in result) {
      throw new ForbiddenException(
        accessoryError('ACCESSORY_VEHICLE_OWNERSHIP_REQUIRED', 'The selected vehicle is not owned by you.'),
      );
    }
    if ('catalogConflict' in result) {
      throw new ConflictException(
        accessoryError('ACCESSORY_CATALOG_CHANGED', 'A cart item is no longer available.'),
      );
    }
    if ('incompatibleVariantId' in result) {
      throw new ConflictException(
        accessoryError(
          'ACCESSORY_FITMENT_INCOMPATIBLE',
          `Variant ${result.incompatibleVariantId} is not compatible with the selected vehicle.`,
        ),
      );
    }
    if ('acknowledgementRequiredVariantId' in result) {
      throw new ConflictException(
        accessoryError(
          'ACCESSORY_FITMENT_ACKNOWLEDGEMENT_REQUIRED',
          `Variant ${result.acknowledgementRequiredVariantId} requires unverified-fitment acknowledgement.`,
        ),
      );
    }
    if ('outOfStockVariantId' in result) {
      throw new ConflictException(
        accessoryError(
          'ACCESSORY_OUT_OF_STOCK',
          `Variant ${result.outOfStockVariantId} is no longer available in the requested quantity.`,
        ),
      );
    }

    const orderId = 'replayOrderId' in result ? result.replayOrderId : result.orderId;
    if (!orderId) {
      throw new ConflictException('Checkout completed without an order reference.');
    }
    const order = await this.repository.findOrder(orderId);
    if (!order) throw new NotFoundException('Order not found after checkout.');
    const response: Record<string, unknown> = {
      order,
      created: !('replayOrderId' in result),
      ...('pickupCode' in result ? { pickupCode: result.pickupCode } : {}),
    };
    if (order.paymentMethod === 'paymongo' && order.paymentStatus !== 'paid') {
      response.payment = await this.payments.createCheckoutSession(order.id, actor, idempotencyKey);
    }
    return response;
  }

  async listMyOrders(query: AccessoryPageQueryDto, actor: AccessoryActor) {
    const limit = normalizeAccessoryPageSize(query.limit);
    const page = await this.repository.listOrders({
      userId: actor.userId,
      limit,
      cursor: decodeAccessoryCursor(query.cursor),
    });
    const last = page.rows[page.rows.length - 1];
    return {
      items: page.rows.map(customerOrderSummary),
      nextCursor:
        page.hasMore && last
          ? encodeAccessoryCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async getOrder(id: string, actor: AccessoryActor) {
    const order = await this.findOrderAuthorized(id, actor);
    if (actor.role === 'customer') {
      assertAccessoryOwner(actor, order.userId);
      return {
        order: customerOrderSummary(order),
        items: order.items.map((item) => ({
          id: item.id,
          sku: item.skuSnapshot,
          productName: item.productNameSnapshot,
          variantName: item.variantNameSnapshot,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
          lineTotalCents: item.lineTotalCents,
          fitment: {
            status: item.fitmentSnapshot.status,
            acknowledgedUnverified: item.fitmentSnapshot.acknowledgedUnverified,
          },
        })),
        history: order.history.map((entry) => ({
          id: entry.id,
          previousStatus: entry.previousStatus,
          nextStatus: entry.nextStatus,
          reason: entry.reason,
          createdAt: entry.createdAt,
        })),
        payments: order.paymentAttempts.map((attempt) => ({
          id: attempt.id,
          status: attempt.status,
          amountCents: attempt.amountCents,
          currencyCode: attempt.currencyCode,
          checkoutUrl: attempt.checkoutUrl,
          failureReason: attempt.failureReason,
          expiresAt: attempt.expiresAt,
          paidAt: attempt.paidAt,
          createdAt: attempt.createdAt,
        })),
        refunds: order.refunds.map((refund) => ({
          id: refund.id,
          status: refund.status,
          amountCents: refund.amountCents,
          reason: refund.reason,
          createdAt: refund.createdAt,
          updatedAt: refund.updatedAt,
        })),
      };
    }
    assertAccessoryStaff(actor);
    return order;
  }

  async cancelOrder(
    id: string,
    payload: CancelAccessoryOrderDto,
    rawIdempotencyKey: string | undefined,
    actor: AccessoryActor,
  ) {
    const order = await this.findOrderAuthorized(id, actor);
    if (actor.role === 'customer') assertAccessoryOwner(actor, order.userId);
    if (['preparing', 'ready_for_pickup', 'collected', 'refunded', 'expired'].includes(order.status)) {
      throw new ConflictException(
        accessoryError(
          'ACCESSORY_CANCELLATION_ADMIN_REQUIRED',
          'This fulfillment stage requires a super-admin exception.',
        ),
      );
    }
    const key = requireIdempotencyKey(rawIdempotencyKey);
    const claim = await this.repository.claimIdempotency({
      actorUserId: actor.userId,
      scope: 'customer_order_cancellation',
      key,
      payload: { orderId: id, reason: payload.reason },
    });
    if (!claim.claimed) {
      if (claim.record.responseSnapshot) return claim.record.responseSnapshot;
      throw new ConflictException(
        accessoryError('ACCESSORY_REQUEST_IN_PROGRESS', 'The cancellation is still being processed.'),
      );
    }
    const result = await this.repository.cancelOrder({ actor, orderId: id, reason: payload.reason });
    if (result && 'adminExceptionRequired' in result) {
      throw new ConflictException(
        accessoryError(
          'ACCESSORY_CANCELLATION_ADMIN_REQUIRED',
          'This fulfillment stage requires a super-admin exception.',
        ),
      );
    }
    if (!result) throw new NotFoundException('Accessory order not found.');
    const response = customerOrderSummary(result);
    await this.repository.completeIdempotency(claim.record.id, response, {
      type: 'accessory_order',
      id,
    });
    return response;
  }

  async regeneratePickupCode(id: string, actor: AccessoryActor) {
    const order = await this.findOrderAuthorized(id, actor);
    assertAccessoryOwner(actor, order.userId);
    if (['collected', 'cancelled', 'expired', 'refunded'].includes(order.status)) {
      throw new ConflictException('A pickup code cannot be regenerated for this order.');
    }
    return this.repository.regeneratePickupCode(id);
  }

  async listStaffOrders(query: AccessoryPageQueryDto, actor: AccessoryActor) {
    assertAccessoryStaff(actor);
    const limit = normalizeAccessoryPageSize(query.limit);
    const page = await this.repository.listOrders({
      limit,
      cursor: decodeAccessoryCursor(query.cursor),
    });
    const last = page.rows[page.rows.length - 1];
    return {
      items: page.rows,
      nextCursor:
        page.hasMore && last
          ? encodeAccessoryCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async takeOrder(id: string, rawVersion: string | undefined, actor: AccessoryActor) {
    assertAccessoryStaff(actor);
    const order = await this.findOrderAuthorized(id, actor);
    if (!isAccessoryFulfillmentClaimableStatus(order.status)) {
      throw new ConflictException(
        accessoryError(
          'ACCESSORY_ORDER_NOT_ELIGIBLE',
          'Only active fulfillment orders can be assigned.',
        ),
      );
    }
    const result = await this.repository.takeOrder(id, actor, parseAccessoryVersion(rawVersion));
    if (!result) {
      throw new ConflictException(
        accessoryError('ACCESSORY_ORDER_CLAIM_CONFLICT', 'Another staff member already took this order.'),
      );
    }
    return result;
  }

  async reassignOrder(
    id: string,
    rawVersion: string | undefined,
    payload: ReassignAccessoryOrderDto,
    actor: AccessoryActor,
  ) {
    assertAccessoryAdmin(actor);
    const assignee = await this.repository.findAssignableStaff(payload.assigneeUserId);
    if (!assignee) {
      throw new BadRequestException(
        accessoryError(
          'ACCESSORY_ASSIGNEE_INVALID',
          'Accessory orders can be assigned only to an active service adviser or super admin.',
        ),
      );
    }
    const result = await this.repository.reassignOrder({
      actor,
      orderId: id,
      expectedVersion: parseAccessoryVersion(rawVersion),
      ...payload,
    });
    if (!result) throw new ConflictException('The order changed before it could be reassigned.');
    return result;
  }

  async transitionOrder(
    id: string,
    rawVersion: string | undefined,
    payload: TransitionAccessoryOrderDto,
    actor: AccessoryActor,
  ) {
    assertAccessoryStaff(actor);
    const order = await this.findOrderAuthorized(id, actor);
    if (payload.status === 'collected') {
      if (order.pickupCodeLockedUntil && order.pickupCodeLockedUntil > new Date()) {
        throw new HttpException(
          'Pickup-code verification is temporarily locked.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (
        payload.orderReference !== order.orderReference ||
        !payload.pickupCode ||
        !order.pickupCodeHash ||
        !verifyAccessoryPickupCode(order.id, payload.pickupCode, order.pickupCodeHash)
      ) {
        const nextAttempts = order.pickupCodeAttempts + 1;
        await this.repository.recordPickupFailure(
          order.id,
          nextAttempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
        );
        throw new ConflictException(
          accessoryError('ACCESSORY_PICKUP_CODE_INVALID', 'The order reference or pickup code is invalid.'),
        );
      }
    }
    const result = await this.repository.transitionOrder({
      actor,
      orderId: id,
      expectedVersion: parseAccessoryVersion(rawVersion),
      status: payload.status,
      reason: payload.reason,
    });
    if (!result) throw new ConflictException('The order changed or is owned by another staff member.');
    if ('invalidTransition' in result) throw new ConflictException('That fulfillment transition is not allowed.');
    if ('stockConflict' in result) {
      throw new ConflictException(
        accessoryError(
          'ACCESSORY_STOCK_CONFLICT',
          'Collection could not complete because the reserved stock is no longer valid.',
        ),
      );
    }
    return result;
  }

  createCategory(payload: CreateAccessoryCategoryDto, actor: AccessoryActor) {
    assertAccessoryAdmin(actor);
    return this.repository.createCategory({ actor, ...payload });
  }

  createProduct(payload: CreateAccessoryProductDto, actor: AccessoryActor) {
    assertAccessoryAdmin(actor);
    return this.repository.createProduct({ actor, ...payload });
  }

  createVariant(payload: CreateAccessoryVariantDto, actor: AccessoryActor) {
    assertAccessoryAdmin(actor);
    return this.repository.createVariant({ actor, ...payload });
  }

  async updateVariant(
    id: string,
    rawVersion: string | undefined,
    payload: UpdateAccessoryVariantDto,
    actor: AccessoryActor,
  ) {
    assertAccessoryAdmin(actor);
    const result = await this.repository.updateVariant({
      actor,
      variantId: id,
      version: parseAccessoryVersion(rawVersion),
      ...payload,
    });
    if (!result) throw new ConflictException('The variant version is stale.');
    return result;
  }

  async listStock(query: AccessoryPageQueryDto, actor: AccessoryActor) {
    assertAccessoryAdmin(actor);
    const limit = normalizeAccessoryPageSize(query.limit);
    const page = await this.repository.listStock({
      limit,
      cursor: decodeAccessoryCursor(query.cursor),
    });
    const last = page.rows[page.rows.length - 1]?.variant;
    return {
      items: page.rows,
      nextCursor:
        page.hasMore && last
          ? encodeAccessoryCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async adminCancelOrder(
    id: string,
    payload: CancelAccessoryOrderDto,
    rawIdempotencyKey: string | undefined,
    actor: AccessoryActor,
  ) {
    assertAccessoryAdmin(actor);
    const key = requireIdempotencyKey(rawIdempotencyKey);
    const order = await this.findOrderAuthorized(id, actor);
    const claim = await this.repository.claimIdempotency({
      actorUserId: actor.userId,
      scope: 'admin_order_cancellation',
      key,
      payload: { orderId: id, reason: payload.reason },
    });
    if (!claim.claimed) {
      if (claim.record.responseSnapshot) return claim.record.responseSnapshot;
      throw new ConflictException(
        accessoryError('ACCESSORY_REQUEST_IN_PROGRESS', 'The cancellation is still being processed.'),
      );
    }
    const result = await this.repository.cancelOrder({
      actor,
      orderId: order.id,
      reason: payload.reason,
      force: true,
    });
    if (!result || 'adminExceptionRequired' in result) {
      throw new ConflictException('This order can no longer be cancelled.');
    }
    await this.repository.completeIdempotency(claim.record.id, result, {
      type: 'accessory_order',
      id: order.id,
    });
    return result;
  }

  createFitment(payload: CreateAccessoryFitmentDto, actor: AccessoryActor) {
    assertAccessoryAdmin(actor);
    return this.repository.createFitment({
      actor,
      values: {
        ...payload,
        reviewedByUserId: actor.userId,
        reviewedAt: new Date(),
      },
    });
  }

  reviewLighting(id: string, payload: ReviewAccessoryLightingDto, actor: AccessoryActor) {
    assertAccessoryAdmin(actor);
    return this.repository.reviewLighting({ actor, productId: id, ...payload });
  }

  async publishProduct(
    id: string,
    rawVersion: string | undefined,
    payload: PublishAccessoryProductDto,
    actor: AccessoryActor,
  ) {
    assertAccessoryAdmin(actor);
    const result = await this.repository.publishProduct({
      actor,
      productId: id,
      version: parseAccessoryVersion(rawVersion),
      ...payload,
    });
    if (!result) throw new ConflictException('The product version is stale.');
    if ('lightingReviewRequired' in result) {
      throw new ConflictException(
        accessoryError(
          'ACCESSORY_LIGHTING_REVIEW_REQUIRED',
          'Lighting requires compatibility and compliance review before publication.',
        ),
      );
    }
    return result;
  }

  async adjustStock(
    payload: AdjustAccessoryStockDto,
    rawIdempotencyKey: string | undefined,
    actor: AccessoryActor,
  ) {
    assertAccessoryAdmin(actor);
    const result = await this.repository.adjustStock({
      actor,
      idempotencyKey: requireIdempotencyKey(rawIdempotencyKey),
      ...payload,
    });
    if (result && 'stockConflict' in result) {
      throw new ConflictException('The adjustment would create negative or over-reserved stock.');
    }
    return result;
  }

  releaseExpiredReservations() {
    return this.repository.releaseExpiredReservations();
  }

  private assertCartResult(
    result:
      | Awaited<ReturnType<AccessoriesRepository['replaceCart']>>
      | Awaited<ReturnType<AccessoriesRepository['patchCartItem']>>
      | Awaited<ReturnType<AccessoriesRepository['deleteCartItem']>>,
  ) {
    if (!result) throw new ConflictException('The cart version is stale. Refresh and try again.');
    if ('ownershipConflict' in result) {
      throw new ForbiddenException('The selected vehicle is not owned by the customer.');
    }
    if ('catalogConflict' in result) {
      throw new ConflictException('One or more cart variants are unavailable.');
    }
  }

  private toCustomerCart(cart: Awaited<ReturnType<AccessoriesRepository['getCart']>>) {
    return {
      selectedVehicleId: cart.selectedVehicleId,
      version: cart.version,
      updatedAt: cart.updatedAt,
      items: cart.items.map((row) => ({
        item: {
          id: row.item.id,
          variantId: row.item.variantId,
          quantity: row.item.quantity,
        },
        variant: customerVariant(row.variant),
        product: customerProduct(row.product),
        inventory: {
          availableQuantity: Math.max(
            0,
            Number(row.inventory?.onHandQuantity ?? 0) -
              Number(row.inventory?.reservedQuantity ?? 0),
          ),
        },
      })),
    };
  }

  private async findOrderAuthorized(id: string, actor: AccessoryActor) {
    const order = await this.repository.findOrder(id);
    if (!order) {
      throw new NotFoundException(
        accessoryError('ACCESSORY_ORDER_NOT_FOUND', 'Order not found.'),
      );
    }
    if (actor.role === 'customer') assertAccessoryOwner(actor, order.userId);
    else assertAccessoryStaff(actor);
    return order;
  }
}
