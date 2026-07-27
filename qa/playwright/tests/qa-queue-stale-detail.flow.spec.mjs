import { expect, test } from '@playwright/test';

import { qaAccounts, runtimeConfig } from '../helpers/config.mjs';
import { loginStaff } from '../helpers/flows.mjs';

const records = {
  a: {
    id: 'qa-race-job-order-a',
    reference: 'JO-QA-RACE-A',
    claimId: 'qa-race-claim-a',
    customerName: 'Race Test Customer A',
    vehicleName: 'Toyota Vios A',
    plateNumber: 'RACE-A',
  },
  b: {
    id: 'qa-race-job-order-b',
    reference: 'JO-QA-RACE-B',
    claimId: 'qa-race-claim-b',
    customerName: 'Race Test Customer B',
    vehicleName: 'Toyota Vios B',
    plateNumber: 'RACE-B',
  },
};

function createDeferred() {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function buildGate(record, overrides = {}) {
  return {
    id: `gate-${record.id}`,
    jobOrderId: record.id,
    status: 'pending_review',
    version: 1,
    riskScore: record === records.a ? 10 : 5,
    preCheckStatus: 'passed',
    blockingReason: null,
    reviewerVerdict: null,
    reviewerNote: null,
    reviewedAt: null,
    requestedAt: '2026-07-27T08:00:00.000Z',
    findings: [],
    overrides: [],
    auditJob: {
      status: 'completed',
      completedAt: '2026-07-27T08:00:01.000Z',
    },
    preCheckSummary: {
      totalWorkItemCount: 1,
      completedWorkItemCount: 1,
      photoCount: 1,
      progressEntryCount: 1,
    },
    ...overrides,
  };
}

function queueItem(record) {
  return {
    entityType: 'job_order',
    entityId: record.id,
    jobOrderId: record.id,
    reference: record.reference,
    status: 'ready_for_qa',
    customerName: record.customerName,
    vehicleName: record.vehicleName,
    plateNumber: record.plateNumber,
    riskScore: record === records.a ? 10 : 5,
    priorityReason: 'Deterministic QA race fixture',
    queueEnteredAt: '2026-07-27T08:00:00.000Z',
    claim: {
      id: record.claimId,
      ownerName: 'QA Booking Adviser',
      isMine: true,
      expiresAt: '2026-07-27T10:00:00.000Z',
    },
  };
}

function corsHeaders() {
  return {
    'access-control-allow-origin': runtimeConfig.staffBaseUrl,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'Authorization, Content-Type, X-Work-Claim-Id, If-Match',
    'access-control-allow-methods': 'GET, PATCH, POST, PUT, OPTIONS',
  };
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    headers: {
      ...corsHeaders(),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function installQaHarness(page, {
  initialRecord = 'a',
  delayedGateRecord = '',
  noNextWork = false,
  verdictFailure = false,
} = {}) {
  let currentRecord = initialRecord;
  let shouldFailVerdict = verdictFailure;
  const delayedGateRequested = createDeferred();
  const releaseDelayedGate = createDeferred();
  const consoleErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.route('**/api/staff-work-queues/qa**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    const record = currentRecord ? records[currentRecord] : null;
    await fulfillJson(route, {
      items: record ? [queueItem(record)] : [],
      page: {
        hasNext: false,
        nextCursor: null,
      },
      summary: {
        total: record ? 1 : 0,
        assigned: record ? 1 : 0,
        unassigned: 0,
        mine: record ? 1 : 0,
        blocked: 0,
        overdue: 0,
        oldestWaitSeconds: 0,
      },
      session: {
        available: true,
        currentClaimId: record?.claimId ?? null,
        currentClaim: record ? queueItem(record).claim : null,
      },
    });
  });

  await page.route('**/api/staff-work-queues/claims/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/release')) {
      currentRecord = '';
      await fulfillJson(route, { released: true });
      return;
    }

    await fulfillJson(route, { heartbeatAt: '2026-07-27T08:01:00.000Z' });
  });

  await page.route('**/api/staff-work-queues/qa/session', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }
    await fulfillJson(route, { available: false, currentClaimId: null });
  });

  await page.route('**/api/job-orders/*/qa**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const record = Object.values(records).find(({ id }) => pathname.includes(`/${id}/qa`));

    if (!record) {
      await fulfillJson(route, { message: 'Unknown deterministic QA record.' }, 404);
      return;
    }

    if (request.method() === 'PATCH' && pathname.endsWith('/verdict')) {
      if (shouldFailVerdict) {
        await fulfillJson(route, { message: 'Deterministic verdict failure.' }, 503);
        return;
      }

      const requestBody = request.postDataJSON();
      currentRecord = noNextWork ? '' : 'b';
      await fulfillJson(route, buildGate(record, {
        status: requestBody.verdict === 'blocked' ? 'blocked' : 'passed',
        version: 2,
        reviewerVerdict: requestBody.verdict,
        reviewerNote: requestBody.note,
        reviewedAt: '2026-07-27T08:05:00.000Z',
      }));
      return;
    }

    if (request.method() === 'GET') {
      if (delayedGateRecord && record === records[delayedGateRecord]) {
        delayedGateRequested.resolve();
        await releaseDelayedGate.promise;
      }

      const staleMarker = record === records.a && delayedGateRecord === 'a'
        ? {
            status: 'passed',
            version: 2,
            reviewerVerdict: 'passed',
            reviewerNote: 'STALE A VERDICT MUST NEVER RENDER UNDER B',
            reviewedAt: '2026-07-27T08:04:00.000Z',
          }
        : {};

      await fulfillJson(route, buildGate(record, staleMarker)).catch(() => {});
      return;
    }

    await fulfillJson(route, { message: 'Unsupported deterministic QA request.' }, 405);
  });

  return {
    consoleErrors,
    setCurrentRecord(value) {
      currentRecord = value;
    },
    setVerdictFailure(value) {
      shouldFailVerdict = value;
    },
    waitForDelayedGate() {
      return delayedGateRequested.promise;
    },
    releaseGate() {
      releaseDelayedGate.resolve();
    },
  };
}

