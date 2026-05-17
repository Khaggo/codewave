# Insurance Module Phase 3 Renewals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a phase-3 insurance renewals layer that adds manual staff renewal follow-up creation, expands renewal stages, introduces a dedicated staff renewals workspace, and keeps customer-facing renewal reminders lightweight and understandable.

**Architecture:** Keep the insurance inquiry as the main record and add renewals as a focused operational subflow. Introduce a staff-only manual renewal follow-up creation route, extend the shared renewal enum and list filters, then build a dedicated staff renewals page on top of the existing workflow route, activity history, and phase-2 insurance clients.

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, Next.js, React, React Native / Expo, `node:test`, Jest, Supertest

---

## Scope Guard
This implementation plan covers only the approved `Phase 3 Renewals` slice from the design spec:
- renewal enum expansion for the approved workflow stages
- staff-only manual renewal follow-up creation
- renewal-focused staff web workspace
- renewal queue time-window helper logic
- small customer-mobile renewal reminder and wording polish
- contracts and docs sync

Deferred to later plans:
- campaigns and promo broadcasts
- automated mass reminders
- dedicated renewals read-model API
- insurer-side integration
- deeper collections and renewals unification

## File Map
### Backend
- Create: `backend/apps/main-service/src/modules/insurance/dto/create-renewal-follow-up.dto.ts`
  Responsibility: staff-only manual renewal follow-up payload
- Modify: `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
  Responsibility: expose `POST /api/insurance/renewals/follow-ups`
- Modify: `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`
  Responsibility: create manual renewal follow-ups, map renewal workflow activities, and validate stage updates
- Modify: `backend/apps/main-service/src/modules/insurance/repositories/insurance.repository.ts`
  Responsibility: persist renewal follow-up creation, renewal enum expansion, and renewal activity entries
- Modify: `backend/apps/main-service/src/modules/insurance/dto/list-insurance-inquiries-query.dto.ts`
  Responsibility: allow purpose-based filtering for the renewals workspace
- Modify: `backend/apps/main-service/src/modules/insurance/dto/update-insurance-inquiry-workflow.dto.ts`
  Responsibility: remain the authoritative broader workflow payload for renewal stage and date updates
- Modify: `backend/apps/main-service/src/modules/insurance/dto/insurance-inquiry-response.dto.ts`
  Responsibility: ensure renewal metadata and expanded enum values remain documented
- Modify: `backend/apps/main-service/src/modules/insurance/schemas/insurance.schema.ts`
  Responsibility: expand renewal enum values and support renewal-centric persistence defaults
- Modify: `backend/apps/main-service/test/insurance.service.spec.ts`
- Modify: `backend/apps/main-service/test/insurance.integration.spec.ts`

### Shared Frontend Contract And Client
- Modify: `frontend/src/lib/api/generated/insurance/requests.ts`
- Modify: `frontend/src/lib/api/generated/insurance/responses.ts`
- Modify: `frontend/src/lib/api/generated/insurance/staff-web-insurance.ts`
- Modify: `frontend/src/lib/insuranceStaffClient.js`
- Modify: `frontend/src/app/insurance/insuranceView.test.mjs`

### Staff Web Renewals Workspace
- Create: `frontend/src/app/insurance/renewals/page.js`
  Responsibility: route entry for the renewals workspace
- Create: `frontend/src/app/insurance/renewals/RenewalsContent.js`
  Responsibility: renewals page with cards, filters, table, manual follow-up form, detail panel, and actions
- Create: `frontend/src/app/insurance/renewals/RenewalsPanels.js`
  Responsibility: small presentational panels for the renewals detail and creation flows
- Create: `frontend/src/app/insurance/renewals/insuranceRenewalsView.mjs`
  Responsibility: time-window, summary-card, row, and draft helper logic
- Create: `frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs`
  Responsibility: regression coverage for renewals helper logic

### Customer Mobile
- Modify: `mobile/src/lib/insuranceClient.js`
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
- New renewals helper tests: `node --test frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs`
- Frontend lint: `npm.cmd run lint`
- Mobile helper tests: `node --test mobile/src/screens/insuranceModuleView.test.mjs`

### Task 1: Add Backend Renewal Workflow Support And Manual Follow-Up Creation

**Files:**
- Modify: `backend/apps/main-service/test/insurance.integration.spec.ts`
- Modify: `backend/apps/main-service/test/insurance.service.spec.ts`
- Create: `backend/apps/main-service/src/modules/insurance/dto/create-renewal-follow-up.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/repositories/insurance.repository.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/dto/list-insurance-inquiries-query.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/schemas/insurance.schema.ts`

- [ ] **Step 1: Write the failing tests for manual renewal follow-up creation and expanded renewal workflow activities**

```typescript
it('creates a manual renewal follow-up through POST /api/insurance/renewals/follow-ups', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/insurance/renewals/follow-ups')
    .set('Authorization', `Bearer ${serviceAdviserToken}`)
    .send({
      userId: customer.id,
      vehicleId: vehicle.id,
      inquiryType: 'comprehensive',
      subject: 'Renewal due next month',
      description: 'Customer should receive a renewal quote before the current policy expires.',
      renewalDueAt: '2026-06-15T00:00:00.000Z',
      policyExpiryAt: '2026-06-20T00:00:00.000Z',
    })
    .expect(201);

  expect(response.body).toEqual(
    expect.objectContaining({
      purpose: 'renewal',
      status: 'for_renewal',
      renewalStatus: 'upcoming',
      renewalDueAt: '2026-06-15T00:00:00.000Z',
    }),
  );
});

