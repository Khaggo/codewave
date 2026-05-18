import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertMobileAppSessionAllowed,
  getMobileAppSessionAccessState,
} from './mobileSessionAccess.js';

test('mobile app access state allows active technician workshop sessions', () => {
  assert.equal(
    getMobileAppSessionAccessState({
      accessToken: 'token-1',
      userId: 'tech-1',
      role: 'technician',
      isActive: true,
    }),
    'technician_session_active',
  );

  assert.equal(
    getMobileAppSessionAccessState({
      accessToken: 'token-2',
      userId: 'head-tech-1',
      role: 'head_technician',
      isActive: true,
    }),
    'technician_session_active',
  );
});

test('mobile app access guard accepts both customer and workshop sessions', () => {
  assert.equal(
    assertMobileAppSessionAllowed({
      accessToken: 'token-customer',
      userId: 'customer-1',
      role: 'customer',
      isActive: true,
    }),
    'customer_session_active',
  );

  assert.equal(
    assertMobileAppSessionAllowed({
      accessToken: 'token-tech',
      userId: 'tech-2',
      role: 'head_technician',
      isActive: true,
    }),
    'technician_session_active',
  );
});

test('mobile app access guard still blocks unrelated staff roles', () => {
  assert.throws(
    () =>
      assertMobileAppSessionAllowed({
        accessToken: 'token-adviser',
        userId: 'adviser-1',
        role: 'service_adviser',
        isActive: true,
      }),
    /supports customer and workshop sessions/i,
  );
});
