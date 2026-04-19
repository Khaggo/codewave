import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { CatalogRepository } from '@ecommerce-modules/catalog/repositories/catalog.repository';

import { AddCartItemDto } from '../dto/add-cart-item.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';
import { CartRepository } from '../repositories/cart.repository';

type HydratedCartItem = {
  id: string;
  productId: string;
  productCategoryId: string | null;
  productName: string | null;
  productSlug: string | null;
  productSku: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  availabilityStatus: 'available' | 'inactive' | 'missing';
  createdAt: Date;
  updatedAt: Date;
};

type HydratedCart = {
  id: string;
  customerUserId: string;
  items: HydratedCartItem[];
  subtotalCents: number;
  totalQuantity: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async getCart(customerUserId: string) {
    const cart = await this.cartRepository.getOrCreateActiveCart(customerUserId);
    return this.hydrateCart(cart.id);
  }

  async addItem(payload: AddCartItemDto) {
    const product = await this.requireActiveProduct(payload.productId);
    const cart = await this.cartRepository.getOrCreateActiveCart(payload.customerUserId);
    const existingItem = await this.cartRepository.findItemByCartAndProduct(cart.id, payload.productId);

    if (existingItem) {
      await this.cartRepository.updateItemQuantity(existingItem.id, existingItem.quantity + payload.quantity);
    } else {
      await this.cartRepository.createItem({
        cartId: cart.id,
        productId: product.id,
        quantity: payload.quantity,
      });
    }

    return this.hydrateCart(cart.id);
  }

  async updateItem(itemId: string, payload: UpdateCartItemDto) {
    const cart = await this.cartRepository.getOrCreateActiveCart(payload.customerUserId);
    const existingItem = await this.cartRepository.findItemById(itemId);
    if (!existingItem || existingItem.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    await this.requireActiveProduct(existingItem.productId);
    await this.cartRepository.updateItemQuantity(itemId, payload.quantity);
    return this.hydrateCart(cart.id);
  }

  async removeItem(itemId: string, customerUserId: string) {
    const cart = await this.cartRepository.getOrCreateActiveCart(customerUserId);
    const existingItem = await this.cartRepository.findItemById(itemId);
    if (!existingItem || existingItem.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartRepository.removeItem(itemId);
    return this.hydrateCart(cart.id);
  }

  async getCheckoutPreview(customerUserId: string) {
    const cart = await this.cartRepository.getOrCreateActiveCart(customerUserId);
    const hydratedCart = await this.hydrateCart(cart.id);

    if (hydratedCart.items.length === 0) {
      throw new ConflictException('Cart is empty');
    }

    const unavailableItems = hydratedCart.items.filter((item) => item.availabilityStatus !== 'available');
    if (unavailableItems.length > 0) {
      throw new ConflictException('Cart contains unavailable products');
    }

    return {
      cartId: hydratedCart.id,
      customerUserId: hydratedCart.customerUserId,
      checkoutMode: 'invoice' as const,
      items: hydratedCart.items,
      subtotalCents: hydratedCart.subtotalCents,
      totalQuantity: hydratedCart.totalQuantity,
    };
  }

  async clearActiveCart(customerUserId: string) {
    const cart = await this.cartRepository.getOrCreateActiveCart(customerUserId);
    await this.cartRepository.clearCart(cart.id);
    return this.hydrateCart(cart.id);
  }

  private async hydrateCart(cartId: string): Promise<HydratedCart> {
    const cart = await this.cartRepository.findCartById(cartId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const items = await this.cartRepository.listItemsByCartId(cartId);
    const hydratedItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.catalogRepository.findProductById(item.productId);
        const availabilityStatus: 'available' | 'inactive' | 'missing' = !product
          ? 'missing'
          : product.isActive
            ? 'available'
            : 'inactive';
        const unitPriceCents = product?.priceCents ?? 0;

        return {
          id: item.id,
          productId: item.productId,
          productCategoryId: product?.categoryId ?? null,
          productName: product?.name ?? null,
          productSlug: product?.slug ?? null,
          productSku: product?.sku ?? null,
          quantity: item.quantity,
          unitPriceCents,
          lineTotalCents: unitPriceCents * item.quantity,
          availabilityStatus,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    );

    return {
      ...cart,
      items: hydratedItems,
      subtotalCents: hydratedItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
      totalQuantity: hydratedItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  private async requireActiveProduct(productId: string) {
    const product = await this.catalogRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new ConflictException('Product is inactive and cannot be added to the cart');
    }

    return product;
  }
}
