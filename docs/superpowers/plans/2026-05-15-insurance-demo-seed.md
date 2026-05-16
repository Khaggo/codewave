# Insurance Demo Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable local seed script that resets and recreates a full insurance demo dataset, then prints credentials and scenario notes for web and mobile QA.

**Architecture:** Build a backend script entrypoint that loads local env, connects directly to Postgres, removes only tagged demo records, and recreates a known insurance dataset. Keep the demo scenario definitions and summary formatting in a small helper module so the data is easy to test and update without burying everything in one script file.

**Tech Stack:** Node, TypeScript, `pg`, existing backend script conventions, Jest in the backend workspace

---

## File Structure

- Create: `backend/scripts/seed-insurance-demo.ts`
  - Main entrypoint. Loads env, opens a Postgres client, deletes the tagged demo set, inserts the fresh demo dataset, and prints a copyable summary.
- Create: `backend/scripts/lib/insurance-demo-seed-data.ts`
  - Holds demo constants, customer/vehicle/inquiry scenario definitions, shared password/tag values, and summary-label helpers.
- Create: `backend/scripts/lib/insurance-demo-seed-data.spec.ts`
  - Verifies the demo definitions are complete, tagged correctly, and produce a stable summary shape.
- Modify: `backend/package.json`
  - Add `seed:insurance-demo` script.
- Optional Modify: `docs/superpowers/specs/2026-05-15-insurance-demo-seed-design.md`
  - Only if implementation reveals a small naming adjustment that should be reflected in the spec.

---

### Task 1: Add testable demo scenario definitions

**Files:**
- Create: `backend/scripts/lib/insurance-demo-seed-data.ts`
- Create: `backend/scripts/lib/insurance-demo-seed-data.spec.ts`
- Test: `backend/scripts/lib/insurance-demo-seed-data.spec.ts`

- [ ] **Step 1: Write the failing helper test**

```ts
import {
  DEMO_INSURANCE_PASSWORD,
  DEMO_INSURANCE_SCENARIOS,
  DEMO_INSURANCE_TAG,
  buildInsuranceDemoSummary,
} from './insurance-demo-seed-data';

describe('insurance demo seed definitions', () => {
  it('defines multiple tagged demo scenarios that cover the implemented insurance phases', () => {
    expect(DEMO_INSURANCE_TAG).toBe('demo.insurance.seed');
    expect(DEMO_INSURANCE_PASSWORD).toBe('DemoInsurance123!');
    expect(DEMO_INSURANCE_SCENARIOS).toHaveLength(6);
    expect(DEMO_INSURANCE_SCENARIOS.map((scenario) => scenario.key)).toEqual([
      'review-queue',
      'missing-documents',
      'payment-follow-up',
      'overdue-payment',
      'renewal-workflow',
      'completed-history',
    ]);
  });

  it('builds a printable summary for seeded customers and inquiries', () => {
    const summary = buildInsuranceDemoSummary([
      {
        email: 'demo.insurance.review@example.com',
        password: 'DemoInsurance123!',
        vehicleLabel: '2024 Toyota Vios - DEMO REV 001',
        scenarioLabel: 'Review queue',
        notes: 'Use for submitted and under-review queue checks.',
        inquiryStatuses: ['submitted', 'under_review'],
      },
    ]);

    expect(summary).toContain('demo.insurance.review@example.com');
    expect(summary).toContain('DemoInsurance123!');
    expect(summary).toContain('Review queue');
    expect(summary).toContain('submitted, under_review');
  });
});
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```bash
cd C:\Vscode\Main\codewave\backend
npm.cmd test -- scripts/lib/insurance-demo-seed-data.spec.ts
```

Expected: FAIL because `insurance-demo-seed-data.ts` does not exist yet.

- [ ] **Step 3: Write the minimal helper module**

```ts
export const DEMO_INSURANCE_TAG = 'demo.insurance.seed';
export const DEMO_INSURANCE_PASSWORD = 'DemoInsurance123!';

