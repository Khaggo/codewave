# Insurance Module Phase 1 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a phase-1 insurance lifecycle across backend, staff web, and customer mobile that supports intake, binary document upload, staff review, status tracking, payment tagging, and renewal tagging.

**Architecture:** Extend the existing insurance inquiry domain instead of introducing a parallel module. Add missing workflow metadata, a staff list/read-model route, binary upload storage, and lightweight activity history in the backend; then rebuild the web admin and mobile insurance surfaces around small view helpers so state-heavy logic stays regression-testable.

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, Next.js, React, React Native / Expo, `node:test`, Jest, Supertest

---

## Scope Guard
This implementation plan covers only the approved `Phase 1 MVP` from the design spec:
- customer intake
- requirements checklist
- binary document upload
- staff review workspace
- status tracking
- payment status tagging
- renewal due tagging
- lightweight activity history

Deferred to later plans:
- campaigns
- customer segmentation
- analytics exports
- optional board/kanban view

## File Map
### Backend
- Modify: `backend/apps/main-service/src/modules/insurance/schemas/insurance.schema.ts`
  Responsibility: add phase-1 workflow enums and persistence fields
- Create: `backend/apps/main-service/src/modules/insurance/schemas/insurance-activity.schema.ts`
  Responsibility: store lightweight insurance case activity events
- Create: `backend/apps/main-service/src/modules/insurance/dto/list-insurance-inquiries-query.dto.ts`
  Responsibility: parse staff-admin table filters
- Create: `backend/apps/main-service/src/modules/insurance/dto/update-insurance-inquiry-workflow.dto.ts`
  Responsibility: accept status, payment, renewal, assignment, and note updates
- Create: `backend/apps/main-service/src/modules/insurance/dto/upload-insurance-document.dto.ts`
  Responsibility: accept multipart document type and optional note fields
- Create: `backend/apps/main-service/src/modules/insurance/dto/upload-insurance-document-response.dto.ts`
  Responsibility: return upload refs for PDF/image attachments
- Modify: `backend/apps/main-service/src/modules/insurance/dto/create-insurance-inquiry.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/dto/add-insurance-document.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/dto/insurance-document-response.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/dto/insurance-inquiry-response.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/dto/insurance-record-response.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/repositories/insurance.repository.ts`
  Responsibility: staff list queries, workflow updates, activity writes, document persistence
- Create: `backend/apps/main-service/src/modules/insurance/services/insurance-document-storage.service.ts`
  Responsibility: store image/PDF uploads under `.runtime/uploads/insurance-documents`
- Modify: `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/insurance.module.ts`
- Modify: `backend/apps/main-service/test/insurance.service.spec.ts`
- Modify: `backend/apps/main-service/test/insurance.integration.spec.ts`

### Staff Web
- Modify: `frontend/src/lib/api/generated/insurance/requests.ts`
- Modify: `frontend/src/lib/api/generated/insurance/responses.ts`
- Modify: `frontend/src/lib/api/generated/insurance/staff-web-insurance.ts`
- Modify: `frontend/src/lib/insuranceStaffClient.js`
- Modify: `frontend/src/app/insurance/insuranceView.mjs`
- Modify: `frontend/src/app/insurance/insuranceView.test.mjs`
- Modify: `frontend/src/app/insurance/InsuranceContent.js`

### Customer Mobile
- Modify: `mobile/package.json`
- Modify: `mobile/src/lib/insuranceClient.js`
- Create: `mobile/src/screens/insuranceModuleView.mjs`
- Create: `mobile/src/screens/insuranceModuleView.test.mjs`
- Modify: `mobile/src/screens/InsuranceInquiryScreen.js`
- Modify: `mobile/src/screens/Dashboard.js`

### Contracts And Docs
- Modify: `docs/contracts/T110-insurance-inquiry-core.md`
- Modify: `docs/contracts/T514-insurance-customer-intake-mobile-flow.md`
- Modify: `docs/contracts/T515-insurance-review-and-status-web-flow.md`
- Modify: `docs/architecture/domains/main-service/insurance.md`

