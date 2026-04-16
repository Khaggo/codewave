import { randomUUID } from 'crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

type CartRecord = {
  id: string;
  customerUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type CartItemRecord = {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CartRepository {
  private readonly carts = new Map<string, CartRecord>();

  private readonly cartItems = new Map<string, CartItemRecord>();

  async getOrCreateActiveCart(customerUserId: string) {
    const existingCart = Array.from(this.carts.values()).find((cart) => cart.customerUserId === customerUserId);
    if (existingCart) {
      return { ...existingCart };
    }

    const now = new Date();
    const cart: CartRecord = {
      id: randomUUID(),
      customerUserId,
      createdAt: now,
      updatedAt: now,
    };

    this.carts.set(cart.id, cart);
    return { ...cart };
  }

  async findCartById(cartId: string) {
    const cart = this.carts.get(cartId);
    return cart ? { ...cart } : null;
  }

  async listItemsByCartId(cartId: string) {
    return Array.from(this.cartItems.values())
      .filter((item) => item.cartId === cartId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((item) => ({ ...item }));
  }

  async findItemById(itemId: string) {
    const item = this.cartItems.get(itemId);
    return item ? { ...item } : null;
  }

  async findItemByCartAndProduct(cartId: string, productId: string) {
    const item = Array.from(this.cartItems.values()).find(
      (entry) => entry.cartId === cartId && entry.productId === productId,
    );
    return item ? { ...item } : null;
  }

  async createItem(payload: { cartId: string; productId: string; quantity: number }) {
    const now = new Date();
    const item: CartItemRecord = {
      id: randomUUID(),
      cartId: payload.cartId,
      productId: payload.productId,
      quantity: payload.quantity,
      createdAt: now,
      updatedAt: now,
    };

    this.cartItems.set(item.id, item);
    await this.touchCart(payload.cartId);
    return { ...item };
  }

  async updateItemQuantity(itemId: string, quantity: number) {
    const existingItem = this.cartItems.get(itemId);
    if (!existingItem) {
      throw new NotFoundException('Cart item not found');
    }

    const updatedItem: CartItemRecord = {
      ...existingItem,
      quantity,
      updatedAt: new Date(),
    };

    this.cartItems.set(itemId, updatedItem);
    await this.touchCart(existingItem.cartId);
    return { ...updatedItem };
  }

  async removeItem(itemId: string) {
    const existingItem = this.cartItems.get(itemId);
    if (!existingItem) {
      throw new NotFoundException('Cart item not found');
    }

    this.cartItems.delete(itemId);
    await this.touchCart(existingItem.cartId);
  }

  async clearCart(cartId: string) {
    Array.from(this.cartItems.values())
      .filter((item) => item.cartId === cartId)
      .forEach((item) => this.cartItems.delete(item.id));
    await this.touchCart(cartId);
  }

  async touchCart(cartId: string) {
    const existingCart = this.carts.get(cartId);
    if (!existingCart) {
      throw new NotFoundException('Cart not found');
    }

    this.carts.set(cartId, {
      ...existingCart,
      updatedAt: new Date(),
    });
  }
}
