import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { CartService } from '@ecommerce-modules/cart/services/cart.service';
import { InvoicePaymentsService } from '@ecommerce-modules/invoice-payments/services/invoice-payments.service';

import { CancelOrderDto } from '../dto/cancel-order.dto';
import { CheckoutInvoiceDto } from '../dto/checkout-invoice.dto';
import { OrderHistoryQueryDto } from '../dto/order-history-query.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrdersRepository } from '../repositories/orders.repository';

@Injectable()
export class OrdersService {
  constructor(
    private readonly cartService: CartService,
    private readonly ordersRepository: OrdersRepository,
    private readonly invoicePaymentsService: InvoicePaymentsService,
    private readonly eventBus: AutocareEventBusService,
  ) {}

  async checkoutInvoice(payload: CheckoutInvoiceDto) {
    const preview = await this.cartService.getCheckoutPreview(payload.customerUserId);
    if (preview.items.length === 0) {
      throw new ConflictException('Cart is empty');
    }

    const order = await this.ordersRepository.createOrder({
      customerUserId: payload.customerUserId,
      subtotalCents: preview.subtotalCents,
      notes: payload.notes ?? null,
      items: preview.items.map((item) => ({
        productId: item.productId,
        productName: item.productName ?? 'Unknown Product',
        productSlug: item.productSlug ?? 'unknown-product',
        sku: item.productSku ?? 'UNKNOWN-SKU',
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
      billingAddress: payload.billingAddress,
    });

    const invoice = await this.invoicePaymentsService.createInvoiceForOrder({
      orderId: order.id,
      customerUserId: payload.customerUserId,
      totalCents: preview.subtotalCents,
      productIds: preview.items.map((item) => item.productId),
      productCategoryIds: Array.from(
        new Set(
          preview.items
            .map((item) => item.productCategoryId)
            .filter((categoryId): categoryId is string => Boolean(categoryId)),
        ),
      ),
    });

    await this.ordersRepository.attachInvoice(order.id, invoice.id);
    await this.cartService.clearActiveCart(payload.customerUserId);
    this.eventBus.publish('order.created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerUserId: order.customerUserId,
      checkoutMode: order.checkoutMode,
      status: order.status,
      subtotalCents: order.subtotalCents,
      itemCount: preview.totalQuantity,
      invoiceId: invoice.id,
    });
    this.eventBus.publish('order.invoice_issued', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerUserId: order.customerUserId,
      totalCents: invoice.totalCents,
      amountDueCents: invoice.amountDueCents,
      currencyCode: invoice.currencyCode,
      dueAt: invoice.dueAt.toISOString(),
    });

    return this.getOrderById(order.id);
  }

  async getOrderById(orderId: string) {
    const order = await this.ordersRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const invoice = order.invoiceId ? await this.invoicePaymentsService.findInvoiceById(order.invoiceId) : null;

    return {
      ...order,
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            totalCents: invoice.totalCents,
            amountDueCents: invoice.amountDueCents,
          }
        : null,
    };
  }

  async listOrdersByUserId(customerUserId: string, filters?: OrderHistoryQueryDto) {
    const orders = await this.ordersRepository.listOrdersByCustomerUserId(customerUserId, {
      status: filters?.status,
    });
    const hydratedOrders = await Promise.all(orders.map((order) => this.getOrderById(order.id)));

    if (filters?.invoiceStatus) {
      return hydratedOrders.filter((order) => order.invoice?.status === filters.invoiceStatus);
    }

    return hydratedOrders;
  }

  async updateOrderStatus(orderId: string, payload: UpdateOrderStatusDto) {
    const order = await this.ordersRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!this.canTransition(order.status, payload.status)) {
      throw new ConflictException('The requested order transition is not allowed');
    }

    await this.ordersRepository.updateStatus(orderId, {
      status: payload.status,
      reason: payload.reason ?? null,
      transitionType: payload.status === 'cancelled' ? 'cancel' : 'status_update',
    });

    return this.getOrderById(orderId);
  }

  async cancelOrder(orderId: string, payload: CancelOrderDto) {
    const order = await this.ordersRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!this.canTransition(order.status, 'cancelled')) {
      throw new ConflictException('The order can no longer be cancelled');
    }

    await this.ordersRepository.updateStatus(orderId, {
      status: 'cancelled',
      reason: payload.reason ?? null,
      transitionType: 'cancel',
    });

    return this.getOrderById(orderId);
  }

  private canTransition(
    currentStatus: 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled',
    nextStatus: 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled',
  ) {
    const allowedTransitions: Record<string, string[]> = {
      invoice_pending: ['awaiting_fulfillment', 'cancelled'],
      awaiting_fulfillment: ['fulfilled', 'cancelled'],
      fulfilled: [],
      cancelled: [],
    };

    if (currentStatus === nextStatus) {
      return true;
    }

    return allowedTransitions[currentStatus].includes(nextStatus);
  }
}
