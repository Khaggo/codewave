import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCreateAssignmentPatch,
  getJobOrderBookingCreateActionState,
  getTechnicianProfileSpecialties,
} from './jobOrderBookingCreateView.mjs'

const technicianOptions = [
  {
    id: 'profile-1',
    specialties: ['Electrical', 'Diagnostics'],
  },
]

test('job-order creation requires both a selected handoff and matching claim', () => {
  assert.equal(
    getJobOrderBookingCreateActionState({
      selectedCandidate: { bookingId: 'booking-1' },
      hasMatchingBookingHandoffClaim: true,
    }).canCreate,
    true,
  )
  assert.equal(
    getJobOrderBookingCreateActionState({
      selectedCandidate: { bookingId: 'booking-1' },
      hasMatchingBookingHandoffClaim: false,
    }).canCreate,
    false,
  )
  assert.equal(
    getJobOrderBookingCreateActionState({
      selectedCandidate: null,
      hasMatchingBookingHandoffClaim: true,
    }).canCreate,
    false,
  )
})

test('in-flight creation remains locked until the request settles', () => {
  assert.deepEqual(
    getJobOrderBookingCreateActionState({
      selectedCandidate: { bookingId: 'booking-1' },
      hasMatchingBookingHandoffClaim: true,
      createStatus: 'create_submitting',
    }),
    {
      canCreate: false,
      isSubmitting: true,
    },
  )
})

test('technician selection uses the profile first specialty and clears safely', () => {
  assert.deepEqual(
    buildCreateAssignmentPatch(technicianOptions, 'profile-1'),
    {
      assignedTechnicianId: 'profile-1',
      assignedSpecialty: 'Electrical',
    },
  )
  assert.deepEqual(buildCreateAssignmentPatch(technicianOptions, ''), {
    assignedTechnicianId: '',
    assignedSpecialty: '',
  })
  assert.deepEqual(
    getTechnicianProfileSpecialties(technicianOptions, 'missing'),
    [],
  )
})