export type DemoInsuranceScenario = {
  key:
    | 'review-queue'
    | 'missing-documents'
    | 'payment-follow-up'
    | 'overdue-payment'
    | 'renewal-workflow'
    | 'completed-history';
  label: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  vehicle: {
    plateNumber: string;
    make: string;
    model: string;
    year: number;
    color: string;
  };
  notes: string;
  inquiries: Array<{
    inquiryType: 'comprehensive' | 'ctpl';
    purpose?: 'quotation' | 'claim' | 'renewal';
    subject: string;
    description: string;
    status:
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
    documentStatus?: 'incomplete' | 'under_verification' | 'complete' | 'rejected';
    paymentStatus?: 'not_required' | 'unpaid' | 'proof_submitted' | 'verifying' | 'paid' | 'overdue';
    renewalStatus?: 'not_applicable' | 'upcoming' | 'quoted' | 'awaiting_customer' | 'renewed' | 'expired';
  }>;
};

export const DEMO_INSURANCE_SCENARIOS: DemoInsuranceScenario[] = [
  {
    key: 'review-queue',
    label: 'Review queue',
    customerEmail: 'demo.insurance.review@example.com',
    customerFirstName: 'Demo',
    customerLastName: 'Review',
    vehicle: {
      plateNumber: 'DEMOREV001',
      make: 'Toyota',
      model: 'Vios',
      year: 2024,
      color: 'Silver',
    },
    notes: 'Use for submitted and under-review queue checks.',
    inquiries: [
      {
        inquiryType: 'comprehensive',
        subject: 'DEMO_INS_review_submitted',
        description: 'Fresh review queue item.',
        status: 'submitted',
      },
      {
        inquiryType: 'comprehensive',
        subject: 'DEMO_INS_review_under_review',
        description: 'Already under staff review.',
        status: 'under_review',
        documentStatus: 'under_verification',
      },
    ],
  },
  // remaining five scenarios follow the approved spec
];

export type InsuranceDemoSummaryRow = {
  email: string;
  password: string;
  vehicleLabel: string;
  scenarioLabel: string;
  notes: string;
  inquiryStatuses: string[];
};