### Verification Commands
- Backend targeted tests: `npm test -- insurance.service.spec.ts insurance.integration.spec.ts`
- Frontend helper tests: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
- Frontend lint: `npm run lint`
- Mobile helper tests: `node --test mobile/src/screens/insuranceModuleView.test.mjs`

### Task 1: Extend The Backend Insurance Workflow Contract

**Files:**
- Modify: `backend/apps/main-service/test/insurance.service.spec.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/schemas/insurance.schema.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/dto/create-insurance-inquiry.dto.ts`
- Create: `backend/apps/main-service/src/modules/insurance/dto/update-insurance-inquiry-workflow.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/dto/insurance-inquiry-response.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`

- [ ] **Step 1: Write the failing service tests for phase-1 workflow metadata**

```typescript
it('creates a phase-1 insurance case with purpose and default workflow tags', async () => {
  const insuranceRepository = {
    create: jest.fn().mockResolvedValue({
      id: 'insurance-inquiry-1',
      status: 'submitted',
      purpose: 'quotation',
      documentStatus: 'incomplete',
      paymentStatus: 'not_required',
      renewalStatus: 'not_applicable',
    }),
  };

  const result = await service.create(
    {
      userId: 'customer-1',
      vehicleId: 'vehicle-1',
      inquiryType: 'comprehensive',
      purpose: 'quotation',
      subject: 'Accident repair inquiry',
      description: 'Customer reported front-bumper and headlight damage.',
    },
    { userId: 'customer-1', role: 'customer' },
  );

  expect(result).toEqual(
    expect.objectContaining({
      purpose: 'quotation',
      status: 'submitted',
      documentStatus: 'incomplete',
      paymentStatus: 'not_required',
      renewalStatus: 'not_applicable',
    }),
  );
});

it('accepts adviser workflow updates for payment and renewal tags', async () => {
  await service.updateWorkflow(
    'insurance-inquiry-1',
    {
      status: 'payment_pending',
      documentStatus: 'complete',
      paymentStatus: 'proof_submitted',
      renewalStatus: 'upcoming',
      paymentDueAt: '2026-05-30T00:00:00.000Z',
      policyExpiryAt: '2026-08-15T00:00:00.000Z',
      renewalDueAt: '2026-07-15T00:00:00.000Z',
      assignedStaffId: 'adviser-1',
      reviewNotes: 'Waiting for proof of payment validation.',
    },
    { userId: 'adviser-1', role: 'service_adviser' },
  );

  expect(insuranceRepository.updateWorkflow).toHaveBeenCalledWith(
    'insurance-inquiry-1',
    expect.objectContaining({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      renewalStatus: 'upcoming',
      assignedStaffId: 'adviser-1',
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- insurance.service.spec.ts`
Expected: FAIL because `purpose`, workflow tags, and `updateWorkflow` do not exist yet

- [ ] **Step 3: Write the minimal schema, DTO, and service contract**

```typescript
export const insuranceCasePurposeEnum = pgEnum('insurance_case_purpose', [
  'new_application',
  'renewal',
  'claim',
  'quotation',
]);

export const insuranceInquiryStatusEnum = pgEnum('insurance_inquiry_status', [
  'submitted',
  'needs_documents',
  'under_review',
  'for_approval',
  'approved',
  'payment_pending',
  'active',
  'for_renewal',
  'closed',
  'rejected',
  'cancelled',
]);

export const insuranceDocumentReviewStatusEnum = pgEnum('insurance_document_review_status', [
  'complete',
  'incomplete',
  'under_verification',
  'rejected',
]);

export const insuranceDocumentTypeEnum = pgEnum('insurance_document_type', [
  'or_cr',
  'policy',
  'valid_id',
  'police_report',
  'photo',
  'estimate',
  'proof_of_payment',
  'other',
]);

export const insurancePaymentStatusEnum = pgEnum('insurance_payment_status', [
  'not_required',
  'unpaid',
  'proof_submitted',
  'verifying',
  'paid',
  'overdue',
]);

export const insuranceRenewalStatusEnum = pgEnum('insurance_renewal_status', [
  'not_applicable',
  'upcoming',
  'quoted',
  'awaiting_customer',
  'renewed',
  'expired',
]);
```

