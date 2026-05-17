import { Test } from '@nestjs/testing';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';

import { UsersService } from '../src/modules/users/services/users.service';
import { LoyaltyRuntimeService } from '../src/modules/loyalty/services/loyalty-runtime.service';
import { LoyaltyService } from '../src/modules/loyalty/services/loyalty.service';

describe('LoyaltyRuntimeService', () => {
  it('subscribes to service payment events and forwards them to loyalty accrual', async () => {
    const loyaltyService = {
      applyLoyaltyAccrual: jest.fn().mockResolvedValue({
        wasAwarded: true,
      }),
      ensureDefaultServicePaymentRule: jest.fn().mockResolvedValue({ id: 'default-rule-1' }),
    };
    const usersService = {
      listStaffAccounts: jest.fn().mockResolvedValue([
        {
          id: 'admin-1',
          role: 'super_admin',
          isActive: true,
        },
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AutocareEventBusService,
        LoyaltyRuntimeService,
        { provide: LoyaltyService, useValue: loyaltyService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    const runtimeService = moduleRef.get(LoyaltyRuntimeService);
    const eventBus = moduleRef.get(AutocareEventBusService);

    await runtimeService.onModuleInit();

    eventBus.publish('service.payment_recorded', {
      jobOrderId: 'job-order-1',
      invoiceRecordId: 'invoice-record-1',
      invoiceReference: 'SRV-INV-2026-0001',
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      serviceAdviserUserId: 'adviser-1',
      serviceAdviserCode: 'SA-1001',
      recordedByUserId: 'cashier-1',
      sourceType: 'booking',
      sourceId: 'booking-1',
      amountPaidCents: 125000,
      currencyCode: 'PHP',
      paidAt: '2026-05-14T09:00:00.000Z',
      settlementStatus: 'paid',
      paymentMethod: 'cash',
      paymentReference: 'OR-2026-0001',
      serviceTypeCode: 'preventive_maintenance',
      serviceCategoryCode: 'maintenance',
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(loyaltyService.ensureDefaultServicePaymentRule).toHaveBeenCalledWith({
      userId: 'admin-1',
      role: 'super_admin',
    });
    expect(loyaltyService.applyLoyaltyAccrual).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'service.payment_recorded',
        payload: expect.objectContaining({
          invoiceRecordId: 'invoice-record-1',
          customerUserId: 'customer-1',
        }),
      }),
    );

    runtimeService.onModuleDestroy();
  });
});
