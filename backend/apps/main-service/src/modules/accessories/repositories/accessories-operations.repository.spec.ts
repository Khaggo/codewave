import {
  ACCESSORY_OUTBOX_PROCESSING_LEASE_MS,
  AccessoriesOperationsRepository,
  accessoryOutboxLeaseUntil,
} from './accessories-operations.repository';

const collectStrings = (value: unknown, seen = new Set<object>()): string[] => {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, seen));
  return Object.values(value).flatMap((item) => collectStrings(item, seen));
};

describe('AccessoriesOperationsRepository', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('leases claimed outbox work and allows expired processing claims to be recovered', async () => {
    const now = new Date('2026-08-04T08:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    const returning = jest.fn().mockResolvedValue([{ id: 'outbox-1' }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    const execute = jest.fn().mockResolvedValue({ rows: [{ id: 'outbox-1' }] });
    const transaction = jest.fn(async (callback) => callback({ execute, update }));
    const repository = new AccessoriesOperationsRepository({ transaction } as never);

    await repository.claimOutboxBatch(25);

    const queryText = collectStrings(execute.mock.calls[0][0]).join(' ');
    expect(queryText).toContain("status in ('pending', 'failed', 'processing')");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'processing',
        availableAt: new Date(now.getTime() + ACCESSORY_OUTBOX_PROCESSING_LEASE_MS),
      }),
    );
  });

  it('computes a stable five-minute processing lease', () => {
    const now = new Date('2026-08-04T08:00:00.000Z');
    expect(accessoryOutboxLeaseUntil(now)).toEqual(
      new Date(now.getTime() + ACCESSORY_OUTBOX_PROCESSING_LEASE_MS),
    );
  });
});
