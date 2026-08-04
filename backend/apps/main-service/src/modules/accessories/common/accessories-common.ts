import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

export const ACCESSORY_PAGE_SIZE_MAX = 25;
export const ACCESSORY_DEFAULT_PAGE_SIZE = 20;
export const ACCESSORY_FULFILLMENT_CLAIMABLE_STATUSES = [
  'reserved',
  'paid',
  'preparing',
  'ready_for_pickup',
] as const;

export const isAccessoryFulfillmentClaimableStatus = (status: string): boolean =>
  ACCESSORY_FULFILLMENT_CLAIMABLE_STATUSES.includes(
    status as (typeof ACCESSORY_FULFILLMENT_CLAIMABLE_STATUSES)[number],
  );

export type AccessoryCommerceMode = 'off' | 'staff_preview' | 'catalog' | 'ordering';
export type AccessoryActor = {
  userId: string;
  role: 'customer' | 'service_adviser' | 'super_admin' | string;
};

export const accessoryError = (code: string, message: string) => ({ code, message });

export const requireIdempotencyKey = (value: string | undefined): string => {
  const key = value?.trim();
  if (!key || key.length < 8 || key.length > 200) {
    throw new BadRequestException(
      accessoryError(
        'ACCESSORY_IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key must contain between 8 and 200 characters.',
      ),
    );
  }
  return key;
};

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
};

export const fingerprintAccessoryPayload = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');

export const parseAccessoryVersion = (value: string | undefined): number => {
  const normalized = value?.trim().replace(/^W\//, '').replaceAll('"', '');
  const version = Number(normalized);
  if (!Number.isInteger(version) || version < 0) {
    throw new BadRequestException(
      accessoryError('ACCESSORY_VERSION_REQUIRED', 'If-Match must contain a valid integer version.'),
    );
  }
  return version;
};

export type AccessoryCursor = { version: 1; createdAt: string; id: string };

export const encodeAccessoryCursor = (cursor: Omit<AccessoryCursor, 'version'>): string =>
  Buffer.from(JSON.stringify({ version: 1, ...cursor }), 'utf8').toString('base64url');

export const decodeAccessoryCursor = (cursor?: string): AccessoryCursor | null => {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as AccessoryCursor;
    if (
      parsed.version !== 1 ||
      !parsed.id ||
      !parsed.createdAt ||
      Number.isNaN(Date.parse(parsed.createdAt))
    ) {
      throw new Error('invalid');
    }
    return parsed;
  } catch {
    throw new BadRequestException(
      accessoryError('ACCESSORY_CURSOR_INVALID', 'The Accessories page cursor is invalid.'),
    );
  }
};

export const normalizeAccessoryPageSize = (value?: number): number => {
  if (value === undefined) return ACCESSORY_DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(value) || value < 1 || value > ACCESSORY_PAGE_SIZE_MAX) {
    throw new BadRequestException(
      accessoryError('ACCESSORY_PAGE_SIZE_INVALID', 'Page size must be between 1 and 25.'),
    );
  }
  return value;
};

export const stableAccessoryStockLockOrder = (ids: string[]): string[] =>
  [...new Set(ids)].sort((left, right) => left.localeCompare(right));

export const assertAccessoryOwner = (actor: AccessoryActor, ownerUserId: string): void => {
  if (actor.role === 'customer' && actor.userId !== ownerUserId) {
    throw new ForbiddenException(
      accessoryError('ACCESSORY_OWNERSHIP_REQUIRED', 'You cannot access another customer\'s record.'),
    );
  }
};

export const assertAccessoryAdmin = (actor: AccessoryActor): void => {
  if (actor.role !== 'super_admin') {
    throw new ForbiddenException(
      accessoryError('ACCESSORY_ADMIN_REQUIRED', 'This action requires super-admin access.'),
    );
  }
};

export const assertAccessoryStaff = (actor: AccessoryActor): void => {
  if (!['service_adviser', 'super_admin'].includes(actor.role)) {
    throw new ForbiddenException(
      accessoryError('ACCESSORY_STAFF_REQUIRED', 'This action requires staff access.'),
    );
  }
};

export const generateAccessoryPickupCode = (): string =>
  String(randomInt(0, 1_000_000)).padStart(6, '0');

export const hashAccessoryPickupCode = (orderId: string, code: string): string =>
  createHash('sha256').update(`${orderId}:${code}`).digest('hex');

export const verifyAccessoryPickupCode = (
  orderId: string,
  code: string,
  expectedHash: string,
): boolean => {
  if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  return timingSafeEqual(
    Buffer.from(hashAccessoryPickupCode(orderId, code), 'hex'),
    Buffer.from(expectedHash, 'hex'),
  );
};

export const createAccessoryReference = (): string =>
  `AC-${new Date().getUTCFullYear()}-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;

export const assertAccessoryIdempotencyFingerprint = (
  existingFingerprint: string,
  requestedFingerprint: string,
): void => {
  if (existingFingerprint !== requestedFingerprint) {
    throw new ConflictException(
      accessoryError(
        'ACCESSORY_IDEMPOTENCY_CONFLICT',
        'This Idempotency-Key was already used with a different request.',
      ),
    );
  }
};
