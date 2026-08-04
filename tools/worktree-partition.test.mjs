import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyChange,
  parsePorcelainV1Z,
  partitionChanges,
} from './worktree-partition.mjs';

test('parses modified, untracked, deleted, and renamed porcelain entries', () => {
  const changes = parsePorcelainV1Z(
    ' M mobile/App.js\0?? tools/new.mjs\0 D old.js\0R  new.js\0old-name.js\0',
  );

  assert.deepEqual(changes, [
    { status: ' M', file: 'mobile/App.js', source: null },
    { status: '??', file: 'tools/new.mjs', source: null },
    { status: ' D', file: 'old.js', source: null },
    { status: 'R ', file: 'new.js', source: 'old-name.js' },
  ]);
});

test('gives retired scope precedence over general application groups', () => {
  assert.equal(
    classifyChange({ status: ' D', file: 'backend/apps/ecommerce-service/src/app.ts' }),
    '03-service-only-scope-removal',
  );
  assert.equal(
    classifyChange({ status: ' D', file: 'mobile/src/lib/catalogClient.js' }),
    '03-service-only-scope-removal',
  );
  assert.equal(
    classifyChange({ status: ' D', file: 'mobile/src/screens/TechnicianDashboard.js' }),
    '03-service-only-scope-removal',
  );
  assert.equal(
    classifyChange({ status: ' D', file: 'frontend/src/hooks/useOperationsStore.js' }),
    '03-service-only-scope-removal',
  );
  assert.equal(
    classifyChange({ status: ' D', file: 'backend/shared/events/contracts/commerce-events.ts' }),
    '03-service-only-scope-removal',
  );
});

test('classifies the new Accessories namespace before retired commerce terms', () => {
  const examples = [
    'backend/apps/main-service/src/modules/accessories/catalog/accessories-catalog.service.ts',
    'frontend/src/app/admin/accessories/catalog/page.js',
    'mobile/src/screens/accessories/AccessoriesCatalogScreen.js',
    'qa/playwright/tests/accessories-checkout.flow.spec.mjs',
  ];

  for (const file of examples) {
    assert.equal(classifyChange({ status: '??', file }), '02-accessories-store');
  }
});

test('classifies representative active subsystem paths', () => {
  const examples = [
    ['backend/drizzle/0000_service_baseline.sql', '04-database-and-contracts'],
    [
      'backend/apps/main-service/src/modules/job-orders/job-orders.module.ts',
      '07-backend-job-order-and-qa',
    ],
    ['frontend/src/screens/QAAuditWorkspace.js', '11-staff-job-order-and-qa'],
    ['mobile/src/screens/insurance/InsuranceHomePanel.js', '14-mobile-insurance-and-garage'],
    ['qa/playwright/tests/booking-to-cash.flow.spec.mjs', '17-qa-storybook-and-evidence'],
    ['frontend/.storybook/main.mjs', '17-qa-storybook-and-evidence'],
    ['playwright.ui.config.mjs', '17-qa-storybook-and-evidence'],
    ['storybook-confirm-dialog-desktop.png', '17-qa-storybook-and-evidence'],
    ['docs/project-control/CURRENT_STATE.md', '18-documentation-and-planning'],
  ];

  for (const [file, expected] of examples) {
    assert.equal(classifyChange({ status: ' M', file }), expected);
  }
});

test('assigns every change exactly once and reports unsafe states', () => {
  const changes = [
    { status: ' M', file: 'mobile/App.js', source: null },
    { status: '??', file: 'unknown.bin', source: null },
    { status: 'UU', file: 'frontend/conflict.js', source: null },
  ];

  const report = partitionChanges(changes);
  const assigned = report.groups.flatMap((group) => group.changes);

  assert.equal(assigned.length, changes.length);
  assert.equal(new Set(assigned).size, changes.length);
  assert.equal(report.summary.untracked, 1);
  assert.equal(report.summary.conflicts, 1);
  assert.equal(report.summary.unclassified, 1);
});
