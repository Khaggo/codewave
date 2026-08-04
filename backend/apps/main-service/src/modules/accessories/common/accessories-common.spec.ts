import {
  assertAccessoryIdempotencyFingerprint,
  assertAccessoryOwner,
  decodeAccessoryCursor,
  encodeAccessoryCursor,
  fingerprintAccessoryPayload,
  generateAccessoryPickupCode,
  hashAccessoryPickupCode,
  normalizeAccessoryPageSize,
  parseAccessoryVersion,
  requireIdempotencyKey,
  stableAccessoryStockLockOrder,
  verifyAccessoryPickupCode,
} from './accessories-common';

describe('Accessories common invariants', () => {
  it('produces stable fingerprints for equivalent object payloads', () => {
    expect(fingerprintAccessoryPayload({ b: 2, a: { y: 2, x: 1 } })).toBe(
      fingerprintAccessoryPayload({ a: { x: 1, y: 2 }, b: 2 }),
    );
    expect(() => assertAccessoryIdempotencyFingerprint('a', 'b')).toThrow(
      'different request',
    );
  });

  it('validates idempotency and optimistic version headers', () => {
    expect(requireIdempotencyKey('checkout-123')).toBe('checkout-123');
    expect(() => requireIdempotencyKey('short')).toThrow('Idempotency-Key');
    expect(parseAccessoryVersion('W/"12"')).toBe(12);
    expect(() => parseAccessoryVersion(undefined)).toThrow('If-Match');
  });

  it('round trips only versioned cursors and bounds page sizes', () => {
    const cursor = encodeAccessoryCursor({
      id: 'order-id',
      createdAt: '2026-08-03T00:00:00.000Z',
    });
    expect(decodeAccessoryCursor(cursor)).toMatchObject({ version: 1, id: 'order-id' });
    expect(normalizeAccessoryPageSize(undefined)).toBe(20);
    expect(normalizeAccessoryPageSize(25)).toBe(25);
    expect(() => normalizeAccessoryPageSize(26)).toThrow('between 1 and 25');
    expect(() => decodeAccessoryCursor('broken')).toThrow('cursor is invalid');
  });

  it('deduplicates and sorts stock locks consistently', () => {
    expect(stableAccessoryStockLockOrder(['b', 'a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('keeps pickup codes six-digit and verifies only the stored hash', () => {
    const code = generateAccessoryPickupCode();
    expect(code).toMatch(/^\d{6}$/);
    const hash = hashAccessoryPickupCode('order-1', code);
    expect(hash).not.toContain(code);
    expect(verifyAccessoryPickupCode('order-1', code, hash)).toBe(true);
    expect(verifyAccessoryPickupCode('order-2', code, hash)).toBe(false);
  });

  it('fails closed when a customer accesses another owner record', () => {
    expect(() =>
      assertAccessoryOwner({ userId: 'customer-a', role: 'customer' }, 'customer-b'),
    ).toThrow('another customer');
  });
});
