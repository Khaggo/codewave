import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFileSync(resolve(TEST_DIR, relativePath), 'utf8');

test('app login path admits workshop sessions through the shared mobile access guard', () => {
  const appSource = read('../../App.js');

  assert.match(appSource, /assertMobileAppSessionAllowed/);
  assert.match(appSource, /const accessState = assertMobileAppSessionAllowed\(nextAccount\)/);
  assert.doesNotMatch(
    appSource,
    /const accessState = getCustomerMobileSessionAccessState\(nextAccount\)/,
  );
});

test('technician dashboard stays role-aware for technician and head technician mobile sessions', () => {
  const dashboardSource = read('./TechnicianDashboard.js');

  assert.match(dashboardSource, /account\?\.role === 'head_technician'/);
  assert.match(dashboardSource, /Lead field execution, keep the workshop record current/);
  assert.match(dashboardSource, /const roleLabel = account\?\.role === 'head_technician' \? 'Head Technician' : 'Technician'/);
  assert.match(dashboardSource, /listAssignedJobOrders/);
  assert.match(dashboardSource, /updateJobOrderStatus/);
  assert.match(dashboardSource, /addJobOrderProgress/);
  assert.match(dashboardSource, /addJobOrderPhotoEvidence/);
});