export function buildInsuranceDemoSummary(rows: InsuranceDemoSummaryRow[]) {
  return rows
    .map(
      (row) =>
        [
          `Customer: ${row.email}`,
          `Password: ${row.password}`,
          `Vehicle: ${row.vehicleLabel}`,
          `Scenario: ${row.scenarioLabel}`,
          `Statuses: ${row.inquiryStatuses.join(', ')}`,
          `Notes: ${row.notes}`,
        ].join('\n'),
    )
    .join('\n\n');
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```bash
cd C:\Vscode\Main\codewave\backend
npm.cmd test -- scripts/lib/insurance-demo-seed-data.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/lib/insurance-demo-seed-data.ts backend/scripts/lib/insurance-demo-seed-data.spec.ts
git commit -m "test: define insurance demo seed scenarios"
```

---

### Task 2: Build the reusable insurance demo seed script

**Files:**
- Create: `backend/scripts/seed-insurance-demo.ts`
- Modify: `backend/package.json`
- Reference: `backend/scripts/seed-booking-catalog.ts`
- Reference: `backend/scripts/smoke-notifications-feed.ts`

- [ ] **Step 1: Write the failing execution command**

Run:

```bash
cd C:\Vscode\Main\codewave\backend
node -r ts-node/register scripts/seed-insurance-demo.ts
```

Expected: FAIL because the script file does not exist yet.

- [ ] **Step 2: Add the npm script hook**

```json
{
  "scripts": {
    "seed:booking-catalog": "node -r ts-node/register scripts/seed-booking-catalog.ts",
    "seed:insurance-demo": "node -r ts-node/register scripts/seed-insurance-demo.ts"
  }
}
```

- [ ] **Step 3: Write the script skeleton with env loading and DB connection**

```ts
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';

import {
  DEMO_INSURANCE_PASSWORD,
  DEMO_INSURANCE_SCENARIOS,
  DEMO_INSURANCE_TAG,
  buildInsuranceDemoSummary,
} from './lib/insurance-demo-seed-data';

const loadLocalEnv = () => {
  for (const fileName of ['.env.example', '.env']) {
    try {
      const envFile = readFileSync(resolve(process.cwd(), fileName), 'utf8');
      envFile.split(/\r?\n/).forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;
        const separatorIndex = trimmedLine.indexOf('=');
        if (separatorIndex === -1) return;
        const key = trimmedLine.slice(0, separatorIndex).trim();
        const value = trimmedLine.slice(separatorIndex + 1).trim();
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      });
    } catch {
      // ignore missing local env files
    }
  }
};

async function run() {
  loadLocalEnv();

  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://admin:root@localhost:5433/codewave';

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed the insurance demo dataset.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('begin');
    // cleanup + recreate demo set
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 4: Implement tagged cleanup before recreate**

```ts
async function deleteExistingDemoSet(client: Client) {
  await client.query(
    `
      delete from notification_delivery_attempts
      where notification_id in (
        select id from notifications where dedupe_key like $1
      )
    `,
    [`${DEMO_INSURANCE_TAG}%`],
  );

  await client.query(`delete from notifications where dedupe_key like $1`, [`${DEMO_INSURANCE_TAG}%`]);
  await client.query(`delete from reminder_rules where dedupe_key like $1`, [`${DEMO_INSURANCE_TAG}%`]);
  await client.query(
    `delete from insurance_activities where notes like $1 or action in ('manual_reminder_sent', 'manual_broadcast_sent') and inquiry_id in (
      select id from insurance_inquiries where subject like $2
    )`,
    [`%${DEMO_INSURANCE_TAG}%`, 'DEMO_INS_%'],
  );
  await client.query(
    `delete from insurance_documents where inquiry_id in (
      select id from insurance_inquiries where subject like $1
    )`,
    ['DEMO_INS_%'],
  );
  await client.query(
    `delete from insurance_records where inquiry_id in (
      select id from insurance_inquiries where subject like $1
    )`,
    ['DEMO_INS_%'],
  );
  await client.query(`delete from insurance_inquiries where subject like $1`, ['DEMO_INS_%']);
  await client.query(`delete from vehicles where plate_number like 'DEMO%'`);
  await client.query(`delete from auth_accounts where user_id in (select id from users where email like 'demo.insurance.%@example.com')`);
  await client.query(`delete from user_profiles where user_id in (select id from users where email like 'demo.insurance.%@example.com')`);
  await client.query(`delete from users where email like 'demo.insurance.%@example.com'`);
}
```

- [ ] **Step 5: Implement user, vehicle, and inquiry creation**

```ts
import * as bcrypt from 'bcrypt';

async function upsertDemoUser(client: Client, input: {
  email: string;
  firstName: string;
  lastName: string;
}) {
  const passwordHash = await bcrypt.hash(DEMO_INSURANCE_PASSWORD, 10);

  const userResult = await client.query<{ id: string }>(
    `
      insert into users (email, role, staff_code, is_active, deleted_email, deleted_at)
      values ($1, 'customer', null, true, null, null)
      on conflict (email)
      do update set is_active = true, deleted_email = null, deleted_at = null, updated_at = now()
      returning id
    `,
    [input.email],
  );

  const userId = userResult.rows[0].id;

  await client.query(
    `
      insert into user_profiles (user_id, first_name, last_name, phone)
      values ($1, $2, $3, null)
      on conflict (user_id)
      do update set first_name = excluded.first_name, last_name = excluded.last_name, updated_at = now()
    `,
    [userId, input.firstName, input.lastName],
  );

  await client.query(
    `
      insert into auth_accounts (user_id, password_hash, is_active)
      values ($1, $2, true)
      on conflict (user_id)
      do update set password_hash = excluded.password_hash, is_active = true, updated_at = now()
    `,
    [userId, passwordHash],
  );

  return userId;
}

async function createDemoVehicle(client: Client, userId: string, vehicle: {
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
}) {
  const result = await client.query<{ id: string }>(
    `
      insert into vehicles (user_id, plate_number, make, model, year, color, notes)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning id
    `,
    [userId, vehicle.plateNumber, vehicle.make, vehicle.model, vehicle.year, vehicle.color, DEMO_INSURANCE_TAG],
  );

  return result.rows[0].id;
}
```

- [ ] **Step 6: Seed workflow metadata, documents, notifications, and output summary**

```ts
async function createDemoInquiry(client: Client, input: {
  userId: string;
  vehicleId: string;
  subject: string;
  description: string;
  inquiryType: 'comprehensive' | 'ctpl';
  purpose?: 'quotation' | 'claim' | 'renewal';
  status: string;
  documentStatus?: string;
  paymentStatus?: string;
  renewalStatus?: string;
  paymentDueAt?: Date | null;
  policyExpiryAt?: Date | null;
  renewalDueAt?: Date | null;
  providerName?: string | null;
  policyNumber?: string | null;
}) {
  const result = await client.query<{ id: string }>(
    `
      insert into insurance_inquiries (
        user_id, vehicle_id, inquiry_type, purpose, subject, description,
        provider_name, policy_number, notes, status, document_status,
        payment_status, renewal_status, payment_due_at, policy_expiry_at,
        renewal_due_at, created_by_user_id, reviewed_by_user_id, reviewed_at
      )
      values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $1, $1, now()
      )
      returning id
    `,
    [
      input.userId,
      input.vehicleId,
      input.inquiryType,
      input.purpose ?? 'quotation',
      input.subject,
      input.description,
      input.providerName ?? null,
      input.policyNumber ?? null,
      DEMO_INSURANCE_TAG,
      input.status,
      input.documentStatus ?? 'incomplete',
      input.paymentStatus ?? 'not_required',
      input.renewalStatus ?? 'not_applicable',
      input.paymentDueAt ?? null,
      input.policyExpiryAt ?? null,
      input.renewalDueAt ?? null,
    ],
  );

  return result.rows[0].id;
}

async function createDemoNotification(client: Client, input: {
  userId: string;
  inquiryId: string;
  title: string;
  message: string;
  dedupeSuffix: string;
}) {
  await client.query(
    `
      insert into notifications (
        user_id, category, channel, source_type, source_id, title, message,
        status, dedupe_key, delivered_at
      )
      values ($1, 'insurance_update', 'in_app', 'insurance_inquiry', $2, $3, $4, 'sent', $5, now())
    `,
    [input.userId, input.inquiryId, input.title, input.message, `${DEMO_INSURANCE_TAG}:${input.dedupeSuffix}`],
  );
}

const summary = buildInsuranceDemoSummary(summaryRows);
console.log(summary);
```

- [ ] **Step 7: Run the script to verify it seeds successfully**

Run:

```bash
cd C:\Vscode\Main\codewave\backend
npm.cmd run seed:insurance-demo
```

Expected: PASS with console output that lists the six demo customer accounts, the shared password, vehicle labels, and scenario notes.

- [ ] **Step 8: Commit**

```bash
git add backend/package.json backend/scripts/seed-insurance-demo.ts
git commit -m "feat: add reusable insurance demo seed script"
```

---

### Task 3: Verify the live app uses the seeded scenarios

**Files:**
- Modify: `backend/scripts/seed-insurance-demo.ts`
- Reference: `frontend/src/app/insurance/InsuranceContent.js`
- Reference: `mobile/src/screens/InsuranceInquiryScreen.js`
- Test: live local routes and seeded credentials

- [ ] **Step 1: Write a failing smoke verification checklist**

Run:

```bash
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/insurance
```

Expected: backend/web routes load, but until the seed script finishes there is no guarantee the queue is populated with all intended scenarios.

- [ ] **Step 2: Add summary rows that map each customer to a manual QA purpose**

```ts
type SeededSummaryRow = {
  email: string;
  password: string;
  vehicleLabel: string;
  scenarioLabel: string;
  notes: string;
  inquiryStatuses: string[];
};

const summaryRows: SeededSummaryRow[] = [];

summaryRows.push({
  email: scenario.customerEmail,
  password: DEMO_INSURANCE_PASSWORD,
  vehicleLabel: `${scenario.vehicle.year} ${scenario.vehicle.make} ${scenario.vehicle.model} - ${scenario.vehicle.plateNumber}`,
  scenarioLabel: scenario.label,
  notes: scenario.notes,
  inquiryStatuses: scenario.inquiries.map((inquiry) => inquiry.status),
});
```

- [ ] **Step 3: Rerun the script and confirm the printed dataset is copyable**

Run:

```bash
cd C:\Vscode\Main\codewave\backend
npm.cmd run seed:insurance-demo
```

Expected: PASS with readable blocks like:

```text
Customer: demo.insurance.review@example.com
Password: DemoInsurance123!
Vehicle: 2024 Toyota Vios - DEMOREV001
Scenario: Review queue
Statuses: submitted, under_review
Notes: Use for submitted and under-review queue checks.
```

- [ ] **Step 4: Verify the staff queue loads seeded records**

Run:

```bash
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/insurance
```

Expected: `StatusCode` 200. Manual browser check should show multiple insurance queue states instead of an empty queue.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/seed-insurance-demo.ts
git commit -m "chore: finalize insurance demo seed output"
```

---

### Task 4: Deliver the user-facing QA checklist

**Files:**
- Create: `docs/superpowers/plans/2026-05-15-insurance-demo-seed-checklist.md`
- Reference: `docs/superpowers/specs/2026-05-15-insurance-demo-seed-design.md`

- [ ] **Step 1: Write the checklist document**

```md
# Insurance Demo QA Checklist

- [ ] Phase 1: Open `/insurance` and confirm submitted / under-review / needs-documents cases appear.
- [ ] Phase 1: Select a case and confirm the detail tabs load.
- [ ] Phase 1: Save a workflow update and confirm the status changes.
- [ ] Phase 2: Open collections and confirm unpaid / proof-submitted / overdue cases appear.
- [ ] Phase 2: Mark a payment case as verifying or paid.
- [ ] Phase 3: Open renewals and confirm due / awaiting-customer cases appear.
- [ ] Phase 3: Update renewal status and due dates.
- [ ] Phase 4A: Log into a demo customer on mobile and confirm insurance notifications are visible.
- [ ] Phase 4B: Send a manual reminder from `/insurance` and confirm result summary/history.
- [ ] Phase 4C: Send a custom broadcast and confirm the audience summary and customer feed entry.
```

- [ ] **Step 2: Save the checklist in the docs folder**

Path:

```text
docs/superpowers/plans/2026-05-15-insurance-demo-seed-checklist.md
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-05-15-insurance-demo-seed-checklist.md
git commit -m "docs: add insurance demo QA checklist"
```

---

## Self-Review

- Spec coverage:
  - reusable script: Task 2
  - reset/replace tagged demo set: Task 2
  - multiple customers across all insurance phases: Task 1 + Task 2
  - mobile-ready accounts and notifications: Task 2
  - printed credentials and scenario notes: Task 3
  - checkbox QA list: Task 4
- Placeholder scan:
  - no `TODO`, `TBD`, or “similar to” placeholders remain
- Type consistency:
  - scenario keys, password constant, and summary helper names are consistent across tasks
