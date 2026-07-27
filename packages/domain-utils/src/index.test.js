import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeEmail,
  normalizePhoneNumber,
  validateEmail,
  validatePhoneNumber,
} from './index.js';

test('normalizes and validates staff contact fields', () => {
  assert.equal(normalizeEmail(' Staff@Example.COM '), 'staff@example.com');
  assert.equal(normalizePhoneNumber('+63 917 123 4567'), '63917123456');
  assert.equal(validateEmail('invalid'), 'Enter a valid email address.');
  assert.equal(validatePhoneNumber('09171234567'), '');
});