```typescript
export class UpdateInsuranceInquiryWorkflowDto {
  @IsEnum(insuranceInquiryStatusEnum.enumValues)
  status!: (typeof insuranceInquiryStatusEnum.enumValues)[number];

  @IsOptional()
  @IsEnum(insuranceDocumentReviewStatusEnum.enumValues)
  documentStatus?: (typeof insuranceDocumentReviewStatusEnum.enumValues)[number];

  @IsOptional()
  @IsEnum(insurancePaymentStatusEnum.enumValues)
  paymentStatus?: (typeof insurancePaymentStatusEnum.enumValues)[number];

  @IsOptional()
  @IsEnum(insuranceRenewalStatusEnum.enumValues)
  renewalStatus?: (typeof insuranceRenewalStatusEnum.enumValues)[number];
}
```

```typescript
async updateWorkflow(id: string, payload: UpdateInsuranceInquiryWorkflowDto, actor: InsuranceActor) {
  await this.assertStaffReviewer(actor.userId);
  const inquiry = await this.insuranceRepository.findById(id);
  this.assertAllowedWorkflowTransition(inquiry.status, payload.status);
  return this.insuranceRepository.updateWorkflow(id, {
    ...payload,
    reviewedByUserId: actor.userId,
    reviewedAt: new Date(),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- insurance.service.spec.ts`
Expected: PASS for the new create defaults and workflow-update assertions

- [ ] **Step 5: Commit**

```bash
git add backend/apps/main-service/src/modules/insurance/schemas/insurance.schema.ts backend/apps/main-service/src/modules/insurance/dto/create-insurance-inquiry.dto.ts backend/apps/main-service/src/modules/insurance/dto/update-insurance-inquiry-workflow.dto.ts backend/apps/main-service/src/modules/insurance/dto/insurance-inquiry-response.dto.ts backend/apps/main-service/src/modules/insurance/services/insurance.service.ts backend/apps/main-service/test/insurance.service.spec.ts
git commit -m "feat: extend insurance workflow contract for phase 1"
```

### Task 2: Add Staff List, Activity History, And Binary Document Upload

**Files:**
- Modify: `backend/apps/main-service/test/insurance.integration.spec.ts`
- Create: `backend/apps/main-service/src/modules/insurance/schemas/insurance-activity.schema.ts`
- Create: `backend/apps/main-service/src/modules/insurance/dto/list-insurance-inquiries-query.dto.ts`
- Create: `backend/apps/main-service/src/modules/insurance/dto/upload-insurance-document.dto.ts`
- Create: `backend/apps/main-service/src/modules/insurance/dto/upload-insurance-document-response.dto.ts`
- Create: `backend/apps/main-service/src/modules/insurance/services/insurance-document-storage.service.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/repositories/insurance.repository.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/insurance.module.ts`

- [ ] **Step 1: Write the failing integration tests for the staff list route and multipart upload**

```typescript
it('lists insurance cases for staff with workflow filters', async () => {
  const listResponse = await request(app.getHttpServer())
    .get('/api/insurance/inquiries?status=payment_pending&paymentStatus=proof_submitted')
    .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);

  expect(listResponse.status).toBe(200);
  expect(listResponse.body[0]).toEqual(
    expect.objectContaining({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      customerDisplayName: 'Casey Customer',
      vehicleLabel: 'Toyota Vios (INS110A)',
    }),
  );
});

it('uploads an insurance PDF and stores an activity event', async () => {
  const uploadResponse = await request(app.getHttpServer())
    .post(`/api/insurance/inquiries/${createInquiryResponse.body.id}/documents/upload`)
    .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
    .field('documentType', 'proof_of_payment')
    .attach('file', Buffer.from('%PDF-1.4 test proof'), 'proof-of-payment.pdf');

  expect(uploadResponse.status).toBe(200);
  expect(uploadResponse.body.documents[0]).toEqual(
    expect.objectContaining({
      documentType: 'proof_of_payment',
      fileName: 'proof-of-payment.pdf',
    }),
  );
  expect(uploadResponse.body.activities.at(-1)).toEqual(
    expect.objectContaining({
      action: 'document_uploaded',
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- insurance.integration.spec.ts`
Expected: FAIL because the staff list route, multipart upload route, and activity history are not implemented yet

