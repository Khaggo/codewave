import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildHandoffCandidateRows,
  buildTechnicianAssignmentRows,
} from './jobOrderAssignmentsView.mjs';

test('technician assignment rows preserve selection and specialty drafts by profile', () => {
  const rows = buildTechnicianAssignmentRows({
    technicianOptions: [
      { id: 'tech-a', displayName: 'Alex' },
      { id: 'tech-b', displayName: 'Bea' },
    ],
    selectedTechnicianIds: ['tech-b'],
    selectedSpecialties: {
      'tech-b': 'electrical',
    },
  });

  assert.deepEqual(
    rows.map(({ account, checked, selectedSpecialty }) => ({
      id: account.id,
      checked,
      selectedSpecialty,
    })),
    [
      { id: 'tech-a', checked: false, selectedSpecialty: '' },
      { id: 'tech-b', checked: true, selectedSpecialty: 'electrical' },
    ],
  );
});

test('handoff candidate rows identify only the selected booking source', () => {
  const rows = buildHandoffCandidateRows({
    handoffCandidates: [
      { bookingId: 'booking-a' },
      { bookingId: 'booking-b' },
    ],
    selectedBookingId: 'booking-a',
  });

  assert.deepEqual(
    rows.map(({ candidate, selected }) => ({
      bookingId: candidate.bookingId,
      selected,
    })),
    [
      { bookingId: 'booking-a', selected: true },
      { bookingId: 'booking-b', selected: false },
    ],
  );
});

test('assignment view builders tolerate missing queue data', () => {
  assert.deepEqual(buildTechnicianAssignmentRows(), []);
  assert.deepEqual(buildHandoffCandidateRows(), []);
});
