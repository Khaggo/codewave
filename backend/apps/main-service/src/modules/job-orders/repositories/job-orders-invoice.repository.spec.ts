import { JobOrdersRepository } from './job-orders.repository';

function createDatabase(invoice: Record<string, unknown>, replay?: Record<string, unknown>) {
  const tx = {
    execute: jest.fn().mockResolvedValue({ rows: [] }),
    query: {
      jobOrderInvoiceRecords: { findFirst: jest.fn().mockResolvedValue(invoice) },
      jobOrderInvoiceCorrections: { findFirst: jest.fn().mockResolvedValue(replay ?? null) },
    },
    update: jest.fn(() => ({
      set: jest.fn(() => ({ where: jest.fn().mockResolvedValue([]) })),
    })),
    insert: jest.fn(() => ({ values: jest.fn().mockResolvedValue([]) })),
  };
  const db = {
    transaction: jest.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
    query: {
      jobOrders: { findFirst: jest.fn().mockResolvedValue({ id: 'job-1' }) },
    },
  };
  return { db, tx };
}

const correction = {
  expectedVersion: 2,
  idempotencyKey: 'invoice-correction-0001',
  requestFingerprint: 'a'.repeat(64),
  actorUserId: 'admin-1',
  reason: 'Corrected invoice details.',
  invoiceReference: 'INV-SVC-20260808-120000000',
  officialReceiptReference: 'OR-20260808-120000000',
};

describe('JobOrdersRepository invoice correction safeguards', () => {
  it('returns PAYMENT_REVERSAL_REQUIRED before changing a paid invoice', async () => {
    const { db, tx } = createDatabase({
      id: 'invoice-1',
      version: 2,
      paymentStatus: 'paid',
      paymentReversalStatus: 'not_required',
      invoiceReference: 'INV-SVC-20260808-100000000',
      lineItemSnapshots: [],
    });
    const repository = new JobOrdersRepository(db as never);

    await expect(repository.voidAndReissueInvoice('job-1', correction)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PAYMENT_REVERSAL_REQUIRED' }),
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('replays a matching idempotency key without a second write', async () => {
    const { db, tx } = createDatabase(
      {
        id: 'invoice-1',
        version: 3,
        paymentStatus: 'pending_payment',
        paymentReversalStatus: 'not_required',
        invoiceReference: 'INV-SVC-20260808-120000000',
        lineItemSnapshots: [],
      },
      {
        id: 'correction-1',
        requestFingerprint: correction.requestFingerprint,
      },
    );
    const repository = new JobOrdersRepository(db as never);

    await expect(repository.voidAndReissueInvoice('job-1', correction)).resolves.toEqual({
      id: 'job-1',
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });
});