it('appends renewal stage activities when a workflow update moves to quote_preparing', async () => {
  insuranceRepository.findById = jest.fn().mockResolvedValue({
    id: 'insurance-inquiry-1',
    status: 'for_renewal',
    renewalStatus: 'upcoming',
  });

  await service.updateWorkflow(
    'insurance-inquiry-1',
    {
      status: 'for_renewal',
      renewalStatus: 'quote_preparing',
      reviewNotes: 'Preparing the updated renewal quote now.',
    },
    { userId: 'adviser-1', role: 'service_adviser' },
  );

  expect(insuranceRepository.updateWorkflow).toHaveBeenCalledWith(
    'insurance-inquiry-1',
    expect.anything(),
    expect.arrayContaining([
      expect.objectContaining({
        action: 'renewal_quote_preparing',
        actorUserId: 'adviser-1',
      }),
    ]),
    undefined,
  );
});
```

- [ ] **Step 2: Run the backend targeted tests to verify they fail first**

Run: `npm.cmd test -- insurance.service.spec.ts insurance.integration.spec.ts`
Expected: FAIL because the manual renewals route and expanded renewal stage handling do not exist yet

- [ ] **Step 3: Add the route, DTO, enum expansion, and minimal renewal service/repository support**

```typescript
@Post('insurance/renewals/follow-ups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('service_adviser', 'super_admin')
createRenewalFollowUp(
  @Body() payload: CreateRenewalFollowUpDto,
  @Req() request: Request,
) {
  return this.insuranceService.createRenewalFollowUp(
    payload,
    request.user as { userId: string; role: string },
  );
}
```

```typescript
export const insuranceRenewalStatusEnum = pgEnum('insurance_renewal_status', [
  'not_applicable',
  'upcoming',
  'quote_preparing',
  'quoted',
  'awaiting_customer',
  'renewed',
  'expired',
  'cancelled',
]);
```

```typescript
async createRenewalFollowUp(payload: CreateRenewalFollowUpDto, actor: InsuranceActor) {
  await this.assertStaffReviewer(actor.userId);
  await this.assertCustomerAndVehicle(payload.userId, payload.vehicleId);

  return this.insuranceRepository.createRenewalFollowUp(
    {
      ...payload,
      createdByUserId: actor.userId,
    },
    {
      action: 'renewal_follow_up_created',
      actorUserId: actor.userId,
      notes: payload.notes ?? null,
    },
  );
}
```

- [ ] **Step 4: Run the backend targeted tests again to verify green**

Run: `npm.cmd test -- insurance.service.spec.ts insurance.integration.spec.ts`
Expected: PASS with manual renewal follow-up creation and renewal activity logging working

- [ ] **Step 5: Commit the backend renewals slice**

```bash
git add backend/apps/main-service/src/modules/insurance/dto/create-renewal-follow-up.dto.ts backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts backend/apps/main-service/src/modules/insurance/services/insurance.service.ts backend/apps/main-service/src/modules/insurance/repositories/insurance.repository.ts backend/apps/main-service/src/modules/insurance/dto/list-insurance-inquiries-query.dto.ts backend/apps/main-service/src/modules/insurance/schemas/insurance.schema.ts backend/apps/main-service/test/insurance.service.spec.ts backend/apps/main-service/test/insurance.integration.spec.ts
git commit -m "feat: add insurance renewals workflow support"
```

### Task 2: Add The Shared Frontend Renewals Contract And Client

**Files:**
- Modify: `frontend/src/lib/api/generated/insurance/requests.ts`
- Modify: `frontend/src/lib/api/generated/insurance/responses.ts`
- Modify: `frontend/src/lib/api/generated/insurance/staff-web-insurance.ts`
- Modify: `frontend/src/lib/insuranceStaffClient.js`
- Modify: `frontend/src/app/insurance/insuranceView.test.mjs`

- [ ] **Step 1: Write the failing client test for manual renewal follow-up creation**

```javascript
test('createInsuranceRenewalFollowUp posts a staff renewal follow-up to the live route', async () => {
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
        purpose: 'renewal',
        subject: 'Renewal follow-up',
        description: 'Manual follow-up',
        status: 'for_renewal',
        documentStatus: 'incomplete',
        paymentStatus: 'not_required',
        renewalStatus: 'upcoming',
        createdByUserId: 'staff-1',
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        documents: [],
        activities: [],
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    await createInsuranceRenewalFollowUp({
      userId: 'user-1',
      vehicleId: 'vehicle-1',
      inquiryType: 'comprehensive',
      subject: 'Renewal follow-up',
      description: 'Manual follow-up',
      renewalDueAt: '2026-06-15',
      accessToken: 'token-1',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.endsWith('/api/insurance/renewals/follow-ups'), true);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    userId: 'user-1',
    vehicleId: 'vehicle-1',
    inquiryType: 'comprehensive',
    subject: 'Renewal follow-up',
    description: 'Manual follow-up',
    renewalDueAt: '2026-06-15',
  });
});
```

- [ ] **Step 2: Run the staff helper tests to verify red**

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: FAIL because the client does not expose the manual renewal follow-up helper or expanded renewal route metadata yet

- [ ] **Step 3: Add the route contract, enum updates, and client helper**

```typescript
updateInquiryWorkflow: {
  method: 'PATCH',
  path: '/api/insurance/inquiries/:id/workflow',
  status: 'live',
  source: 'swagger',
},
createRenewalFollowUp: {
  method: 'POST',
  path: '/api/insurance/renewals/follow-ups',
  status: 'live',
  source: 'swagger',
  notes: 'Staff-only manual renewal follow-up creation route.',
},
```

```javascript
export const createInsuranceRenewalFollowUp = async ({
  userId,
  vehicleId,
  inquiryType,
  subject,
  description,
  renewalDueAt,
  policyExpiryAt,
  providerName,
  policyNumber,
  assignedStaffId,
  notes,
  accessToken,
}) =>
  normalizeInsuranceInquiryForStaff(
    await request('/api/insurance/renewals/follow-ups', {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        userId,
        vehicleId,
        inquiryType,
        subject,
        description,
        renewalDueAt,
        ...(normalizeOptionalWorkflowValue(policyExpiryAt) !== undefined
          ? { policyExpiryAt: normalizeOptionalWorkflowValue(policyExpiryAt) }
          : {}),
        ...(normalizeOptionalWorkflowValue(providerName) !== undefined
          ? { providerName: normalizeOptionalWorkflowValue(providerName) }
          : {}),
        ...(normalizeOptionalWorkflowValue(policyNumber) !== undefined
          ? { policyNumber: normalizeOptionalWorkflowValue(policyNumber) }
          : {}),
        ...(normalizeOptionalWorkflowValue(assignedStaffId) !== undefined
          ? { assignedStaffId: normalizeOptionalWorkflowValue(assignedStaffId) }
          : {}),
        ...(trimOrNull(notes) ? { notes: trimOrNull(notes) } : {}),
      },
    }),
  );