async function openQaWorkspace(page, harnessOptions) {
  await loginStaff(page, qaAccounts.adviser, '/bookings');
  const harness = await installQaHarness(page, harnessOptions);
  await page.goto(`${runtimeConfig.staffBaseUrl}/admin/qa-audit`);
  await expect(page.getByRole('heading', { name: 'QA Audit' })).toBeVisible();
  return harness;
}

async function expectLoadedRecord(page, record) {
  const selectedAudit = page.locator('#selected-qa-audit');
  await expect(selectedAudit.getByText(record.reference, { exact: true })).toBeVisible();
  await expect(selectedAudit.getByText(record.id, { exact: true })).toHaveCount(0);
  await expect(page.locator(`a[href="/admin/job-orders/${record.id}"]`).first()).toBeVisible();
}

test('a late QA response cannot overwrite a newer selected record', async ({ page }) => {
  const harness = await openQaWorkspace(page, {
    initialRecord: 'a',
    delayedGateRecord: 'a',
  });

  await harness.waitForDelayedGate();
  harness.setCurrentRecord('b');
  await page.getByRole('button', { name: 'Refresh queue' }).click();
  await expectLoadedRecord(page, records.b);

  harness.releaseGate();

  await expectLoadedRecord(page, records.b);
  await expect(page.getByText('STALE A VERDICT MUST NEVER RENDER UNDER B', { exact: true })).toHaveCount(0);
  expect(harness.consoleErrors).toEqual([]);
});

test('passing A clears its detail and automatically opens claimed record B', async ({ page }) => {
  const harness = await openQaWorkspace(page);
  const passedNote = 'A passed note must remain attached only to A.';

  await expectLoadedRecord(page, records.a);
  await page.getByRole('textbox', { name: 'Note' }).fill(passedNote);
  await page.getByRole('button', { name: 'Record Verdict' }).click();

  await expectLoadedRecord(page, records.b);
  await expect(page.getByRole('textbox', { name: 'Note' })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Verdict' })).toHaveValue('passed');
  await expect(page.getByText(passedNote, { exact: true })).toHaveCount(0);
  expect(harness.consoleErrors).toEqual([]);
});

test('passing the final waiting record preserves the completion receipt', async ({ page }) => {
  const harness = await openQaWorkspace(page, { noNextWork: true });

  await expectLoadedRecord(page, records.a);
  await page.getByRole('textbox', { name: 'Note' }).fill('No next work completion note.');
  await page.getByRole('button', { name: 'Record Verdict' }).click();

  await expect(page.getByText(
    `${records.a.reference} passed QA. You can take the next review.`,
    { exact: true },
  )).toBeVisible();
  await expect(page.getByText('No audit loaded', { exact: true })).toBeVisible();
  expect(harness.consoleErrors).toEqual([]);
});

test('a current verdict failure remains recoverable on the selected record', async ({ page }) => {
  const harness = await openQaWorkspace(page, { verdictFailure: true });

  await expectLoadedRecord(page, records.a);
  await page.getByRole('textbox', { name: 'Note' }).fill('Retryable verdict note.');
  await page.getByRole('button', { name: 'Record Verdict' }).click();

  await expect(page.getByText('Deterministic verdict failure.', { exact: true })).toBeVisible();
  await expectLoadedRecord(page, records.a);
  await expect(page.getByRole('button', { name: 'Record Verdict' })).toBeEnabled();
  harness.setVerdictFailure(false);
});

test('releasing work while detail is loading invalidates the pending response', async ({ page }) => {
  const harness = await openQaWorkspace(page, {
    initialRecord: 'a',
    delayedGateRecord: 'a',
  });

  await harness.waitForDelayedGate();
  await page.getByRole('button', { name: 'Release current work' }).click();
  harness.releaseGate();

  await expect(page.getByText('No audit loaded', { exact: true })).toBeVisible();
  await expect(page.getByText('STALE A VERDICT MUST NEVER RENDER UNDER B', { exact: true })).toHaveCount(0);
  expect(harness.consoleErrors).toEqual([]);
});
