# Insurance Module Phase 2 Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a phase-2 insurance collections layer that adds a real workflow-update API, a staff collections workspace, payment verification actions, due-date and overdue handling, and small mobile payment follow-up polish.

**Architecture:** Keep the insurance inquiry as the main record and add collections as a focused operational subflow. Introduce a broad `PATCH /api/insurance/inquiries/:id/workflow` route for metadata updates instead of overloading the narrow status route, then build a dedicated staff collections page on top of the existing staff list and activity history.

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, Next.js, React, React Native / Expo, `node:test`, Jest, Supertest

---

## Scope Guard
This implementation plan covers only the approved `Phase 2 Collections` slice from the design spec:
- broader workflow-update route for collections metadata
- collections-focused staff web workspace
- proof-of-payment verification flow
- payment due date and overdue handling
- payment reminder activity logging
- small customer-mobile payment-state polish

Deferred to later plans:
- renewals workspace
- renewal quote flow
- campaigns and promo broadcasts
- dedicated `GET /api/insurance/collections` read model
- bulk messaging engine

## File Map
### Backend
- Modify: `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
  Responsibility: expose `PATCH /api/insurance/inquiries/:id/workflow`
- Modify: `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`
  Responsibility: validate broader workflow updates and append collections activity entries
- Modify: `backend/apps/main-service/src/modules/insurance/repositories/insurance.repository.ts`
  Responsibility: persist workflow metadata and activity log entries
- Modify: `backend/apps/main-service/src/modules/insurance/dto/update-insurance-inquiry-workflow.dto.ts`
  Responsibility: remain the authoritative broader workflow payload for collections
- Modify: `backend/apps/main-service/src/modules/insurance/dto/insurance-inquiry-response.dto.ts`
  Responsibility: ensure workflow metadata and activities remain documented
- Modify: `backend/apps/main-service/test/insurance.service.spec.ts`
- Modify: `backend/apps/main-service/test/insurance.integration.spec.ts`

### Shared Frontend Contract And Client
- Modify: `frontend/src/lib/api/generated/insurance/requests.ts`
- Modify: `frontend/src/lib/api/generated/insurance/staff-web-insurance.ts`
- Modify: `frontend/src/lib/insuranceStaffClient.js`
- Modify: `frontend/src/app/insurance/insuranceView.test.mjs`

### Staff Web Collections Workspace
- Create: `frontend/src/app/insurance/collections/page.js`
  Responsibility: route entry for the collections workspace
- Create: `frontend/src/app/insurance/collections/CollectionsContent.js`
  Responsibility: collections-specific page with filters, summary cards, table, detail panel, and actions
- Create: `frontend/src/app/insurance/collections/insuranceCollectionsView.mjs`
  Responsibility: summary-card, table-row, due-date, overdue, and action-state helpers
- Create: `frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs`
  Responsibility: regression coverage for collections helper logic

### Customer Mobile
- Modify: `mobile/src/screens/insuranceModuleView.mjs`
- Modify: `mobile/src/screens/insuranceModuleView.test.mjs`
- Modify: `mobile/src/screens/InsuranceInquiryScreen.js`

### Contracts And Docs
- Modify: `docs/contracts/T110-insurance-inquiry-core.md`
- Modify: `docs/contracts/T514-insurance-customer-intake-mobile-flow.md`
- Modify: `docs/contracts/T515-insurance-review-and-status-web-flow.md`
- Modify: `docs/architecture/domains/main-service/insurance.md`

### Verification Commands
- Backend targeted tests: `npm.cmd test -- insurance.service.spec.ts insurance.integration.spec.ts`
- Existing staff helper tests: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
- New collections helper tests: `node --test frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs`
- Frontend lint: `npm.cmd run lint`
- Mobile helper tests: `node --test mobile/src/screens/insuranceModuleView.test.mjs`

### Task 1: Add The Broad Backend Workflow Route For Collections

**Files:**
- Modify: `backend/apps/main-service/test/insurance.integration.spec.ts`
- Modify: `backend/apps/main-service/test/insurance.service.spec.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/repositories/insurance.repository.ts`

- [ ] **Step 1: Write the failing tests for the new workflow route and collections activity logging**

```typescript
it('accepts adviser workflow metadata updates through PATCH /api/insurance/inquiries/:id/workflow', async () => {
  const response = await request(app.getHttpServer())
    .patch(`/api/insurance/inquiries/${createdInquiry.id}/workflow`)
    .set('Authorization', `Bearer ${serviceAdviserToken}`)
    .send({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      paymentDueAt: '2026-06-01T00:00:00.000Z',
      reviewNotes: 'Proof uploaded and waiting for finance review.',
    })
    .expect(200);

  expect(response.body).toEqual(
    expect.objectContaining({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      paymentDueAt: '2026-06-01T00:00:00.000Z',
      reviewNotes: 'Proof uploaded and waiting for finance review.',
    }),
  );
});

