# Insurance Module Phase 4C Broadcasts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add insurance-only custom in-app broadcasts to the real root system so staff/admin users can send a custom title and message to selected or filtered active insurance cases with customer deduplication and visible audit history.

**Architecture:** Extend the existing insurance module with a dedicated broadcast DTO/route/service path, following the same pattern already used for Phase 4B manual reminders. Reuse the `/insurance` queue filters and selection UI in the web workspace, deduplicate recipients by customer in the backend, and record `manual_broadcast_sent` activity entries on affected inquiries.

**Tech Stack:** NestJS, TypeScript, Jest, Next.js, React, plain JS helper/view-model modules, existing notifications service with `in_app` channel.

---

## File Map

### Backend

- Create: `backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts.dto.ts`
- Create: `backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts-response.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`
- Modify: `backend/apps/main-service/test/insurance.service.spec.ts`
- Modify: `backend/apps/main-service/test/insurance.integration.spec.ts`

### Frontend

- Modify: `frontend/src/lib/insuranceStaffClient.js`
- Modify: `frontend/src/app/insurance/insuranceView.mjs`
- Modify: `frontend/src/app/insurance/insuranceView.test.mjs`
- Modify: `frontend/src/app/insurance/InsuranceContent.js`

### Docs / Verification

- Modify: `docs/contracts/T515-insurance-review-and-status-web-flow.md`
- Modify: `docs/architecture/domains/main-service/insurance.md`

---

### Task 1: Add Broadcast Route Contract and Integration Test

