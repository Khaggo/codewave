import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertMobileAppSessionAllowed,
  getMobileAppSessionAccessState,
} from './mobileSessionAccess.js';

test('mobile app access state allows active customer sessions', () => {
  assert.equal(
    getMobileAppSessionAccessState({
      accessToken: 'token-customer',
      userId: 'customer-1',
      role: 'customer',
      isActive: true,
    }),
    'customer_session_active',
  );
});

test('mobile app access guard accepts customer sessions', () => {
  assert.equal(
    assertMobileAppSessionAllowed({
      accessToken: 'token-customer',
      userId: 'customer-1',
      role: 'customer',
      isActive: true,
    }),
    'customer_session_active',
  );
});

test('mobile app access guard blocks staff portal roles', () => {
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
