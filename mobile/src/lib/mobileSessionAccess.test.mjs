import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertMobileAppSessionAllowed,
  getMobileAppSessionAccessState,
} from './mobileSessionAccess.js';

test('getMobileAppSessionAccessState allows active technician sessions', () => {
  const accessState = getMobileAppSessionAccessState({
    accessToken: 'token-123',
    userId: 'tech-1',
    role: 'technician',
    isActive: true,
  });

  assert.equal(accessState, 'technician_session_active');
});

test('getMobileAppSessionAccessState keeps active customer sessions allowed', () => {
  const accessState = getMobileAppSessionAccessState({
    accessToken: 'token-456',
    userId: 'customer-1',
    role: 'customer',
    isActive: true,
  });

  assert.equal(accessState, 'customer_session_active');
});

test('assertMobileAppSessionAllowed rejects deactivated customer sessions', () => {
  assert.throws(
    () =>
      assertMobileAppSessionAllowed({
        accessToken: 'token-789',
        userId: 'customer-2',
        role: 'customer',
        isActive: false,
      }),
    (error) =>
      error instanceof Error &&
      error.message ===
        'This customer account is deactivated. Contact support if access should be restored.',
  );
});
