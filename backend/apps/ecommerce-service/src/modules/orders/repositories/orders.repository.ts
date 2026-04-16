import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

type OrderStatus = 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled';

type OrderRecord = {
  id: string;
  orderNumber: string;
  customerUserId: string;
  checkoutMode: 'invoice';
  status: OrderStatus;
  subtotalCents: number;
  notes: string | null;
  invoiceId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type OrderItemRecord = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  description: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  createdAt: Date;
};

type OrderAddressRecord = {
  id: string;
  orderId: string;
  addressType: 'billing';
  recipientName: string;
  email: string;
  contactPhone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  createdAt: Date;
};

type OrderStatusHistoryRecord = {
  id: string;
  orderId: string;
  previousStatus: OrderStatus | null;
  nextStatus: OrderStatus;
  reason: string | null;
  transitionType: 'checkout' | 'status_update' | 'cancel';
  changedAt: Date;
};

@Injectable()
export class OrdersRepository {
  private readonly orders = new Map<string, OrderRecord>();

  private readonly orderItems = new Map<string, OrderItemRecord>();

  private readonly orderAddresses = new Map<string, OrderAddressRecord>();

  private readonly orderStatusHistory = new Map<string, OrderStatusHistoryRecord>();

  private sequence = 1;

  async createOrder(payload: {
    customerUserId: string;
    subtotalCents: number;
    notes?: string | null;
    items: Array<{
      productId: string;
      productName: string;
      productSlug: string;
      sku: string;
      description?: string | null;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
    }>;
    billingAddress: {
      recipientName: string;
      email: string;
      contactPhone?: string | null;
      addressLine1: string;
      addressLine2?: string | null;
      city: string;
      province: string;
      postalCode?: string | null;
    };
  }) {
    const now = new Date();
    const order: OrderRecord = {
      id: randomUUID(),
      orderNumber: `ORD-2026-${String(this.sequence).padStart(4, '0')}`,
      customerUserId: payload.customerUserId,
      checkoutMode: 'invoice',
      status: 'invoice_pending',
      subtotalCents: payload.subtotalCents,
      notes: payload.notes ?? null,
      invoiceId: null,
      createdAt: now,
      updatedAt: now,
    };

    this.sequence += 1;
    this.orders.set(order.id, order);

    payload.items.forEach((item) => {
      const record: OrderItemRecord = {
        id: randomUUID(),
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        sku: item.sku,
        description: item.description ?? null,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
        createdAt: now,
      };
      this.orderItems.set(record.id, record);
    });

    const address: OrderAddressRecord = {
      id: randomUUID(),
      orderId: order.id,
      addressType: 'billing',
      recipientName: payload.billingAddress.recipientName,
      email: payload.billingAddress.email,
      contactPhone: payload.billingAddress.contactPhone ?? null,
      addressLine1: payload.billingAddress.addressLine1,
      addressLine2: payload.billingAddress.addressLine2 ?? null,
      city: payload.billingAddress.city,
      province: payload.billingAddress.province,
      postalCode: payload.billingAddress.postalCode ?? null,
      createdAt: now,
    };
    this.orderAddresses.set(address.id, address);

    const historyEntry: OrderStatusHistoryRecord = {
      id: randomUUID(),
      orderId: order.id,
      previousStatus: null,
      nextStatus: order.status,
      reason: 'Order created from invoice checkout.',
      transitionType: 'checkout',
      changedAt: now,
    };
    this.orderStatusHistory.set(historyEntry.id, historyEntry);

    const createdOrder = await this.findOrderById(order.id);
    if (!createdOrder) {
      throw new Error('Failed to hydrate created order');
    }

    return createdOrder;
  }

  async findOrderById(orderId: string) {
    const order = this.orders.get(orderId);
    if (!order) {
      return null;
    }

    return {
      ...order,
      items: Array.from(this.orderItems.values())
        .filter((item) => item.orderId === orderId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((item) => ({ ...item })),
      addresses: Array.from(this.orderAddresses.values())
        .filter((address) => address.orderId === orderId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((address) => ({ ...address })),
      statusHistory: Array.from(this.orderStatusHistory.values())
        .filter((entry) => entry.orderId === orderId)
        .sort((left, right) => left.changedAt.getTime() - right.changedAt.getTime())
        .map((entry) => ({ ...entry })),
    };
  }

  async listOrdersByCustomerUserId(customerUserId: string, filters?: { status?: OrderStatus }) {
    const orderIds = Array.from(this.orders.values())
      .filter((order) => {
        if (order.customerUserId !== customerUserId) {
          return false;
        }

        if (filters?.status && order.status !== filters.status) {
          return false;
        }

        return true;
      })
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((order) => order.id);

    const orders = await Promise.all(orderIds.map((orderId) => this.findOrderById(orderId)));
    return orders.filter((order): order is NonNullable<typeof order> => Boolean(order));
  }

  async attachInvoice(orderId: string, invoiceId: string) {
    const existingOrder = this.orders.get(orderId);
    if (!existingOrder) {
      return null;
    }

    this.orders.set(orderId, {
      ...existingOrder,
      invoiceId,
      updatedAt: new Date(),
    });

    return this.findOrderById(orderId);
  }

  async updateStatus(
    orderId: string,
    payload: {
      status: OrderStatus;
      reason?: string | null;
      transitionType?: 'status_update' | 'cancel';
    },
  ) {
    const existingOrder = this.orders.get(orderId);
    if (!existingOrder) {
      return null;
    }

    const updatedAt = new Date();
    const updatedOrder: OrderRecord = {
      ...existingOrder,
      status: payload.status,
      updatedAt,
    };

    this.orders.set(orderId, updatedOrder);
    const historyEntry: OrderStatusHistoryRecord = {
      id: randomUUID(),
      orderId,
      previousStatus: existingOrder.status,
      nextStatus: payload.status,
      reason: payload.reason ?? null,
      transitionType: payload.transitionType ?? 'status_update',
      changedAt: updatedAt,
    };
    this.orderStatusHistory.set(historyEntry.id, historyEntry);

    return this.findOrderById(orderId);
  }
}
