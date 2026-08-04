import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBookingAvailabilityWindow,
  buildBookingDateCardItem,
  clampDateKeyToRange,
  getFirstBookableBookingDateKey,
  parseDateOnly,
} from './bookingAvailabilityModel.mjs';

test('booking availability windows clamp to the configured booking range', () => {
  assert.deepEqual(
    buildBookingAvailabilityWindow({
      anchorDateKey: '2026-08-28',
      minimumDateKey: '2026-08-01',
      maximumDateKey: '2026-08-31',
      pageDays: 14,
    }),
    {
      startDate: '2026-08-18',
      endDate: '2026-08-31',
    },
  );
  assert.equal(
    clampDateKeyToRange('2026-07-01', '2026-08-01', '2026-08-31'),
    '2026-08-01',
  );
});

test('booking date cards expose slot conflicts and capacity without enabling selection', () => {
  const item = buildBookingDateCardItem(
    {
      scheduledDate: '2026-08-04',
      status: 'bookable',
      slots: [
        {
          timeSlotId: 'slot-am',
          isAvailable: false,
          remainingCapacity: 2,
          bookingCount: 2,
          capacity: 4,
        },
      ],
    },
    { id: 'slot-am', label: 'Morning' },
  );

  assert.equal(item.isSelectable, false);
  assert.equal(item.statusLabel, 'Blocked');
  assert.equal(item.capacityLabel, 'Blocked by vehicle or booking conflict');
  assert.match(item.detailLabel, /Morning is unavailable/);
});

test('first bookable date follows the selected slot instead of day-level availability', () => {
  const availability = {
    minBookableDate: '2026-08-01',
    days: [
      {
        scheduledDate: '2026-08-01',
        isBookable: true,
        slots: [{ timeSlotId: 'slot-pm', isAvailable: false }],
      },
      {
        scheduledDate: '2026-08-02',
        isBookable: true,
        slots: [{ timeSlotId: 'slot-pm', isAvailable: true }],
      },
    ],
  };

  assert.equal(getFirstBookableBookingDateKey(availability, 'slot-pm'), '2026-08-02');
});

test('date-only parsing rejects malformed calendar values', () => {
  assert.equal(parseDateOnly('not-a-date'), null);
  assert.equal(parseDateOnly('2026-08-04')?.getFullYear(), 2026);
});
