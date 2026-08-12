import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapAuthoritativeStaffProfile,
  requireAuthoritativeStaffPhone,
} from './staffProfileSession.mjs'

test('accepts a persisted phone from array and object profile response shapes', () => {
  assert.equal(requireAuthoritativeStaffPhone({ profile: [{ phone: '09171234567' }] }, '09171234567'), '09171234567')
  assert.equal(requireAuthoritativeStaffPhone({ profile: { phone: '09181234567' } }, '09181234567'), '09181234567')
})

test('rejects failed, missing, or mismatched authoritative phone responses', () => {
  assert.throws(() => requireAuthoritativeStaffPhone(null, '09171234567'), /did not confirm/)
  assert.throws(() => requireAuthoritativeStaffPhone({ profile: { phone: '09181234567' } }, '09171234567'), /did not confirm/)
})

test('reload mapping replaces stale stored profile data with the authoritative response', () => {
  const mapped = mapAuthoritativeStaffProfile(
    { profile: [{ firstName: 'Alex', phone: '09191234567' }] },
    { profile: { firstName: 'Alex', phone: '09170000000' }, phone: '09170000000' },
  )

  assert.equal(mapped.phone, '09191234567')
  assert.equal(mapped.profile.phone, '09191234567')
})