it('appends payment-marked-paid activity when workflow updates move a case to paid', async () => {
  insuranceRepository.findById = jest.fn().mockResolvedValue({
    id: 'insurance-inquiry-1',
    status: 'payment_pending',
    paymentStatus: 'proof_submitted',
    renewalStatus: 'not_applicable',
  });

  await service.updateWorkflow(
    'insurance-inquiry-1',
    {
      status: 'active',
      paymentStatus: 'paid',
      reviewNotes: 'Official receipt confirmed by adviser.',
    },
    { userId: 'adviser-1', role: 'service_adviser' },
  );

  expect(insuranceRepository.appendActivity).toHaveBeenCalledWith(
    'insurance-inquiry-1',
    expect.objectContaining({
      action: 'payment_marked_paid',
      actorUserId: 'adviser-1',
    }),
  );
});
```

- [ ] **Step 2: Run the backend targeted tests to verify they fail first**

Run: `npm.cmd test -- insurance.service.spec.ts insurance.integration.spec.ts`
Expected: FAIL because `/workflow` is not exposed yet and `updateWorkflow` does not append collections activity entries

- [ ] **Step 3: Add the controller route and the minimal service-side collections activity mapping**

```typescript
@Patch('insurance/inquiries/:id/workflow')
@HttpCode(HttpStatus.OK)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('service_adviser', 'super_admin')
updateWorkflow(
  @Param('id') id: string,
  @Body() payload: UpdateInsuranceInquiryWorkflowDto,
  @Req() request: Request,
) {
  return this.insuranceService.updateWorkflow(id, payload, request.user as { userId: string; role: string });
}
```

```typescript
const buildCollectionsActivities = ({
  previousInquiry,
  nextPayload,
  actorUserId,
}: {
  previousInquiry: { paymentStatus?: string | null; paymentDueAt?: string | Date | null };
  nextPayload: UpdateInsuranceInquiryWorkflowDto;
  actorUserId: string;
}) => {
  const activities = [];

  if (nextPayload.paymentStatus === 'paid' && previousInquiry.paymentStatus !== 'paid') {
    activities.push({ action: 'payment_marked_paid', actorUserId });
  }

  if (nextPayload.paymentStatus === 'overdue' && previousInquiry.paymentStatus !== 'overdue') {
    activities.push({ action: 'payment_marked_overdue', actorUserId });
  }

  if (nextPayload.paymentStatus === 'verifying' && previousInquiry.paymentStatus !== 'verifying') {
    activities.push({ action: 'payment_verification_started', actorUserId });
  }

  if (nextPayload.paymentDueAt !== undefined) {
    activities.push({ action: 'payment_due_date_updated', actorUserId });
  }

  return activities;
};
```

```typescript
const updatedInquiry = await this.insuranceRepository.updateWorkflow(id, workflowPatch);
for (const activity of buildCollectionsActivities({ previousInquiry: inquiry, nextPayload: payload, actorUserId: actor.userId })) {
  await this.insuranceRepository.appendActivity(id, activity);
}
return this.insuranceRepository.findById(id);
```

- [ ] **Step 4: Run the backend targeted tests again to verify green**

Run: `npm.cmd test -- insurance.service.spec.ts insurance.integration.spec.ts`
Expected: PASS with the new route working and collections activities appended for relevant workflow changes

- [ ] **Step 5: Commit the backend workflow-route slice**

```bash
git add backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts backend/apps/main-service/src/modules/insurance/services/insurance.service.ts backend/apps/main-service/src/modules/insurance/repositories/insurance.repository.ts backend/apps/main-service/test/insurance.service.spec.ts backend/apps/main-service/test/insurance.integration.spec.ts
git commit -m "feat: add insurance workflow route for collections"
```

### Task 2: Add The Shared Frontend Workflow Contract And Client

**Files:**
- Modify: `frontend/src/lib/api/generated/insurance/requests.ts`
- Modify: `frontend/src/lib/api/generated/insurance/staff-web-insurance.ts`
- Modify: `frontend/src/lib/insuranceStaffClient.js`
- Modify: `frontend/src/app/insurance/insuranceView.test.mjs`

- [ ] **Step 1: Write the failing client test for the new workflow route**

```javascript
test('updateInsuranceInquiryWorkflow posts collections metadata to the workflow route', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify({
        id: 'inq-1',
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        purpose: 'quotation',
        subject: 'Payment follow-up',
        description: 'Customer inquiry',
        status: 'payment_pending',
        documentStatus: 'complete',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'not_applicable',
        createdByUserId: 'staff-1',
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        documents: [],
        activities: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    await updateInsuranceInquiryWorkflow({
      inquiryId: 'inq-1',
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      paymentDueAt: '2026-06-01',
      reviewNotes: 'Waiting for finance check.',
      accessToken: 'token-1',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.endsWith('/api/insurance/inquiries/inq-1/workflow'), true);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    status: 'payment_pending',
    paymentStatus: 'proof_submitted',
    paymentDueAt: '2026-06-01',
    reviewNotes: 'Waiting for finance check.',
  });
});
```

- [ ] **Step 2: Run the staff helper tests to verify red**

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: FAIL because the client does not expose `updateInsuranceInquiryWorkflow` or the workflow route key yet

- [ ] **Step 3: Add the route contract, request type, and client helper**

```typescript
export const insuranceRoutes: Record<string, RouteContract> = {
  // ...
  updateInquiryWorkflow: {
    method: 'PATCH',
    path: '/api/insurance/inquiries/:id/workflow',
    status: 'live',
    source: 'swagger',
    notes: 'Broader adviser/admin workflow route for collections and later renewals.',
  },
};
```

```javascript
export const updateInsuranceInquiryWorkflow = async ({
  inquiryId,
  status,
  documentStatus,
  paymentStatus,
  renewalStatus,
  paymentDueAt,
  policyExpiryAt,
  renewalDueAt,
  assignedStaffId,
  reviewNotes,
  accessToken,
}) =>
  normalizeInsuranceInquiryForStaff(
    await request(`/api/insurance/inquiries/${inquiryId}/workflow`, {
      method: 'PATCH',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        status,
        ...(documentStatus !== undefined ? { documentStatus } : {}),
        ...(paymentStatus !== undefined ? { paymentStatus } : {}),
        ...(renewalStatus !== undefined ? { renewalStatus } : {}),
        ...(trimOrNull(paymentDueAt) ? { paymentDueAt: trimOrNull(paymentDueAt) } : {}),
        ...(trimOrNull(policyExpiryAt) ? { policyExpiryAt: trimOrNull(policyExpiryAt) } : {}),
        ...(trimOrNull(renewalDueAt) ? { renewalDueAt: trimOrNull(renewalDueAt) } : {}),
        ...(trimOrNull(assignedStaffId) ? { assignedStaffId: trimOrNull(assignedStaffId) } : {}),
        reviewNotes: trimOrNull(reviewNotes) ?? undefined,
      },
    }),
  );