- [ ] **Step 3: Write the minimal repository, controller, and storage implementation**

```typescript
@Get('insurance/inquiries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('service_adviser', 'super_admin')
list(@Query() query: ListInsuranceInquiriesQueryDto, @Req() request: Request) {
  return this.insuranceService.listForStaff(query, request.user as { userId: string; role: string });
}

@Post('insurance/inquiries/:id/documents/upload')
@HttpCode(HttpStatus.OK)
@UseInterceptors(FileInterceptor('file'))
uploadDocument(
  @Param('id') id: string,
  @Body() payload: UploadInsuranceDocumentDto,
  @UploadedFile() file: Express.Multer.File,
  @Req() request: Request,
) {
  return this.insuranceService.uploadDocument(id, payload, file, request.user as { userId: string; role: string });
}
```

```typescript
async saveDocument(payload: { inquiryId: string; mimeType: string; originalName: string; buffer: Buffer }) {
  const extension = payload.originalName.split('.').pop()?.toLowerCase() || 'bin';
  const safeInquiryDirectory = join(payload.inquiryId, payload.mimeType === 'application/pdf' ? 'pdf' : 'image');
  const storageKey = join(safeInquiryDirectory, `${randomUUID()}.${extension}`).replace(/\\/g, '/');
  const absolutePath = join(this.rootDirectory, storageKey);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, payload.buffer);
  return { storageKey, fileUrl: `upload://insurance/${storageKey}` };
}
```

```typescript
async listForStaff(query: ListInsuranceInquiriesQueryDto) {
  return this.db.query.insuranceInquiries.findMany({
    where: and(
      query.status ? eq(insuranceInquiries.status, query.status) : undefined,
      query.paymentStatus ? eq(insuranceInquiries.paymentStatus, query.paymentStatus) : undefined,
    ),
    with: {
      user: { with: { profile: true } },
      vehicle: true,
      documents: { orderBy: desc(insuranceDocuments.createdAt) },
      activities: { orderBy: desc(insuranceActivities.createdAt) },
    },
    orderBy: desc(insuranceInquiries.updatedAt),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- insurance.integration.spec.ts`
Expected: PASS for list filtering, multipart upload, and activity-history assertions

- [ ] **Step 5: Commit**

```bash
git add backend/apps/main-service/src/modules/insurance backend/apps/main-service/test/insurance.integration.spec.ts
git commit -m "feat: add insurance staff list and binary uploads"
```

### Task 3: Update The Shared Frontend Insurance Contract And View Helpers

**Files:**
- Modify: `frontend/src/lib/api/generated/insurance/requests.ts`
- Modify: `frontend/src/lib/api/generated/insurance/responses.ts`
- Modify: `frontend/src/lib/api/generated/insurance/staff-web-insurance.ts`
- Modify: `frontend/src/lib/insuranceStaffClient.js`
- Modify: `frontend/src/app/insurance/insuranceView.mjs`
- Modify: `frontend/src/app/insurance/insuranceView.test.mjs`

- [ ] **Step 1: Write the failing helper tests for dashboard cards and row shaping**

```javascript
test('getInsuranceSummaryCards counts payment and renewal follow-ups', () => {
  assert.deepEqual(
    getInsuranceSummaryCards({
      inquiries: [
        { status: 'submitted', paymentStatus: 'not_required', renewalStatus: 'not_applicable' },
        { status: 'payment_pending', paymentStatus: 'proof_submitted', renewalStatus: 'upcoming' },
      ],
    }).map((card) => [card.label, card.value]),
    [
      ['New Inquiries', 1],
      ['Payment Pending', 1],
      ['For Renewal', 1],
      ['Needs Documents', 0],
    ],
  )
})

test('buildInsuranceTableRow returns customer, vehicle, and workflow badges', () => {
  assert.deepEqual(
    buildInsuranceTableRow({
      id: 'inq-1',
      customerDisplayName: 'Casey Customer',
      vehicleLabel: 'Toyota Vios (INS110A)',
      status: 'payment_pending',
      documentStatus: 'complete',
      paymentStatus: 'proof_submitted',
    }),
    {
      key: 'inq-1',
      customer: 'Casey Customer',
      vehicle: 'Toyota Vios (INS110A)',
      status: 'Payment Pending',
      documentStatus: 'Complete',
      paymentStatus: 'Proof Submitted',
    },
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: FAIL because the new summary card and row helpers do not exist yet

- [ ] **Step 3: Write the minimal generated-contract and helper updates**

```typescript
export type InsuranceInquiryStatus =
  | 'submitted'
  | 'needs_documents'
  | 'under_review'
  | 'for_approval'
  | 'approved'
  | 'payment_pending'
  | 'active'
  | 'for_renewal'
  | 'closed'
  | 'rejected'
  | 'cancelled';

export interface ListInsuranceInquiriesRequest {
  status?: InsuranceInquiryStatus;
  paymentStatus?: InsurancePaymentStatus;
  renewalStatus?: InsuranceRenewalStatus;
}
```

```javascript
export function buildInsuranceTableRow(inquiry) {
  return {
    key: inquiry.id,
    customer: inquiry.customerDisplayName || 'Unknown customer',
    vehicle: inquiry.vehicleLabel || 'Unknown vehicle',
    status: formatStatusLabel(inquiry.status),
    documentStatus: formatStatusLabel(inquiry.documentStatus),
    paymentStatus: formatStatusLabel(inquiry.paymentStatus),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: PASS with the new summary-card and row-shaping coverage

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api/generated/insurance/requests.ts frontend/src/lib/api/generated/insurance/responses.ts frontend/src/lib/api/generated/insurance/staff-web-insurance.ts frontend/src/lib/insuranceStaffClient.js frontend/src/app/insurance/insuranceView.mjs frontend/src/app/insurance/insuranceView.test.mjs
git commit -m "feat: extend frontend insurance contract for phase 1"
```

### Task 4: Rebuild The Staff Web Insurance Workspace

**Files:**
- Modify: `frontend/src/app/insurance/InsuranceContent.js`
- Test: `frontend/src/app/insurance/insuranceView.test.mjs`

- [ ] **Step 1: Write the failing helper test for detail-tab state**

```javascript
test('getInsuranceDetailTabs exposes overview, documents, timeline, payment, and renewal', () => {
  assert.deepEqual(
    getInsuranceDetailTabs().map((tab) => tab.key),
    ['overview', 'documents', 'timeline', 'payment', 'renewal', 'activity'],
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: FAIL because the detail-tab helper does not exist yet

- [ ] **Step 3: Write the minimal workspace implementation**

```javascript
const summaryCards = getInsuranceSummaryCards({ inquiries: filteredInquiries })
const tableRows = filteredInquiries.map(buildInsuranceTableRow)
const detailTabs = getInsuranceDetailTabs()

const [filters, setFilters] = useState({
  status: 'all',
  paymentStatus: 'all',
  renewalStatus: 'all',
  search: '',
})
```

```javascript
<div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
  {summaryCards.map((card) => (
    <SummaryTile key={card.label} icon={card.icon} label={card.label} value={card.value} sub={card.sub} />
  ))}
</div>

<table className="w-full">
  <thead>
    <tr>
      <th>Customer</th>
      <th>Vehicle</th>
      <th>Status</th>
      <th>Documents</th>
      <th>Payment</th>
      <th>Renewal</th>
    </tr>
  </thead>
</table>
```

- [ ] **Step 4: Run test and lint to verify it passes**

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: PASS

Run: `npm run lint`
Expected: PASS without new lint errors in `src/app/insurance`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/insurance/InsuranceContent.js frontend/src/app/insurance/insuranceView.mjs frontend/src/app/insurance/insuranceView.test.mjs
git commit -m "feat: rebuild staff insurance workspace"
```

### Task 5: Add Mobile Insurance View Helpers And Upload Client Support

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/src/lib/insuranceClient.js`
- Create: `mobile/src/screens/insuranceModuleView.mjs`
- Create: `mobile/src/screens/insuranceModuleView.test.mjs`

- [ ] **Step 1: Write the failing mobile helper tests**

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRequirementsChecklist,
  getInsuranceHomeCards,
  getCustomerInsuranceTimeline,
} from './insuranceModuleView.mjs'

test('home cards prioritize start, upload, payment, and renewal actions', () => {
  assert.deepEqual(
    getInsuranceHomeCards({ hasActiveRequest: true }).map((card) => card.key),
    ['start', 'active', 'documents', 'payment', 'renewal', 'history'],
  )
})

test('requirements checklist separates required and optional documents', () => {
  const checklist = buildRequirementsChecklist({
    status: 'needs_documents',
    uploadedTypes: ['or_cr'],
  })

  assert.equal(checklist.required.find((item) => item.type === 'or_cr')?.complete, true)
  assert.equal(checklist.required.find((item) => item.type === 'policy')?.complete, false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: FAIL because the helper file does not exist yet

- [ ] **Step 3: Write the minimal helper and upload-client implementation**

```javascript
export const getInsuranceHomeCards = ({ hasActiveRequest }) => [
  { key: 'start', label: 'Start New Request' },
  { key: 'active', label: hasActiveRequest ? 'My Active Request' : 'No Active Request' },
  { key: 'documents', label: 'Upload Documents' },
  { key: 'payment', label: 'Payment' },
  { key: 'renewal', label: 'Renewal Reminder' },
  { key: 'history', label: 'History' },
]
```

```javascript
export const uploadInsuranceInquiryDocumentFile = async ({
  inquiryId,
  documentType,
  file,
  notes,
  accessToken,
}) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('documentType', documentType)
  if (notes) {
    formData.append('notes', notes)
  }

  return normalizeCustomerInsuranceInquiry(
    await request(`/api/insurance/inquiries/${inquiryId}/documents/upload`, {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
      body: formData,
    }),
  )
}
```

```javascript
const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
const response = await fetch(`${API_BASE_URL}${path}`, {
  ...rest,
  headers: isFormData ? { ...(headers ?? {}) } : { 'Content-Type': 'application/json', ...(headers ?? {}) },
  body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: PASS with stable home-card, checklist, and timeline coverage

- [ ] **Step 5: Commit**

```bash
git add mobile/package.json mobile/src/lib/insuranceClient.js mobile/src/screens/insuranceModuleView.mjs mobile/src/screens/insuranceModuleView.test.mjs
git commit -m "feat: add mobile insurance helper and upload client"
```

### Task 6: Rebuild The Customer Mobile Insurance Screen

**Files:**
- Modify: `mobile/src/screens/InsuranceInquiryScreen.js`
- Modify: `mobile/src/screens/Dashboard.js`
- Test: `mobile/src/screens/insuranceModuleView.test.mjs`

- [ ] **Step 1: Write the failing timeline helper test for payment and renewal prompts**

```javascript
test('customer timeline includes payment pending and renewal prompts', () => {
  assert.deepEqual(
    getCustomerInsuranceTimeline({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      renewalStatus: 'upcoming',
    }).map((step) => step.key),
    ['submitted', 'review', 'payment', 'renewal'],
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: FAIL because the payment and renewal timeline state is not modeled yet

- [ ] **Step 3: Write the minimal screen rewrite**

```javascript
const homeCards = getInsuranceHomeCards({ hasActiveRequest: Boolean(latestInquiry?.id) })
const requirementsChecklist = buildRequirementsChecklist({
  status: latestInquiry?.status,
  uploadedTypes: latestInquiry?.documents?.map((document) => document.documentType) ?? [],
})
const customerTimeline = getCustomerInsuranceTimeline({
  status: latestInquiry?.status,
  paymentStatus: latestInquiry?.paymentStatus,
  renewalStatus: latestInquiry?.renewalStatus,
})
```

```javascript
<View style={styles.sectionCard}>
  <Text style={styles.sectionTitle}>Requirements checklist</Text>
  {requirementsChecklist.required.map((item) => (
    <ChecklistRow key={item.type} label={item.label} complete={item.complete} />
  ))}
</View>

<TouchableOpacity onPress={handlePickAndUploadDocument}>
  <Text style={styles.primaryButtonText}>Upload document</Text>
</TouchableOpacity>
```

- [ ] **Step 4: Run helper tests and mobile smoke verification**

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: PASS

Run: `npm run start -- --offline`
Expected: Expo starts without syntax/runtime errors for the rebuilt insurance screen

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/InsuranceInquiryScreen.js mobile/src/screens/Dashboard.js mobile/src/screens/insuranceModuleView.mjs mobile/src/screens/insuranceModuleView.test.mjs mobile/src/lib/insuranceClient.js mobile/package.json
git commit -m "feat: rebuild customer insurance mobile flow"
```

### Task 7: Sync Contracts And Run Final Verification

**Files:**
- Modify: `docs/contracts/T110-insurance-inquiry-core.md`
- Modify: `docs/contracts/T514-insurance-customer-intake-mobile-flow.md`
- Modify: `docs/contracts/T515-insurance-review-and-status-web-flow.md`
- Modify: `docs/architecture/domains/main-service/insurance.md`

- [ ] **Step 1: Update the contract docs to match the implemented MVP**

```markdown
| `GET /api/insurance/inquiries` | `live` | Swagger/controller | staff-admin insurance table with workflow filters |
| `POST /api/insurance/inquiries/:id/documents/upload` | `live` | Swagger/controller | binary PDF/image upload for customer and staff |
```

```markdown
- customer mobile now supports a requirements checklist, binary upload, payment-proof upload, and renewal reminder states
- staff web now uses a live staff list route instead of mock queue cards
```

- [ ] **Step 2: Run the backend, frontend, and mobile verification commands**

Run: `npm test -- insurance.service.spec.ts insurance.integration.spec.ts`
Expected: PASS

Run: `node --test frontend/src/app/insurance/insuranceView.test.mjs`
Expected: PASS

Run: `npm run lint`
Expected: PASS

Run: `node --test mobile/src/screens/insuranceModuleView.test.mjs`
Expected: PASS

- [ ] **Step 3: Review changed files for scope drift**

```bash
git diff --stat
git diff -- backend/apps/main-service/src/modules/insurance frontend/src/app/insurance mobile/src/screens/InsuranceInquiryScreen.js docs/contracts/T110-insurance-inquiry-core.md docs/contracts/T514-insurance-customer-intake-mobile-flow.md docs/contracts/T515-insurance-review-and-status-web-flow.md
```

Expected: only insurance-domain, insurance-screen, and contract-doc files changed

- [ ] **Step 4: Commit**

```bash
git add docs/contracts/T110-insurance-inquiry-core.md docs/contracts/T514-insurance-customer-intake-mobile-flow.md docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md
git commit -m "docs: sync insurance phase 1 contracts"
```

## Self-Review
### Spec Coverage
- Shared lifecycle and workflow tags: Task 1
- Staff list view, activity history, upload flow: Task 2
- Web dashboard/table/detail helpers and UI: Tasks 3 and 4
- Mobile home/checklist/upload/timeline/payment/renewal: Tasks 5 and 6
- Contract/doc sync and verification: Task 7

### Placeholder Scan
- No `TODO`, `TBD`, or “implement later” placeholders remain
- Each task lists exact file paths and exact commands
- Each code-changing step contains concrete code to anchor the implementation

### Type Consistency
- `updateWorkflow` is used consistently across backend and frontend
- `purpose`, `documentStatus`, `paymentStatus`, and `renewalStatus` are used as the shared field names
- Binary upload uses `/api/insurance/inquiries/:id/documents/upload` consistently across backend and mobile
