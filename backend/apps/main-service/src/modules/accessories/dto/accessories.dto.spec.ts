import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AccessoryCheckoutDto, AccessoryPaymentMethodDtoValue } from './accessories.dto';

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
});
