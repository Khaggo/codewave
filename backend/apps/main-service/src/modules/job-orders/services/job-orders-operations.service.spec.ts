import { ForbiddenException } from '@nestjs/common';

import { JobOrdersService } from './job-orders.service';

const actor = { userId: 'adviser-1', role: 'service_adviser' };

function createService(overrides: Record<string, unknown> = {}) {
  const jobOrdersRepository = {
    findLatestByBookingSourceId: jest.fn().mockResolvedValue(null),
    findLatestByIntakeSourceId: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue({ invoiceRecord: { id: 'invoice-1' } }),
    voidAndReissueInvoice: jest.fn().mockResolvedValue({ id: 'job-1' }),
    completeInvoicePaymentReversal: jest.fn().mockResolvedValue({ id: 'job-1' }),
    ...overrides.jobOrdersRepository as object,
  };
  const bookingsRepository = {
    findOptionalById: jest.fn().mockResolvedValue({
      id: 'booking-1',
      userId: 'customer-1',
      vehicleId: 'vehicle-1',
      status: 'confirmed',
    }),
  };
  const usersService = {
    findById: jest.fn().mockResolvedValue({
      id: actor.userId,
      role: actor.role,
      isActive: true,
      staffCode: 'SA-1001',
    }),
  };
  const vehiclesRepository = {
    findById: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'customer-1' }),
  };
  const inspectionsRepository = {
    findById: jest.fn().mockResolvedValue({
      id: 'inspection-1',
      inspectionReference: 'INSP-2026-000001',
      inspectionType: 'intake',
      status: 'completed',
      vehicleId: 'vehicle-1',
      bookingId: null,
      intakeData: {
        visitType: 'regular_service',
        requestedServiceSummary: 'Brake service',
        serviceConcern: 'Brake vibration',
      },
      findings: [],
      notes: null,
    }),
  };
  const service = new JobOrdersService(
    jobOrdersRepository as never,
    bookingsRepository as never,
    {} as never,
    usersService as never,
    vehiclesRepository as never,
    {} as never,
    { publish: jest.fn() } as never,
    { completeClaim: jest.fn() } as never,
    inspectionsRepository as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );

  return {
    service,
    jobOrdersRepository,
    bookingsRepository,
    usersService,
    vehiclesRepository,
    inspectionsRepository,
  };
}

describe('JobOrdersService operations remediation', () => {
  it('uses the intake source for walk-ins and the booking source for booked intake', async () => {
    const walkIn = createService();
    jest.spyOn(walkIn.service, 'create').mockResolvedValue({ id: 'job-walk-in' } as never);
    jest.spyOn(walkIn.service, 'findById').mockResolvedValue({
      id: 'job-walk-in',
      jobOrderReference: 'JO-2026-000101',
    } as never);

    await expect(walkIn.service.sendIntakeToWorkshop('inspection-1', actor)).resolves.toEqual({
      jobOrderId: 'job-walk-in',
      reference: 'JO-2026-000101',
      created: true,
    });
    expect(walkIn.service.create).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: 'intake', sourceId: 'inspection-1' }),
      actor,
    );

    const booked = createService();
    booked.inspectionsRepository.findById.mockResolvedValue({
      ...(await walkIn.inspectionsRepository.findById()),
      bookingId: 'booking-1',
    });
    jest.spyOn(booked.service, 'create').mockResolvedValue({ id: 'job-booked' } as never);
    jest.spyOn(booked.service, 'findById').mockResolvedValue({
      id: 'job-booked',
      jobOrderReference: 'JO-2026-000102',
    } as never);

    await booked.service.sendIntakeToWorkshop('inspection-1', actor);
    expect(booked.service.create).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: 'booking', sourceId: 'booking-1' }),
      actor,
    );
  });

  it('returns the existing intake handoff without creating a duplicate', async () => {
    const context = createService({
      jobOrdersRepository: {
        findLatestByIntakeSourceId: jest.fn().mockResolvedValue({ id: 'job-existing' }),
      },
    });
    jest.spyOn(context.service, 'create');
    jest.spyOn(context.service, 'findById').mockResolvedValue({
      id: 'job-existing',
      jobOrderReference: 'JO-2026-000099',
    } as never);

    await expect(context.service.sendIntakeToWorkshop('inspection-1', actor)).resolves.toEqual({
      jobOrderId: 'job-existing',
      reference: 'JO-2026-000099',
      created: false,
    });
    expect(context.service.create).not.toHaveBeenCalled();
  });

  it('enforces super-admin invoice correction and forwards versioned idempotent snapshots', async () => {
    const context = createService();

    await expect(context.service.voidAndReissueInvoice(
      'job-1',
      'invoice-1',
      { correctionReason: 'Corrected labor amount.' },
      '"3"',
      'invoice-correction-0001',
      actor,
    )).rejects.toBeInstanceOf(ForbiddenException);

    context.usersService.findById.mockResolvedValue({
      id: 'admin-1',
      role: 'super_admin',
      isActive: true,
      staffCode: 'ADM-1',
    });
    await context.service.voidAndReissueInvoice(
      'job-1',
      'invoice-1',
      {
        correctionReason: 'Corrected labor amount.',
        lineItems: [{ category: 'labor', description: 'Labor', quantity: 2, unitAmountCents: 50000 }],
      },
      'W/"3"',
      'invoice-correction-0001',
      { userId: 'admin-1', role: 'super_admin' },
    );

    expect(context.jobOrdersRepository.voidAndReissueInvoice).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        expectedVersion: 3,
        idempotencyKey: 'invoice-correction-0001',
        actorUserId: 'admin-1',
        lineItemSnapshots: [expect.objectContaining({ lineAmountCents: 100000 })],
        requestFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });
});