```

- [ ] **Step 4: Run the staff helper tests again to verify green**

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: PASS with the new workflow-route client helper posting the broader collections payload

- [ ] **Step 5: Commit the shared contract/client slice**

```bash
git add frontend/src/lib/api/generated/insurance/requests.ts frontend/src/lib/api/generated/insurance/staff-web-insurance.ts frontend/src/lib/insuranceStaffClient.js frontend/src/app/insurance/insuranceView.test.mjs
git commit -m "feat: add insurance workflow client for collections"
```

### Task 3: Build Collections Helper Logic With Tests

**Files:**
- Create: `frontend/src/app/insurance/collections/insuranceCollectionsView.mjs`
- Create: `frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs`

- [ ] **Step 1: Write the failing helper tests for collections summaries, rows, and actions**

```javascript
test('getCollectionsSummaryCards counts unpaid, proof-submitted, verifying, overdue, and paid-this-week cases', () => {
  assert.deepEqual(
    getCollectionsSummaryCards({
      inquiries: [
        { paymentStatus: 'unpaid', status: 'payment_pending' },
        { paymentStatus: 'proof_submitted', status: 'payment_pending' },
        { paymentStatus: 'verifying', status: 'payment_pending' },
        { paymentStatus: 'overdue', status: 'payment_pending' },
        { paymentStatus: 'paid', status: 'active', updatedAt: '2026-05-14T00:00:00.000Z' },
      ],
      now: '2026-05-14T12:00:00.000Z',
    }).map((card) => [card.label, card.value]),
    [
      ['Unpaid', 1],
      ['Proof Submitted', 1],
      ['Verifying', 1],
      ['Overdue', 1],
      ['Paid This Week', 1],
    ],
  );
});