```

- [ ] **Step 4: Run the staff helper tests again to verify green**

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: PASS with the new renewals helper and expanded renewal enum support

- [ ] **Step 5: Commit the shared contract/client slice**

```bash
git add frontend/src/lib/api/generated/insurance/requests.ts frontend/src/lib/api/generated/insurance/responses.ts frontend/src/lib/api/generated/insurance/staff-web-insurance.ts frontend/src/lib/insuranceStaffClient.js frontend/src/app/insurance/insuranceView.test.mjs
git commit -m "feat: add insurance renewals client support"
```

### Task 3: Build Renewals Helper Logic With Tests

**Files:**
- Create: `frontend/src/app/insurance/renewals/insuranceRenewalsView.mjs`
- Create: `frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs`

- [ ] **Step 1: Write the failing helper tests for renewals summaries, windows, and rows**

```javascript
test('getRenewalsSummaryCards counts due windows and awaiting-customer renewals', () => {
  assert.deepEqual(
    getRenewalsSummaryCards({
      inquiries: [
        { renewalStatus: 'upcoming', renewalDueAt: '2026-06-13T00:00:00.000Z' },
        { renewalStatus: 'upcoming', renewalDueAt: '2026-05-29T00:00:00.000Z' },
        { renewalStatus: 'upcoming', renewalDueAt: '2026-05-21T00:00:00.000Z' },
        { renewalStatus: 'quoted', renewalDueAt: '2026-05-18T00:00:00.000Z' },
        { renewalStatus: 'awaiting_customer', renewalDueAt: '2026-05-26T00:00:00.000Z' },
      ],
      now: '2026-05-14T00:00:00.000Z',
    }).map((card) => [card.label, card.value]),
    [
      ['Due in 30 Days', 1],
      ['Due in 15 Days', 1],
      ['Due in 7 Days', 1],
      ['Overdue', 1],
      ['Awaiting Customer', 1],
    ],
  );
});

