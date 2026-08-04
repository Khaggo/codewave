import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertMobileAppSessionAllowed,
  getMobileAppSessionAccessState,
  resolveProtectedMobileAccount,
} from './mobileSessionAccess.js';

test('remembered registration data never becomes a protected mobile session', () => {
  const registeredAccount = {
    accessToken: 'stale-registration-token',
    userId: 'remembered-customer',
    role: 'customer',
  };

  assert.equal(
    resolveProtectedMobileAccount({
      activeAccount: null,
      registeredAccount,
    }),
    null,
  );
  assert.equal(getMobileAppSessionAccessState(null), 'unauthorized_session');
});

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

test('mobile app access guard blocks every authenticated staff role', () => {
  for (const role of [
    'service_adviser',
    'super_admin',
    'technician',
    'head_technician',
  ]) {
    assert.equal(
      getMobileAppSessionAccessState({
        accessToken: `token-${role}`,
        userId: `${role}-1`,
        role,
        isActive: true,
      }),
      'staff_session_blocked',
    );
    assert.throws(
      () =>
        assertMobileAppSessionAllowed({
          accessToken: `token-${role}`,
          userId: `${role}-1`,
          role,
          isActive: true,
        }),
      /mobile app is for customer accounts/i,
    );
  }
});