test('buildCollectionsTableRow calculates overdue days and proof visibility', () => {
  assert.deepEqual(
    buildCollectionsTableRow({
      id: 'inq-1',
      customerDisplayName: 'Casey Customer',
      vehicleLabel: 'Toyota Vios',
      status: 'payment_pending',
      paymentStatus: 'overdue',
      paymentDueAt: '2026-05-10T00:00:00.000Z',
      documents: [{ documentType: 'proof_of_payment', fileName: 'receipt.pdf' }],
    }, { now: '2026-05-14T00:00:00.000Z' }),
    expect.objectContaining({
      key: 'inq-1',
      customer: 'Casey Customer',
      paymentStatus: 'Overdue',
      daysOverdue: 4,
      hasProofOfPayment: true,
    }),
  );
});
```

- [ ] **Step 2: Run the new collections helper tests to verify red**

Run: `node --test frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs`
Expected: FAIL because the helper file does not exist yet

- [ ] **Step 3: Implement the minimal collections helper functions**

```javascript
export const buildCollectionsTableRow = (inquiry, { now = new Date().toISOString() } = {}) => ({
  key: inquiry?.id ?? '',
  customer: inquiry?.customerDisplayName || 'Unknown customer',
  vehicle: inquiry?.vehicleLabel || 'Unknown vehicle',
  status: formatStatusLabel(inquiry?.status),
  paymentStatus: formatStatusLabel(inquiry?.paymentStatus),
  paymentDueAt: inquiry?.paymentDueAt ?? null,
  daysOverdue: getDaysOverdue({ paymentDueAt: inquiry?.paymentDueAt, now }),
  hasProofOfPayment: Array.isArray(inquiry?.documents) && inquiry.documents.some((document) => document?.documentType === 'proof_of_payment'),
});

