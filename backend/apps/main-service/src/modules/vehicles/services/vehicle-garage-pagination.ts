import { BadRequestException } from '@nestjs/common';

export type VehicleGarageCursor = {
  createdAt: Date;
  id: string;
};

type VehicleGarageCursorPayload = {
  v?: unknown;
  createdAt?: unknown;
  id?: unknown;
  search?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const normalizeVehicleGarageSearch = (search?: string) =>
  String(search ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const encodeVehicleGarageCursor = (
  cursor: VehicleGarageCursor,
  normalizedSearch: string,
) =>
  Buffer.from(
    JSON.stringify({
      v: 1,
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
      search: normalizedSearch,
    }),
    'utf8',
  ).toString('base64url');

export const decodeVehicleGarageCursor = (
  cursor: string | undefined,
  normalizedSearch: string,
): VehicleGarageCursor | undefined => {
  if (!cursor) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as VehicleGarageCursorPayload;
    const createdAt = new Date(String(parsed.createdAt ?? ''));

    if (
      parsed.v !== 1 ||
      Number.isNaN(createdAt.getTime()) ||
      typeof parsed.id !== 'string' ||
      !UUID_PATTERN.test(parsed.id) ||
      parsed.search !== normalizedSearch
    ) {
      throw new Error('Invalid cursor');
    }

    return {
      createdAt,
      id: parsed.id,
    };
  } catch {
    throw new BadRequestException('Garage cursor is invalid or expired');
  }
};
