import { BadRequestException } from '@nestjs/common';

import {
  decodeVehicleGarageCursor,
  encodeVehicleGarageCursor,
  normalizeVehicleGarageSearch,
} from '@main-modules/vehicles/services/vehicle-garage-pagination';

describe('vehicle Garage pagination', () => {
  it('round-trips a cursor for the same normalized search', () => {
    const search = normalizeVehicleGarageSearch('  Toyota   Vios ');
    const cursor = encodeVehicleGarageCursor(
      {
        createdAt: new Date('2026-07-29T08:00:00.000Z'),
        id: '2f56da35-0e03-4bd4-9ed8-505dbf2231da',
      },
      search,
    );

    expect(decodeVehicleGarageCursor(cursor, search)).toEqual({
      createdAt: new Date('2026-07-29T08:00:00.000Z'),
      id: '2f56da35-0e03-4bd4-9ed8-505dbf2231da',
    });
  });

  it('rejects malformed cursors and cursors reused under another search', () => {
    expect(() => decodeVehicleGarageCursor('not-a-cursor', '')).toThrow(
      BadRequestException,
    );

    const cursor = encodeVehicleGarageCursor(
      {
        createdAt: new Date('2026-07-29T08:00:00.000Z'),
        id: '2f56da35-0e03-4bd4-9ed8-505dbf2231da',
      },
      'toyota',
    );
    expect(() => decodeVehicleGarageCursor(cursor, 'honda')).toThrow(
      'Garage cursor is invalid or expired',
    );
  });
});
