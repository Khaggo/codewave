import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  AccessoryCheckoutDto,
  AccessoryCustomerCartResponseDto,
  AccessoryCustomerProductDto,
  AccessoryPaymentMethodDtoValue,
} from './accessories.dto';

describe('AccessoryCheckoutDto', () => {
  it('rejects an omitted pickup contact before checkout reaches persistence', async () => {
    const dto = plainToInstance(AccessoryCheckoutDto, {
      paymentMethod: AccessoryPaymentMethodDtoValue.PayAtShop,
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'contact',
          constraints: expect.objectContaining({ isDefined: expect.any(String) }),
        }),
      ]),
    );
  });

  it('accepts a complete pickup contact', async () => {
    const dto = plainToInstance(AccessoryCheckoutDto, {
      paymentMethod: AccessoryPaymentMethodDtoValue.PayAtShop,
      contact: {
        name: 'Queue Customer',
        phone: '09171234567',
        email: 'queue.customer@example.com',
      },
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('keeps customer catalog and cart read fields explicit', () => {
    const product = plainToInstance(AccessoryCustomerProductDto, {
      id: 'product-1',
      categoryId: 'category-1',
      slug: 'fog-lights',
      name: 'Fog lights',
      description: null,
      isLighting: true,
      availability: { availableQuantity: 0, inStock: false },
    });
    const cart = plainToInstance(AccessoryCustomerCartResponseDto, {
      selectedVehicleId: null,
      version: 3,
      updatedAt: new Date(),
      currencyCode: 'PHP',
      subtotalCents: 0,
      totalCents: 0,
      items: [],
    });

    expect(product.availability).toEqual({ availableQuantity: 0, inStock: false });
    expect(cart).toMatchObject({ currencyCode: 'PHP', subtotalCents: 0, totalCents: 0 });
  });

  it.each([
    ['pay-at-shop', AccessoryPaymentMethodDtoValue.PayAtShop],
    ['manual_counter', AccessoryPaymentMethodDtoValue.PayAtShop],
    ['online_payment', AccessoryPaymentMethodDtoValue.PayMongo],
  ])('normalizes legacy payment method %s before validation', async (alias, canonical) => {
    const dto = plainToInstance(AccessoryCheckoutDto, {
      paymentMethod: alias,
      contact: {
        name: 'Queue Customer',
        phone: '09171234567',
        email: 'queue.customer@example.com',
      },
    });

    expect(dto.paymentMethod).toBe(canonical);
    await expect(validate(dto)).resolves.toEqual([]);
  });
});