export const getCollectionsSummaryCards = ({ inquiries = [], now = new Date().toISOString() } = {}) => [
  { label: 'Unpaid', value: countByPaymentStatus(inquiries, 'unpaid') },
  { label: 'Proof Submitted', value: countByPaymentStatus(inquiries, 'proof_submitted') },
  { label: 'Verifying', value: countByPaymentStatus(inquiries, 'verifying') },
  { label: 'Overdue', value: countByPaymentStatus(inquiries, 'overdue') },
  { label: 'Paid This Week', value: countPaidThisWeek(inquiries, now) },
];
```

- [ ] **Step 4: Run the new collections helper tests again to verify green**

Run: `node --test frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs`
Expected: PASS with helper coverage for collections cards, rows, and due-date calculations

- [ ] **Step 5: Commit the collections helper slice**

```bash
git add frontend/src/app/insurance/collections/insuranceCollectionsView.mjs frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs
git commit -m "feat: add insurance collections helper logic"
```

### Task 4: Build The Staff Web Collections Workspace

**Files:**
- Create: `frontend/src/app/insurance/collections/page.js`
- Create: `frontend/src/app/insurance/collections/CollectionsContent.js`
- Modify: `frontend/src/app/insurance/collections/insuranceCollectionsView.mjs`
- Modify: `frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs`

- [ ] **Step 1: Extend the helper tests with a failing draft/action-state case for the collections page**

```javascript
test('buildCollectionsUpdateDraft keeps payment metadata editable for the collections workflow route', () => {
  assert.deepEqual(
    buildCollectionsUpdateDraft({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      paymentDueAt: '2026-06-01T00:00:00.000Z',
      reviewNotes: 'Uploaded receipt',
    }),
    {
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      paymentDueAt: '2026-06-01',
      reviewNotes: 'Uploaded receipt',
    },
  );
});
```

- [ ] **Step 2: Run the collections helper tests to verify red**

Run: `node --test frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs`
Expected: FAIL because the collections draft builder does not exist yet

- [ ] **Step 3: Implement the collections page and use the broad workflow route**

```javascript
export default function Page() {
  return <CollectionsContent />;
}
```

```javascript
const DEFAULT_COLLECTIONS_FILTERS = {
  paymentStatus: 'all',
  overdueOnly: false,
  hasProof: 'all',
  search: '',
};

const DEFAULT_UPDATE_DRAFT = {
  status: 'payment_pending',
  paymentStatus: 'unpaid',
  paymentDueAt: '',
  reviewNotes: '',
};
```

```javascript
const updatedInquiry = await updateInsuranceInquiryWorkflow({
  inquiryId: selectedInquiry.id,
  status: updateDraft.status,
  paymentStatus: updateDraft.paymentStatus,
  paymentDueAt: updateDraft.paymentDueAt,
  reviewNotes: updateDraft.reviewNotes,
  accessToken: user.accessToken,
});
```

- [ ] **Step 4: Run the collections helper tests and frontend lint**

Run: `node --test frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs`
Expected: PASS

Run: `npm.cmd run lint`
Expected: PASS with no lint errors after the new route and page are added

- [ ] **Step 5: Commit the collections page slice**

```bash
git add frontend/src/app/insurance/collections/page.js frontend/src/app/insurance/collections/CollectionsContent.js frontend/src/app/insurance/collections/insuranceCollectionsView.mjs frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs
git commit -m "feat: add insurance collections workspace"
```

### Task 5: Polish Customer Mobile Payment-State Messaging

**Files:**
- Modify: `mobile/src/screens/insuranceModuleView.mjs`
- Modify: `mobile/src/screens/insuranceModuleView.test.mjs`
- Modify: `mobile/src/screens/InsuranceInquiryScreen.js`

- [ ] **Step 1: Write the failing mobile helper test for due-date-aware payment prompts**

```javascript
test('payment follow-up prompt includes overdue urgency and due-date visibility', () => {
  assert.equal(
    getCustomerInsurancePaymentSummary({
      status: 'payment_pending',
      paymentStatus: 'overdue',
      paymentDueAt: '2026-05-10T00:00:00.000Z',
      now: '2026-05-14T00:00:00.000Z',
    }).title,
    'Payment overdue',
  );
});
```

- [ ] **Step 2: Run the mobile helper tests to verify red**

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: FAIL because due-date-aware payment summary helper does not exist yet

- [ ] **Step 3: Add the minimal helper and wire the screen copy to it**

```javascript
export const getCustomerInsurancePaymentSummary = ({
  status = 'submitted',
  paymentStatus = 'not_required',
  paymentDueAt = null,
  now = new Date().toISOString(),
} = {}) => {
  const daysOverdue = getDaysOverdue({ paymentDueAt, now });
  if (paymentStatus === 'overdue') {
    return {
      title: 'Payment overdue',
      message: daysOverdue > 0
        ? `This request is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue for payment. Upload proof after payment or contact staff for help.`
        : 'This request is overdue for payment. Upload proof after payment or contact staff for help.',
    };
  }

  return {
    title: 'Payment follow-up',
    message: paymentDueAt
      ? `Payment is being tracked for this request. Due date: ${paymentDueAt}.`
      : 'Payment instructions will appear here when staff tag the request for follow-up.',
  };
};
```

- [ ] **Step 4: Run the mobile helper tests again to verify green**

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: PASS with the new due-date-aware payment summary behavior

- [ ] **Step 5: Commit the mobile collections polish**

```bash
git add mobile/src/screens/insuranceModuleView.mjs mobile/src/screens/insuranceModuleView.test.mjs mobile/src/screens/InsuranceInquiryScreen.js
git commit -m "feat: polish insurance payment follow-up on mobile"
```

### Task 6: Sync The Contracts And Domain Docs

**Files:**
- Modify: `docs/contracts/T110-insurance-inquiry-core.md`
- Modify: `docs/contracts/T514-insurance-customer-intake-mobile-flow.md`
- Modify: `docs/contracts/T515-insurance-review-and-status-web-flow.md`
- Modify: `docs/architecture/domains/main-service/insurance.md`

- [ ] **Step 1: Write the failing contract checklist inside the docs themselves**

```markdown
- live `PATCH /api/insurance/inquiries/:id/status` remains narrow and only accepts `status` and optional `reviewNotes`
- live `PATCH /api/insurance/inquiries/:id/workflow` becomes the broader adviser/admin route for payment and later renewal metadata
- staff collections workspace uses the broader workflow route
- mobile payment follow-up remains customer-safe and upload-driven
```

- [ ] **Step 2: Run a stale-contract scan before editing**

Run: `rg -n "updateInquiryStatus|updateInquiryWorkflow|collections|payment_pending|overdue" docs/contracts/T110-insurance-inquiry-core.md docs/contracts/T514-insurance-customer-intake-mobile-flow.md docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md`
Expected: old docs do not yet describe the phase-2 collections route and behavior completely

- [ ] **Step 3: Update the docs to reflect the new route split and collections workspace**

```markdown
- `PATCH /api/insurance/inquiries/:id/status`
  narrow live route for `status` and optional `reviewNotes`