test('buildRenewalsTableRow calculates the time window from renewalDueAt first', () => {
  assert.deepEqual(
    buildRenewalsTableRow(
      {
        id: 'inq-1',
        customerDisplayName: 'Casey Customer',
        vehicleLabel: 'Toyota Vios',
        renewalStatus: 'quote_preparing',
        renewalDueAt: '2026-05-21T00:00:00.000Z',
        policyExpiryAt: '2026-05-30T00:00:00.000Z',
      },
      { now: '2026-05-14T00:00:00.000Z' },
    ),
    expect.objectContaining({
      key: 'inq-1',
      customer: 'Casey Customer',
      renewalStage: 'Quote Preparing',
      timeWindow: 'Due in 7 Days',
    }),
  );
});
```

- [ ] **Step 2: Run the new renewals helper tests to verify red**

Run: `node --test frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs`
Expected: FAIL because the helper file does not exist yet

- [ ] **Step 3: Implement the minimal renewals helper functions**

```javascript
export const getRenewalTimeWindow = ({ renewalDueAt, policyExpiryAt, now = new Date().toISOString() } = {}) => {
  const targetDate = renewalDueAt ?? policyExpiryAt;
  if (!targetDate) {
    return 'No Target Date';
  }

  const diffDays = getCalendarDayDifference({ targetDate, now });
  if (diffDays < 0) return 'Overdue';
  if (diffDays <= 7) return 'Due in 7 Days';
  if (diffDays <= 15) return 'Due in 15 Days';
  if (diffDays <= 30) return 'Due in 30 Days';
  return 'Later';
};

export const getRenewalsSummaryCards = ({ inquiries = [], now = new Date().toISOString() } = {}) => [
  { label: 'Due in 30 Days', value: countRenewalsInWindow(inquiries, 'Due in 30 Days', now) },
  { label: 'Due in 15 Days', value: countRenewalsInWindow(inquiries, 'Due in 15 Days', now) },
  { label: 'Due in 7 Days', value: countRenewalsInWindow(inquiries, 'Due in 7 Days', now) },
  { label: 'Overdue', value: countRenewalsInWindow(inquiries, 'Overdue', now) },
  { label: 'Awaiting Customer', value: inquiries.filter((inquiry) => inquiry?.renewalStatus === 'awaiting_customer').length },
];
```

- [ ] **Step 4: Run the new renewals helper tests again to verify green**

Run: `node --test frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs`
Expected: PASS with helper coverage for renewals cards, time windows, and rows

- [ ] **Step 5: Commit the renewals helper slice**

```bash
git add frontend/src/app/insurance/renewals/insuranceRenewalsView.mjs frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs
git commit -m "feat: add insurance renewals helper logic"
```

### Task 4: Build The Staff Web Renewals Workspace

**Files:**
- Create: `frontend/src/app/insurance/renewals/page.js`
- Create: `frontend/src/app/insurance/renewals/RenewalsContent.js`
- Create: `frontend/src/app/insurance/renewals/RenewalsPanels.js`
- Modify: `frontend/src/app/insurance/renewals/insuranceRenewalsView.mjs`
- Modify: `frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs`

- [ ] **Step 1: Extend the helper tests with a failing draft/action-state case for renewals**

```javascript
test('buildRenewalUpdateDraft keeps renewal workflow metadata editable for the renewals route', () => {
  assert.deepEqual(
    buildRenewalUpdateDraft({
      status: 'for_renewal',
      renewalStatus: 'quote_preparing',
      policyExpiryAt: '2026-06-20T00:00:00.000Z',
      renewalDueAt: '2026-06-15T00:00:00.000Z',
      assignedStaffId: 'staff-1',
      reviewNotes: 'Preparing quote',
    }),
    {
      status: 'for_renewal',
      renewalStatus: 'quote_preparing',
      policyExpiryAt: '2026-06-20',
      renewalDueAt: '2026-06-15',
      assignedStaffId: 'staff-1',
      reviewNotes: 'Preparing quote',
    },
  );
});
```

- [ ] **Step 2: Run the renewals helper tests to verify red**

Run: `node --test frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs`
Expected: FAIL because the renewal draft builder does not exist yet

- [ ] **Step 3: Implement the renewals page and use the broad workflow route plus manual follow-up creation route**

```javascript
export default function Page() {
  return <RenewalsContent />;
}
```

```javascript
const DEFAULT_RENEWALS_FILTERS = {
  timeWindow: 'all',
  renewalStatus: 'all',
  manualOnly: false,
  search: '',
};

