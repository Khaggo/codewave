import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMobileDeepLinkUrl,
  getDashboardContentKey,
  normalizeNavigationId,
  tabs,
} from './dashboardNavigationModel.mjs';

test('mobile navigation exposes the five approved customer destinations', () => {
  assert.deepEqual(
    tabs.map(({ key, label }) => ({ key, label })),
    [
      { key: 'explore', label: 'Home' },
      { key: 'messages', label: 'Garage' },
      { key: 'notifications', label: 'Book' },
      { key: 'insurance', label: 'Insurance' },
      { key: 'more', label: 'More' },
    ],
  );
});

test('dashboard content routing keeps approved tabs and internal rewards deterministic', () => {
  assert.deepEqual(
    ['explore', 'messages', 'notifications', 'insurance', 'rewards', 'more'].map(
      (tab) => getDashboardContentKey(tab),
    ),
    ['home', 'garage', 'booking', 'insurance', 'rewards', 'menu'],
  );
  assert.equal(getDashboardContentKey('unknown'), 'menu');
});

test('deep links normalize paths and omit blank query values', () => {
  assert.equal(
    buildMobileDeepLinkUrl('/insurance/status', {
      inquiryId: ' INQ-100 ',
      vehicleId: ' ',
    }),
    'autocarecc://insurance/status?inquiryId=INQ-100',
  );
});

test('navigation identifiers reject blank and non-string values', () => {
  assert.equal(normalizeNavigationId('  vehicle-1  '), 'vehicle-1');
  assert.equal(normalizeNavigationId('  '), null);
  assert.equal(normalizeNavigationId(42), null);
});
