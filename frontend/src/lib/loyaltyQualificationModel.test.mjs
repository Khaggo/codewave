import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeLoyaltyQualificationAudit } from './loyaltyQualificationModel.mjs'

test('qualification audit keeps public references and strips internal identities', () => {
  const normalized = normalizeLoyaltyQualificationAudit({
    id: 'internal-observation-id',
    verifiedByUserId: 'internal-staff-id',
    vehicleId: 'internal-vehicle-id',
    status: 'qualified',
    vehiclePublicReference: 'VEH-2026-000123',
    vehicleLabel: 'Toyota Corolla (2021)',
    lastVerifiedAt: '2026-08-11T00:00:00.000Z',
    reasonCategory: 'sticker_verified',
    history: [{
      observation: 'verified_present',
      observedAt: '2026-08-11T00:00:00.000Z',
      intakeReference: 'INT-0001',
      verifiedByUserId: 'internal-staff-id',
    }],
  })

  assert.equal(normalized.vehiclePublicReference, 'VEH-2026-000123')
  assert.equal('id' in normalized, false)
  assert.equal('vehicleId' in normalized, false)
  assert.equal('verifiedByUserId' in normalized.history[0], false)
})
