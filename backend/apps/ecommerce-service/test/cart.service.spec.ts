import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CatalogRepository } from '@ecommerce-modules/catalog/repositories/catalog.repository';
import { CartRepository } from '@ecommerce-modules/cart/repositories/cart.repository';
import { CartService } from '@ecommerce-modules/cart/services/cart.service';

describe('CartService', () => {
  it('merges duplicate product adds into one cart item with an increased quantity', async () => {
    const cartRepository = {
      getOrCreateActiveCart: jest.fn().mockResolvedValue({
        id: 'cart-1',
        customerUserId: 'customer-1',
        createdAt: new Date('2026-05-14T04:00:00.000Z'),
        updatedAt: new Date('2026-05-14T04:00:00.000Z'),
      }),
      findItemByCartAndProduct: jest.fn().mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 1,
      }),
      updateItemQuantity: jest.fn().mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 3,
      }),
      findCartById: jest.fn().mockResolvedValue({
        id: 'cart-1',
        customerUserId: 'customer-1',
        createdAt: new Date('2026-05-14T04:00:00.000Z'),
        updatedAt: new Date('2026-05-14T04:05:00.000Z'),
      }),
      listItemsByCartId: jest.fn().mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'product-1',
          quantity: 3,
          createdAt: new Date('2026-05-14T04:00:00.000Z'),
          updatedAt: new Date('2026-05-14T04:05:00.000Z'),
        },
      ]),
    };
    const catalogRepository = {
      findProductById: jest.fn().mockResolvedValue({
        id: 'product-1',
        name: 'Premium Engine Oil 5W-30',
        slug: 'premium-engine-oil-5w30',
        sku: 'ENG-OIL-5W30',
        priceCents: 189900,
        isActive: true,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: CartRepository, useValue: cartRepository },
        { provide: CatalogRepository, useValue: catalogRepository },
      ],
    }).compile();

    const service = moduleRef.get(CartService);

    const result = await service.addItem({
      customerUserId: 'customer-1',
      productId: 'product-1',
      quantity: 2,
    });

    expect(cartRepository.updateItemQuantity).toHaveBeenCalledWith('item-1', 3);
    expect(result.totalQuantity).toBe(3);
    expect(result.subtotalCents).toBe(569700);
  });

  it('rejects checkout preview when the cart contains an inactive product', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: CartRepository,
          useValue: {
            getOrCreateActiveCart: jest.fn().mockResolvedValue({
              id: 'cart-1',
              customerUserId: 'customer-1',
              createdAt: new Date('2026-05-14T04:00:00.000Z'),
              updatedAt: new Date('2026-05-14T04:00:00.000Z'),
            }),
            findCartById: jest.fn().mockResolvedValue({
              id: 'cart-1',
              customerUserId: 'customer-1',
              createdAt: new Date('2026-05-14T04:00:00.000Z'),
              updatedAt: new Date('2026-05-14T04:00:00.000Z'),
            }),
            listItemsByCartId: jest.fn().mockResolvedValue([
              {
                id: 'item-1',
                cartId: 'cart-1',
                productId: 'product-1',
                quantity: 1,
                createdAt: new Date('2026-05-14T04:00:00.000Z'),
                updatedAt: new Date('2026-05-14T04:00:00.000Z'),
              },
            ]),
          },
        },
        {
          provide: CatalogRepository,
          useValue: {
            findProductById: jest.fn().mockResolvedValue({
              id: 'product-1',
              name: 'Premium Engine Oil 5W-30',
              slug: 'premium-engine-oil-5w30',
              sku: 'ENG-OIL-5W30',
              priceCents: 189900,
              isActive: false,
            }),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(CartService);

    await expect(service.getCheckoutPreview('customer-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