- `PATCH /api/insurance/inquiries/:id/workflow`
  broader live route for adviser/admin workflow metadata including payment collections updates
```

- [ ] **Step 4: Re-run the stale-contract scan**

Run: `rg -n "updateInquiryStatus|updateInquiryWorkflow|collections|payment_pending|overdue" docs/contracts/T110-insurance-inquiry-core.md docs/contracts/T514-insurance-customer-intake-mobile-flow.md docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md`
Expected: matches the new route split and collections behavior

- [ ] **Step 5: Commit the doc sync**

```bash
git add docs/contracts/T110-insurance-inquiry-core.md docs/contracts/T514-insurance-customer-intake-mobile-flow.md docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md
git commit -m "docs: sync insurance phase-2 collections contracts"
```

### Task 7: Final Verification Pass

**Files:**
- Verify only; no file ownership

- [ ] **Step 1: Run the backend targeted tests**

Run: `npm.cmd test -- insurance.service.spec.ts insurance.integration.spec.ts`
Expected: PASS with the workflow route, collections activity logging, and unchanged phase-1 flows

- [ ] **Step 2: Run the existing staff helper tests**

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: PASS with the narrow status-route client still intact

- [ ] **Step 3: Run the new collections helper tests**

Run: `node --test frontend/src/app/insurance/collections/insuranceCollectionsView.test.mjs`
Expected: PASS with collections summaries, rows, and draft helpers

- [ ] **Step 4: Run frontend lint**

Run: `npm.cmd run lint`
Expected: PASS with no ESLint errors

- [ ] **Step 5: Run the mobile helper tests**

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: PASS with the payment-state polish covered

## Self-Review
- Backend route split is explicitly covered in Tasks 1, 2, and 6.
- Collections workspace is isolated from the phase-1 general insurance page so the narrow save path remains safe.
- Mobile work stays intentionally small and does not grow into a second collections UI.
- Renewals are preserved in contract shape but not expanded into full workspace scope in this plan.