const DEFAULT_RENEWAL_UPDATE_DRAFT = {
  status: 'for_renewal',
  renewalStatus: 'upcoming',
  policyExpiryAt: '',
  renewalDueAt: '',
  assignedStaffId: '',
  reviewNotes: '',
};
```

```javascript
const createdInquiry = await createInsuranceRenewalFollowUp({
  userId: createDraft.userId,
  vehicleId: createDraft.vehicleId,
  inquiryType: createDraft.inquiryType,
  subject: createDraft.subject,
  description: createDraft.description,
  renewalDueAt: createDraft.renewalDueAt,
  policyExpiryAt: createDraft.policyExpiryAt,
  assignedStaffId: createDraft.assignedStaffId,
  providerName: createDraft.providerName,
  policyNumber: createDraft.policyNumber,
  notes: createDraft.notes,
  accessToken: user.accessToken,
});

const updatedInquiry = await updateInsuranceInquiryWorkflow({
  inquiryId: selectedInquiry.id,
  status: updateDraft.status,
  renewalStatus: updateDraft.renewalStatus,
  policyExpiryAt: updateDraft.policyExpiryAt,
  renewalDueAt: updateDraft.renewalDueAt,
  assignedStaffId: updateDraft.assignedStaffId,
  reviewNotes: updateDraft.reviewNotes,
  accessToken: user.accessToken,
});
```

- [ ] **Step 4: Run the renewals helper tests and frontend lint**

Run: `node --test frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs`
Expected: PASS

Run: `npm.cmd run lint`
Expected: PASS with no lint errors after the new renewals page is added

- [ ] **Step 5: Commit the renewals page slice**

```bash
git add frontend/src/app/insurance/renewals/page.js frontend/src/app/insurance/renewals/RenewalsContent.js frontend/src/app/insurance/renewals/RenewalsPanels.js frontend/src/app/insurance/renewals/insuranceRenewalsView.mjs frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs
git commit -m "feat: add insurance renewals workspace"
```

### Task 5: Polish Customer Mobile Renewal Messaging

**Files:**
- Modify: `mobile/src/lib/insuranceClient.js`
- Modify: `mobile/src/screens/insuranceModuleView.mjs`
- Modify: `mobile/src/screens/insuranceModuleView.test.mjs`
- Modify: `mobile/src/screens/InsuranceInquiryScreen.js`

- [ ] **Step 1: Write the failing mobile helper test for customer renewal reminders**

```javascript
test('renewal reminder summary uses customer-safe due-soon wording', () => {
  assert.equal(
    getCustomerInsuranceRenewalSummary({
      renewalStatus: 'quote_preparing',
      renewalDueAt: '2026-05-21T00:00:00.000Z',
      now: '2026-05-14T00:00:00.000Z',
    }).title,
    'Renewal quote in progress',
  );
});
```

- [ ] **Step 2: Run the mobile helper tests to verify red**

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: FAIL because due-soon renewal summary helpers do not exist yet

- [ ] **Step 3: Add the minimal helper and wire the screen copy to it**

```javascript
export const getCustomerInsuranceRenewalSummary = ({
  renewalStatus = 'not_applicable',
  renewalDueAt = null,
  policyExpiryAt = null,
  now = new Date().toISOString(),
} = {}) => {
  const window = getRenewalTimeWindow({ renewalDueAt, policyExpiryAt, now });

  if (renewalStatus === 'quote_preparing') {
    return {
      title: 'Renewal quote in progress',
      message: 'Staff are preparing your renewal quote now.',
    };
  }

  if (renewalStatus === 'awaiting_customer') {
    return {
      title: 'Renewal waiting for you',
      message: 'Staff are waiting for your response to continue the renewal.',
    };
  }

  return {
    title: window === 'Overdue' ? 'Renewal overdue' : 'Renewal reminder',
    message: 'Renewal details and next steps will appear here when staff schedule your follow-up.',
  };
};
```

- [ ] **Step 4: Run the mobile helper tests again to verify green**

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: PASS with the new customer-safe renewal reminder behavior

- [ ] **Step 5: Commit the mobile renewals polish**

```bash
git add mobile/src/lib/insuranceClient.js mobile/src/screens/insuranceModuleView.mjs mobile/src/screens/insuranceModuleView.test.mjs mobile/src/screens/InsuranceInquiryScreen.js
git commit -m "feat: polish insurance renewal follow-up on mobile"
```

### Task 6: Sync The Contracts And Domain Docs

**Files:**
- Modify: `docs/contracts/T110-insurance-inquiry-core.md`
- Modify: `docs/contracts/T514-insurance-customer-intake-mobile-flow.md`
- Modify: `docs/contracts/T515-insurance-review-and-status-web-flow.md`
- Modify: `docs/architecture/domains/main-service/insurance.md`

- [ ] **Step 1: Write the failing contract checklist inside the docs themselves**

```markdown
- live `POST /api/insurance/renewals/follow-ups` creates staff-only renewal cases with `purpose: renewal`
- live `PATCH /api/insurance/inquiries/:id/workflow` remains the broader route for renewal stage and date updates after creation
- staff renewals workspace defaults to time-window triage, not to stage-only grouping
- mobile renewal messaging remains customer-safe and does not expose internal queue jargon
```

- [ ] **Step 2: Run a stale-contract scan before editing**

Run: `rg -n "renewals|renewalStatus|renewalDueAt|policyExpiryAt|quote_preparing|awaiting_customer|renewed" docs/contracts/T110-insurance-inquiry-core.md docs/contracts/T514-insurance-customer-intake-mobile-flow.md docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md`
Expected: old docs do not yet describe the phase-3 renewals route and queue behavior completely

- [ ] **Step 3: Update the docs to reflect the new route, enum expansion, and renewals workspace**

```markdown
- `POST /api/insurance/renewals/follow-ups`
  staff-only live route for creating manual renewal follow-up cases
