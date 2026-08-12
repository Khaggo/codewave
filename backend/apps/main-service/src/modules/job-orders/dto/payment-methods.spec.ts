import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { FinalizeJobOrderDto } from './finalize-job-order.dto';
import { RecordJobOrderInvoicePaymentDto } from './record-job-order-invoice-payment.dto';

describe('Job Order invoice payment methods', () => {
  it.each([
    ['bank-transfer', 'bank_transfer'],
    ['Bank Transfer', 'bank_transfer'],
    ['cheque', 'check'],
  ])('normalizes %s for manual invoice recording', async (alias, canonical) => {
    const dto = plainToInstance(RecordJobOrderInvoicePaymentDto, {
      amountPaidCents: 125000,
      paymentMethod: alias,
    });

    expect(dto.paymentMethod).toBe(canonical);
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('normalizes the same aliases for invoice finalization', async () => {
    const dto = plainToInstance(FinalizeJobOrderDto, {
      amountPaid: 1250,
      paymentMethod: 'bank-transfer',
    });

    expect(dto.paymentMethod).toBe('bank_transfer');
    await expect(validate(dto)).resolves.toEqual([]);
  });
});