**Files:**
- Create: `backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts.dto.ts`
- Create: `backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts-response.dto.ts`
- Modify: `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
- Test: `backend/apps/main-service/test/insurance.integration.spec.ts`

- [ ] **Step 1: Write the failing integration test for the new route**

Add an integration test alongside the existing reminder route coverage in `backend/apps/main-service/test/insurance.integration.spec.ts`:

```ts
it('accepts POST /api/insurance/broadcasts/send for service advisers', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/insurance/broadcasts/send')
    .set('Authorization', `Bearer ${serviceAdviserToken}`)
    .send({
      targetMode: 'selected_cases',
      selectedIds: ['insurance-inquiry-1'],
      title: 'Renew this week',
      message: 'Open the app to review your renewal options.',
    });

  expect(response.status).toBe(200);
  expect(response.body).toEqual(
    expect.objectContaining({
      targetedCaseCount: expect.any(Number),
      eligibleCaseCount: expect.any(Number),
      deduplicatedCustomerCount: expect.any(Number),
      sentCount: expect.any(Number),
      skippedCount: expect.any(Number),
      failedCount: expect.any(Number),
      results: expect.any(Array),
    }),
  );
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```powershell
cd C:\Vscode\Main\codewave\backend\apps\main-service
npm.cmd test -- insurance.integration.spec.ts
```

Expected: FAIL with a `404` for `/api/insurance/broadcasts/send` or missing DTO/controller wiring.

- [ ] **Step 3: Add the request DTO**

Create `backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export const insuranceBroadcastTargetModeValues = ['selected_cases', 'filtered_results'] as const;
export type InsuranceBroadcastTargetMode = (typeof insuranceBroadcastTargetModeValues)[number];

export class SendInsuranceBroadcastsDto {
  @ApiProperty({ enum: insuranceBroadcastTargetModeValues })
  @IsIn(insuranceBroadcastTargetModeValues)
  targetMode!: InsuranceBroadcastTargetMode;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedIds?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  filters?: {
    purpose?: string;
    status?: string;
    paymentStatus?: string;
    renewalStatus?: string;
  };

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;
}
```

- [ ] **Step 4: Add the response DTO**

Create `backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

class InsuranceBroadcastResultDto {
  @ApiProperty()
  inquiryId!: string;

  @ApiProperty({ nullable: true })
  customerId!: string | null;

  @ApiProperty({ enum: ['sent', 'skipped', 'failed'] })
  status!: 'sent' | 'skipped' | 'failed';

  @ApiProperty({ nullable: true })
  reason!: string | null;
}

export class SendInsuranceBroadcastsResponseDto {
  @ApiProperty()
  targetedCaseCount!: number;

  @ApiProperty()
  eligibleCaseCount!: number;

  @ApiProperty()
  deduplicatedCustomerCount!: number;

  @ApiProperty()
  sentCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty({ type: [InsuranceBroadcastResultDto] })
  results!: InsuranceBroadcastResultDto[];
}
```

- [ ] **Step 5: Wire the controller route**

Modify `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`:

```ts
import { SendInsuranceBroadcastsDto } from '../dto/send-insurance-broadcasts.dto';
import { SendInsuranceBroadcastsResponseDto } from '../dto/send-insurance-broadcasts-response.dto';

type InsuranceBroadcastRouteService = {
  sendManualBroadcasts: (
    payload: SendInsuranceBroadcastsDto,
    actor: { userId: string; role: string },
  ) => unknown;
};

@Post('insurance/broadcasts/send')
@HttpCode(HttpStatus.OK)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('service_adviser', 'super_admin')
@ApiOperation({ summary: 'Send manual insurance broadcasts to selected or filtered active cases.' })
@ApiBearerAuth('access-token')
@ApiOkResponse({
  description: 'The insurance broadcast send request was accepted and summarized.',
  type: SendInsuranceBroadcastsResponseDto,
})
sendBroadcasts(@Body() payload: SendInsuranceBroadcastsDto, @Req() request: Request) {
  return (this.insuranceService as unknown as InsuranceBroadcastRouteService).sendManualBroadcasts(
    payload,
    request.user as { userId: string; role: string },
  );
}
```

- [ ] **Step 6: Run the integration test to verify the route wiring now reaches the service**

Run:

```powershell
cd C:\Vscode\Main\codewave\backend\apps\main-service
npm.cmd test -- insurance.integration.spec.ts
```

Expected: FAIL moves from `404` to service-method-not-implemented or a `500` caused by missing backend implementation.

- [ ] **Step 7: Commit the route-contract slice**

```powershell
cd C:\Vscode\Main\codewave
git add backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts.dto.ts backend/apps/main-service/src/modules/insurance/dto/send-insurance-broadcasts-response.dto.ts backend/apps/main-service/test/insurance.integration.spec.ts
git commit -m "feat: add insurance broadcast route contract"
```

---

### Task 2: Implement Backend Broadcast Eligibility, Deduplication, and Activity Logging

**Files:**
- Modify: `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`
- Test: `backend/apps/main-service/test/insurance.service.spec.ts`

- [ ] **Step 1: Write the failing backend service tests**

Add focused tests to `backend/apps/main-service/test/insurance.service.spec.ts`:

```ts
it('deduplicates multiple eligible inquiries down to one broadcast per customer', async () => {
  const insuranceRepository = {
    listForStaff: jest.fn().mockResolvedValue([
      {
        id: 'inq-1',
        userId: 'customer-1',
        status: 'for_renewal',
        paymentStatus: 'paid',
        renewalStatus: 'upcoming',
        subject: 'Renewal A',
      },
      {
        id: 'inq-2',
        userId: 'customer-1',
        status: 'for_renewal',
        paymentStatus: 'paid',
        renewalStatus: 'awaiting_customer',
        subject: 'Renewal B',
      },
    ]),
    appendActivity: jest.fn().mockResolvedValue({ id: 'activity-1' }),
  };

  const notificationsService = {
    enqueueNotification: jest.fn().mockResolvedValue({ id: 'notif-1', status: 'sent' }),
  };

  // module wiring omitted here, same as current service tests

  const result = await service.sendManualBroadcasts(
    {
      targetMode: 'filtered_results',
      filters: { status: 'for_renewal' },
      title: 'Renew now',
      message: 'Open the app to continue your renewal.',
    },
    { userId: 'adviser-1', role: 'service_adviser' },
  );

  expect(notificationsService.enqueueNotification).toHaveBeenCalledTimes(1);
  expect(result).toEqual(
    expect.objectContaining({
      targetedCaseCount: 2,
      eligibleCaseCount: 2,
      deduplicatedCustomerCount: 1,
      sentCount: 1,
    }),
  );
});

it('rejects empty filtered broadcast sends', async () => {
  await expect(
    service.sendManualBroadcasts(
      {
        targetMode: 'filtered_results',
        filters: {},
        title: 'Renew now',
        message: 'Open the app to continue your renewal.',
      },
      { userId: 'adviser-1', role: 'service_adviser' },
    ),
  ).rejects.toBeInstanceOf(BadRequestException);
});

it('records manual_broadcast_sent activity for each eligible inquiry', async () => {
  expect(insuranceRepository.appendActivity).toHaveBeenCalledWith(
    'inq-1',
    expect.objectContaining({
      action: 'manual_broadcast_sent',
      actorUserId: 'adviser-1',
      notes: 'Renew now',
    }),
  );
});
```

- [ ] **Step 2: Run the service test to verify it fails**

Run:

```powershell
cd C:\Vscode\Main\codewave\backend\apps\main-service
npm.cmd test -- insurance.service.spec.ts
```

Expected: FAIL with `service.sendManualBroadcasts is not a function` or incorrect summary fields.

- [ ] **Step 3: Add backend broadcast types and helpers in the insurance service**

Extend `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts` with types near the reminder equivalents:

```ts
import {
  type InsuranceBroadcastTargetMode,
  type SendInsuranceBroadcastsDto,
} from '../dto/send-insurance-broadcasts.dto';

type ManualBroadcastResult = {
  inquiryId: string;
  customerId: string | null;
  status: 'sent' | 'skipped' | 'failed';
  reason?: 'case_not_broadcast_eligible' | 'duplicate_customer' | 'notification_send_failed';
};

const broadcastFilterKeys = ['purpose', 'status', 'paymentStatus', 'renewalStatus'] as const;
```

- [ ] **Step 4: Implement the service entrypoint and core helpers**

Add this implementation pattern to `insurance.service.ts`:

```ts
async sendManualBroadcasts(payload: SendInsuranceBroadcastsDto, actor: InsuranceActor) {
  await this.assertStaffReviewer(actor.userId);

  const title = String(payload.title ?? '').trim();
  const message = String(payload.message ?? '').trim();

  if (!title || !message) {
    throw new BadRequestException('Broadcast title and message are required');
  }

  const inquiries = await this.resolveBroadcastTargets(payload);
  const seenCustomerIds = new Set<string>();
  const results: ManualBroadcastResult[] = [];

  for (const inquiry of inquiries) {
    if (['closed', 'cancelled', 'rejected'].includes(inquiry.status)) {
      results.push({
        inquiryId: inquiry.id,
        customerId: inquiry.userId ?? null,
        status: 'skipped',
        reason: 'case_not_broadcast_eligible',
      });
      continue;
    }

    if (!inquiry.userId) {
      results.push({
        inquiryId: inquiry.id,
        customerId: null,
        status: 'skipped',
        reason: 'case_not_broadcast_eligible',
      });
      continue;
    }

    if (seenCustomerIds.has(inquiry.userId)) {
      results.push({
        inquiryId: inquiry.id,
        customerId: inquiry.userId,
        status: 'skipped',
        reason: 'duplicate_customer',
      });
      continue;
    }

    try {
      await this.notificationsService?.enqueueNotification({
        userId: inquiry.userId,
        category: 'insurance_update',
        channel: 'in_app',
        sourceType: 'insurance_inquiry',
        sourceId: inquiry.id,
        title,
        message,
        dedupeKey: `notification:insurance.broadcast:${randomUUID()}`,
      });

      seenCustomerIds.add(inquiry.userId);

      if (typeof this.insuranceRepository.appendActivity === 'function') {
        await this.insuranceRepository.appendActivity(inquiry.id, {
          action: 'manual_broadcast_sent',
          actorUserId: actor.userId,
          notes: title,
        });
      }

      results.push({
        inquiryId: inquiry.id,
        customerId: inquiry.userId,
        status: 'sent',
      });
    } catch {
      results.push({
        inquiryId: inquiry.id,
        customerId: inquiry.userId,
        status: 'failed',
        reason: 'notification_send_failed',
      });
    }
  }

  return this.buildManualBroadcastSummary(inquiries.length, seenCustomerIds.size, results);
}
```

- [ ] **Step 5: Implement target resolution and summary helpers**

Add helper implementations mirroring the reminder flow:

```ts
private async resolveBroadcastTargets(payload: SendInsuranceBroadcastsDto): Promise<ReminderTargetInquiry[]> {
  if (payload.targetMode === 'filtered_results') {
    const normalizedFilters = payload.filters ?? {};
    const hasMeaningfulFilters = broadcastFilterKeys.some((key) => {
      const value = normalizedFilters[key];
      return value !== undefined && value !== null && String(value).trim() !== '';
    });

    if (!hasMeaningfulFilters) {
      throw new BadRequestException('Broadcast filters are required for filtered-results sends');
    }

    return this.normalizeReminderTargets(
      await this.insuranceRepository.listForStaff(normalizedFilters as ListInsuranceInquiriesQueryDto),
    );
  }

  const selectedIds = [...new Set((payload.selectedIds ?? []).map((value) => String(value).trim()).filter(Boolean))];
  if (!selectedIds.length) {
    throw new BadRequestException('Selected insurance inquiry ids are required for broadcast sends');
  }

  return this.normalizeReminderTargets(
    await Promise.all(selectedIds.map((selectedId) => this.insuranceRepository.findById(selectedId))),
  );
}

private buildManualBroadcastSummary(
  targetedCaseCount: number,
  deduplicatedCustomerCount: number,
  results: ManualBroadcastResult[],
) {
  return {
    targetedCaseCount,
    eligibleCaseCount: results.filter((result) => result.status !== 'skipped' || result.reason === 'duplicate_customer').length,
    deduplicatedCustomerCount,
    sentCount: results.filter((result) => result.status === 'sent').length,
    skippedCount: results.filter((result) => result.status === 'skipped').length,
    failedCount: results.filter((result) => result.status === 'failed').length,
    results,
  };
}
```

- [ ] **Step 6: Run the backend service tests until they pass**

Run:

```powershell
cd C:\Vscode\Main\codewave\backend\apps\main-service
npm.cmd test -- insurance.service.spec.ts
```

Expected: PASS for the new broadcast service tests plus the existing insurance suite.

- [ ] **Step 7: Run the integration test again**

Run:

```powershell
cd C:\Vscode\Main\codewave\backend\apps\main-service
npm.cmd test -- insurance.integration.spec.ts
```

Expected: PASS, including the new route behavior.

- [ ] **Step 8: Commit the backend implementation**

```powershell
cd C:\Vscode\Main\codewave
git add backend/apps/main-service/src/modules/insurance/services/insurance.service.ts backend/apps/main-service/test/insurance.service.spec.ts backend/apps/main-service/test/insurance.integration.spec.ts
git commit -m "feat: add insurance manual broadcasts backend"
```

---

### Task 3: Add Frontend Client and Helper Support for Broadcast Payloads and Summaries

**Files:**
- Modify: `frontend/src/lib/insuranceStaffClient.js`
- Modify: `frontend/src/app/insurance/insuranceView.mjs`
- Test: `frontend/src/app/insurance/insuranceView.test.mjs`

- [ ] **Step 1: Write the failing frontend helper tests**

Add tests to `frontend/src/app/insurance/insuranceView.test.mjs`:

```js
test('buildInsuranceBroadcastRequest trims title and message and deduplicates selected ids', () => {
  expect(
    buildInsuranceBroadcastRequest({
      targetMode: 'selected_cases',
      selectedIds: ['inq-1', 'inq-1'],
      title: '  Renewal Promo  ',
      message: '  Open the app today.  ',
    }),
  ).toEqual({
    targetMode: 'selected_cases',
    selectedIds: ['inq-1'],
    title: 'Renewal Promo',
    message: 'Open the app today.',
  });
});

test('buildInsuranceBroadcastRequest keeps only meaningful server-side filters for filtered results', () => {
  expect(
    buildInsuranceBroadcastRequest({
      targetMode: 'filtered_results',
      filters: {
        status: 'for_renewal',
        renewalStatus: 'awaiting_customer',
        search: 'ignore-me',
      },
      title: 'Renew now',
      message: 'Open the app to continue your renewal.',
    }),
  ).toEqual({
    targetMode: 'filtered_results',
    filters: {
      status: 'for_renewal',
      renewalStatus: 'awaiting_customer',
    },
    title: 'Renew now',
    message: 'Open the app to continue your renewal.',
  });
});
```

- [ ] **Step 2: Run the frontend helper tests to verify they fail**

Run:

```powershell
cd C:\Vscode\Main\codewave\frontend
node --test src/app/insurance/insuranceView.test.mjs
```

Expected: FAIL because `buildInsuranceBroadcastRequest` and broadcast summary helpers do not exist yet.

- [ ] **Step 3: Add the staff client API helper**

Modify `frontend/src/lib/insuranceStaffClient.js`:

```js
export const sendInsuranceBroadcasts = async ({
  targetMode,
  selectedIds,
  filters,
  title,
  message,
  accessToken,
}) =>
  request('/api/insurance/broadcasts/send', {
    method: 'POST',
    headers: buildAuthorizedHeaders(accessToken),
    body: {
      targetMode,
      ...(Array.isArray(selectedIds) ? { selectedIds } : {}),
      ...(filters && typeof filters === 'object' ? { filters } : {}),
      title,
      message,
    },
  });
```

- [ ] **Step 4: Add view-model helpers for broadcast request building and result summaries**

Modify `frontend/src/app/insurance/insuranceView.mjs`:

```js
const BROADCAST_FILTER_FIELDS = ['purpose', 'status', 'paymentStatus', 'renewalStatus'];

export function buildInsuranceBroadcastRequest({
  targetMode,
  selectedIds = [],
  filters = {},
  title,
  message,
} = {}) {
  const normalizedTargetMode = String(targetMode ?? '').trim();
  const normalizedTitle = String(title ?? '').trim();
  const normalizedMessage = String(message ?? '').trim();

  if (!normalizedTargetMode || !normalizedTitle || !normalizedMessage) {
    throw new Error('Broadcast title, message, and target mode are required before sending.');
  }

  if (normalizedTargetMode === 'filtered_results') {
    const normalizedFilters = BROADCAST_FILTER_FIELDS.reduce((result, field) => {
      const rawValue = String(filters?.[field] ?? '').trim();
      if (rawValue && rawValue !== 'all') {
        result[field] = rawValue;
      }
      return result;
    }, {});

    if (!Object.keys(normalizedFilters).length) {
      throw new Error('Choose at least one server-side insurance filter before sending a broadcast.');
    }

    return {
      targetMode: normalizedTargetMode,
      filters: normalizedFilters,
      title: normalizedTitle,
      message: normalizedMessage,
    };
  }

  const normalizedSelectedIds = [...new Set(selectedIds.map((value) => String(value ?? '').trim()).filter(Boolean))];
  if (!normalizedSelectedIds.length) {
    throw new Error('Select at least one insurance case before sending a broadcast.');
  }

  return {
    targetMode: normalizedTargetMode,
    selectedIds: normalizedSelectedIds,
    title: normalizedTitle,
    message: normalizedMessage,
  };
}

export function summarizeInsuranceBroadcastResult({
  sentCount = 0,
  skippedCount = 0,
  failedCount = 0,
  deduplicatedCustomerCount = 0,
} = {}) {
  const parts = [`Sent ${sentCount} broadcast(s) to ${deduplicatedCustomerCount} customer(s).`];
  if (skippedCount) parts.push(`${skippedCount} skipped.`);
  if (failedCount) parts.push(`${failedCount} failed.`);
  return parts.join(' ');
}
```

- [ ] **Step 5: Extend tests to cover the new API helper**

In `frontend/src/app/insurance/insuranceView.test.mjs`, assert the client POST payload:

```js
test('sendInsuranceBroadcasts posts the expected payload', async () => {
  global.fetch = mockFetchOk({});

  await sendInsuranceBroadcasts({
    targetMode: 'selected_cases',
    selectedIds: ['inq-1'],
    title: 'Renew now',
    message: 'Open the app to continue your renewal.',
    accessToken: 'token-1',
  });

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/insurance/broadcasts/send'),
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        targetMode: 'selected_cases',
        selectedIds: ['inq-1'],
        title: 'Renew now',
        message: 'Open the app to continue your renewal.',
      }),
    }),
  );
});
```

- [ ] **Step 6: Run the frontend helper tests until they pass**

Run:

```powershell
cd C:\Vscode\Main\codewave\frontend
node --test src/app/insurance/insuranceView.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the helper/client slice**

```powershell
cd C:\Vscode\Main\codewave
git add frontend/src/lib/insuranceStaffClient.js frontend/src/app/insurance/insuranceView.mjs frontend/src/app/insurance/insuranceView.test.mjs
git commit -m "feat: add insurance broadcast client helpers"
```

---

### Task 4: Add the Broadcast Panel to the Root Insurance Workspace

**Files:**
- Modify: `frontend/src/app/insurance/InsuranceContent.js`
- Test: `frontend/src/app/insurance/insuranceView.test.mjs`

- [ ] **Step 1: Write a failing UI/helper expectation for the broadcast state summary**

Add a small regression-style helper assertion to `frontend/src/app/insurance/insuranceView.test.mjs`:

```js
test('summarizeInsuranceBroadcastResult formats skipped and failed counts', () => {
  expect(
    summarizeInsuranceBroadcastResult({
      sentCount: 3,
      skippedCount: 2,
      failedCount: 1,
      deduplicatedCustomerCount: 3,
    }),
  ).toBe('Sent 3 broadcast(s) to 3 customer(s). 2 skipped. 1 failed.');
});
```

- [ ] **Step 2: Run the frontend test to verify the broadcast summary assertion fails before UI wiring**

Run:

```powershell
cd C:\Vscode\Main\codewave\frontend
node --test src/app/insurance/insuranceView.test.mjs
```

Expected: FAIL until `summarizeInsuranceBroadcastResult` is exported and used correctly.

- [ ] **Step 3: Add broadcast state and imports to the insurance workspace**

Modify `frontend/src/app/insurance/InsuranceContent.js` imports and state:

```js
import {
  getInsuranceInquiryById,
  listInsuranceInquiries,
  sendInsuranceBroadcasts,
  sendInsuranceReminders,
  updateInsuranceInquiryStatus,
} from '@/lib/insuranceStaffClient'

import {
  buildInsuranceBroadcastRequest,
  buildInsuranceReminderRequest,
  summarizeInsuranceBroadcastResult,
  summarizeInsuranceReminderResult,
} from './insuranceView.mjs'

const DEFAULT_BROADCAST_TARGET_MODE = 'selected_cases'

const [broadcastTitle, setBroadcastTitle] = useState('')
const [broadcastMessage, setBroadcastMessage] = useState('')
const [broadcastTargetMode, setBroadcastTargetMode] = useState(DEFAULT_BROADCAST_TARGET_MODE)
const [broadcastState, setBroadcastState] = useState('idle')
const [broadcastSummary, setBroadcastSummary] = useState('')
const [broadcastResults, setBroadcastResults] = useState([])
```

- [ ] **Step 4: Add the send handler and validation path**

Inside `InsuranceContent.js`, add:

```js
const handleSendBroadcast = async () => {
  if (!user?.accessToken) {
    setBroadcastState('failed')
    setBroadcastSummary('Sign in again before sending insurance broadcasts.')
    return
  }

  setBroadcastState('submitting')
  setBroadcastSummary('')
  setBroadcastResults([])

  try {
    const payload = buildInsuranceBroadcastRequest({
      targetMode: broadcastTargetMode,
      selectedIds: selectedInquiryIds,
      filters,
      title: broadcastTitle,
      message: broadcastMessage,
    })

    const summary = await sendInsuranceBroadcasts({
      ...payload,
      accessToken: user.accessToken,
    })

    setBroadcastState('sent')
    setBroadcastResults(Array.isArray(summary?.results) ? summary.results : [])
    setBroadcastSummary(summarizeInsuranceBroadcastResult(summary))
  } catch (error) {
    setBroadcastState('failed')
    setBroadcastSummary(error?.message || 'Insurance broadcasts could not be sent.')
  }
}
```

- [ ] **Step 5: Add the broadcast panel block under the manual reminders block**

Add a new panel in `InsuranceContent.js`:

```jsx
<div className="mt-4 rounded-xl border border-surface-border bg-surface-raised px-4 py-4">
  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <p className="text-sm font-semibold text-ink-primary">Custom Insurance Broadcast</p>
      <p className="mt-1 text-xs text-ink-muted">
        Send a custom in-app message to selected insurance cases or the current active filtered queue.
      </p>
    </div>
    <div className="flex flex-wrap gap-2">
      <span className={`badge ${selectedInquiryIds.length ? 'badge-orange' : 'badge-gray'}`}>
        {selectedInquiryIds.length} selected
      </span>
      <span className={`badge ${filteredInquiries.length ? 'badge-blue' : 'badge-gray'}`}>
        {filteredInquiries.length} visible
      </span>
    </div>
  </div>

  <div className="mt-4 grid gap-3 md:grid-cols-2">
    <label className="label">
      Broadcast Target
      <select value={broadcastTargetMode} onChange={(event) => setBroadcastTargetMode(event.target.value)} className="select">
        <option value="selected_cases">Selected Cases</option>
        <option value="filtered_results">Filtered Results</option>
      </select>
    </label>

    <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Audience preview</p>
      <p className="mt-2 text-sm text-ink-primary">
        {broadcastTargetMode === 'selected_cases'
          ? `${selectedInquiryIds.length} selected case(s)`
          : `${filteredInquiries.length} filtered case(s)`}
      </p>
    </div>

    <label className="label md:col-span-2">
      Broadcast Title
      <input
        value={broadcastTitle}
        onChange={(event) => setBroadcastTitle(event.target.value)}
        className="input"
        placeholder="Example: Renewal support available this week"
      />
    </label>

    <label className="label md:col-span-2">
      Broadcast Message
      <textarea
        value={broadcastMessage}
        onChange={(event) => setBroadcastMessage(event.target.value)}
        rows={5}
        className="input min-h-[140px] resize-y"
        placeholder="Write the insurance-only in-app message here."
      />
    </label>
  </div>

  <div className="mt-4 flex flex-wrap gap-2">
    <button onClick={handleSendBroadcast} disabled={broadcastState === 'submitting'} className="btn-primary">
      {broadcastState === 'submitting' ? <RefreshCw size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
      Send Broadcast
    </button>
  </div>

  {broadcastSummary ? (
    <div className={`mt-4 ${broadcastState === 'sent' ? 'status-message status-message-success' : 'status-message status-message-danger'}`}>
      {broadcastSummary}
    </div>
  ) : null}
</div>
```

- [ ] **Step 6: Add the Phase 4C readiness badge**

Update the `PageHeader` meta badges in `InsuranceContent.js`:

```jsx
<span className="badge badge-orange">Manual reminders ready</span>
<span className="badge badge-blue">Custom broadcasts ready</span>
```

- [ ] **Step 7: Run the frontend helper test and lint**

Run:

```powershell
cd C:\Vscode\Main\codewave\frontend
node --test src/app/insurance/insuranceView.test.mjs
npm.cmd run lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 8: Commit the web workspace changes**

```powershell
cd C:\Vscode\Main\codewave
git add frontend/src/app/insurance/InsuranceContent.js frontend/src/app/insurance/insuranceView.test.mjs
git commit -m "feat: add insurance broadcast workspace"
```

---

### Task 5: Sync Contracts and Domain Docs

**Files:**
- Modify: `docs/contracts/T515-insurance-review-and-status-web-flow.md`
- Modify: `docs/architecture/domains/main-service/insurance.md`

- [ ] **Step 1: Update the web-flow contract**

Add a short section to `docs/contracts/T515-insurance-review-and-status-web-flow.md` describing:

```md
## Phase 4C Custom Broadcasts

The staff insurance workspace now supports insurance-only custom in-app broadcasts.

- Target modes:
  - `selected_cases`
  - `filtered_results`
- Delivery:
  - `in_app` only
- Audience:
  - active/non-terminal insurance cases only
- Deduplication:
  - one message per customer per send action
- Audit:
  - `manual_broadcast_sent` activity entries on affected inquiries
```

- [ ] **Step 2: Update the insurance domain doc**

Add a small subsection to `docs/architecture/domains/main-service/insurance.md`:

```md
### Manual Broadcasts

Insurance broadcasts are separate from workflow-triggered reminders and manual reminder sends.

- Route: `POST /api/insurance/broadcasts/send`
- Channel: `in_app`
- Scope: insurance-only active/non-terminal inquiries
- Customer dedupe: one notification per customer per action
- Inquiry audit trail: `manual_broadcast_sent`
```

- [ ] **Step 3: Review the docs diff for consistency**

Run:

```powershell
cd C:\Vscode\Main\codewave
git diff -- docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md
```

Expected: the docs reflect Phase 4C behavior without mentioning email, SMS, or non-insurance targeting.

- [ ] **Step 4: Commit the doc sync**

```powershell
cd C:\Vscode\Main\codewave
git add docs/contracts/T515-insurance-review-and-status-web-flow.md docs/architecture/domains/main-service/insurance.md
git commit -m "docs: sync insurance broadcast behavior"
```

---

### Task 6: Final Verification Pass

**Files:**
- Verify only

- [ ] **Step 1: Run backend insurance tests**

Run:

```powershell
cd C:\Vscode\Main\codewave\backend\apps\main-service
npm.cmd test -- insurance.service.spec.ts insurance.integration.spec.ts
```

Expected: PASS for the full insurance backend suite.

- [ ] **Step 2: Run frontend insurance tests**

Run:

```powershell
cd C:\Vscode\Main\codewave\frontend
node --test src/app/insurance/insuranceView.test.mjs
```

Expected: PASS for the insurance helper/view tests.

- [ ] **Step 3: Run frontend lint**

Run:

```powershell
cd C:\Vscode\Main\codewave\frontend
npm.cmd run lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 4: Manual QA on the real root app**

Open and test:

```text
http://127.0.0.1:3002/insurance
```

Expected checks:

- selected-cases broadcast send path works
- filtered-results broadcast send path works
- empty-audience validation appears when expected
- duplicate-customer cases produce one send and skip duplicate cases
- `Activity` tab reflects `manual_broadcast_sent`

- [ ] **Step 5: Commit any final verification-driven fixes**

```powershell
cd C:\Vscode\Main\codewave
git status --short
git add <final-fixed-files>
git commit -m "fix: polish insurance broadcast flow"
```

---

## Self-Review

- Spec coverage check:
  - custom title/message: covered in Tasks 1, 3, and 4
  - selected and filtered targeting: covered in Tasks 2, 3, and 4
  - active/non-terminal eligibility: covered in Task 2
  - customer dedupe: covered in Task 2
  - in-app only: covered in Tasks 1 and 2
  - staff-side activity history: covered in Tasks 2 and 5
- Placeholder scan:
  - no `TODO`, `TBD`, or “similar to previous task” placeholders remain
- Type consistency:
  - route name, DTO names, target mode values, and activity action names match across tasks