- `PATCH /api/insurance/inquiries/:id/workflow`
  broader live route for adviser/admin renewal stage and date updates
```

- [ ] **Step 4: Re-run the stale-contract scan**

Run: `rg -n "renewals|renewalStatus|renewalDueAt|policyExpiryAt|quote_preparing|awaiting_customer|renewed" docs/contracts/T110-insurance-inquiry-core.md docs/contracts/T514-insurance-customer-intake-mobile-flow.md docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md`
Expected: matches the new renewals route and queue behavior

- [ ] **Step 5: Commit the doc sync**

```bash
git add docs/contracts/T110-insurance-inquiry-core.md docs/contracts/T514-insurance-customer-intake-mobile-flow.md docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md
git commit -m "docs: sync insurance phase-3 renewals contracts"
```

### Task 7: Final Verification Pass

**Files:**
- Verify only; no file ownership

- [ ] **Step 1: Run the backend targeted tests**

Run: `npm.cmd test -- insurance.service.spec.ts insurance.integration.spec.ts`
Expected: PASS with manual renewal creation, enum expansion, and renewal activity logging

- [ ] **Step 2: Run the existing staff helper tests**

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: PASS with the shared insurance client still intact

- [ ] **Step 3: Run the new renewals helper tests**

Run: `node --test frontend/src/app/insurance/renewals/insuranceRenewalsView.test.mjs`
Expected: PASS with time-window cards, rows, and draft helpers covered

- [ ] **Step 4: Run frontend lint**

Run: `npm.cmd run lint`
Expected: PASS with no ESLint errors

- [ ] **Step 5: Run the mobile helper tests**

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: PASS with the renewal reminder polish covered

## Self-Review
- Manual renewal creation is intentionally staff-only so customer intake remains clean.
- The renewals queue defaults to urgency by date, with stage as a secondary filter as approved.
- Renewed and cancelled work are designed to leave the active queue instead of diluting staff focus.
- Mobile work stays intentionally small and does not become a second renewals operations surface.
