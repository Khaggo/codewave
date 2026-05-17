# Web Workspace Copy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shorten major web workspace descriptions to one brief sentence without changing layout or behavior.

**Architecture:** Add one source-based regression test that reads the workspace files as text and locks in the new concise copy. Then update the targeted workspace screens in small clusters, keeping edits limited to `PageHeader.description`, top summary/stat descriptions, and major section descriptions while leaving forms, placeholders, validation text, and empty states unchanged.

**Tech Stack:** Next.js, React, Node `node:test`, ESLint

---

## File Map

- Create: `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Modify: `frontend/src/screens/Dashboard.js`
- Modify: `frontend/src/screens/DigitalIntakeInspectionWorkspace.js`
- Modify: `frontend/src/screens/QAAuditWorkspace.js`
- Modify: `frontend/src/screens/AdminAnalyticsWorkspace.js`
- Modify: `frontend/src/screens/ShopProductAdmin.js`
- Modify: `frontend/src/screens/SettingsWorkspace.js`
- Modify: `frontend/src/screens/LoyaltyManager.js`
- Modify: `frontend/src/screens/InvoiceOrderManagementWorkspace.js`
- Modify: `frontend/src/screens/InventoryWorkspace.js`
- Modify: `frontend/src/components/BookingServiceAdmin.js`
- Keep existing targeted helper checks green: `frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`

### Task 1: Add the shared regression test and clean the dashboard cluster

**Files:**
- Create: `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Modify: `frontend/src/screens/Dashboard.js`
- Modify: `frontend/src/screens/SettingsWorkspace.js`
- Test: `frontend/src/screens/workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

test('dashboard workspace copy is concise', () => {
  const source = read('frontend/src/screens/Dashboard.js')

  assert.ok(source.includes('Review assigned work and keep repair progress current.'))
  assert.ok(source.includes('Manage booking, intake, job-order, QA, and finance work from one workspace.'))
  assert.ok(source.includes('Open a job order to update progress or review intake history.'))
  assert.ok(source.includes('Keep workshop updates current for the rest of the staff.'))

  assert.ok(
    !source.includes(
      'Use this workspace as the staff command center for booking review, intake coordination, job-order handoff, QA checks, and finance follow-through.',
    ),
  )
})

test('settings workspace copy stays one sentence', () => {
  const source = read('frontend/src/screens/SettingsWorkspace.js')

  assert.ok(source.includes('Review staff details and current account security controls.'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs`

Expected: FAIL because `Dashboard.js` and `SettingsWorkspace.js` still contain the older longer descriptions.

- [ ] **Step 3: Write minimal implementation**

```javascript
// frontend/src/screens/Dashboard.js
description="Review assigned work and keep repair progress current."
description="Manage booking, intake, job-order, QA, and finance work from one workspace."
description="Open a job order to update progress or review intake history."
description="Keep workshop updates current for the rest of the staff."
description="Work currently assigned to your queue."
description="Repairs awaiting progress or completion updates."
description="Confirmed work ready for workshop execution."
description="Work waiting on parts, approval, or review."

// frontend/src/screens/SettingsWorkspace.js
description="Review staff details and current account security controls."
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs`

Expected: PASS with the dashboard and settings assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/screens/workspaceCopyCleanup.test.mjs frontend/src/screens/Dashboard.js frontend/src/screens/SettingsWorkspace.js
git commit -m "test: lock concise dashboard workspace copy"
```

### Task 2: Clean intake, QA, and finance workspace descriptions

**Files:**
- Modify: `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Modify: `frontend/src/screens/DigitalIntakeInspectionWorkspace.js`
- Modify: `frontend/src/screens/QAAuditWorkspace.js`
- Modify: `frontend/src/screens/InvoiceOrderManagementWorkspace.js`
- Test: `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Test: `frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
- Test: `frontend/src/screens/qaAuditView.test.mjs`
- Test: `frontend/src/screens/invoiceOrderManagementView.test.mjs`

- [ ] **Step 1: Extend the failing test**

```javascript
test('intake, qa, and finance workspaces use short section descriptions', () => {
  const intake = read('frontend/src/screens/DigitalIntakeInspectionWorkspace.js')
  const qa = read('frontend/src/screens/QAAuditWorkspace.js')
  const finance = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  assert.ok(intake.includes('Record intake, pre-repair, completion, and return findings per vehicle.'))
  assert.ok(intake.includes('Save one inspection record for the selected vehicle.'))
  assert.ok(intake.includes('Load prior inspection records for the active vehicle.'))

  assert.ok(qa.includes('Review QA checks, record verdicts, and keep overrides auditable.'))

  assert.ok(finance.includes('Review service invoices, ecommerce orders, and aging analytics from one workspace.'))
  assert.ok(finance.includes('Review aging, payment guidance, and live billing lookups before detail review.'))
  assert.ok(finance.includes('Inspect loaded job orders for invoice and payment status.'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs`

Expected: FAIL because the QA and finance screens still contain multi-sentence or longer descriptions.

- [ ] **Step 3: Write minimal implementation**

```javascript
// frontend/src/screens/QAAuditWorkspace.js
description="Review QA checks, record verdicts, and keep overrides auditable."

// frontend/src/screens/InvoiceOrderManagementWorkspace.js
description="Review service invoices, ecommerce orders, and aging analytics from one workspace."
description="Review aging, payment guidance, and live billing lookups before detail review."
description="Inspect loaded job orders for invoice and payment status."
description="Inspect loaded ecommerce orders and invoice details."
description="Review payment entries recorded for the loaded invoice context."
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs frontend/src/screens/qaAuditView.test.mjs frontend/src/screens/invoiceOrderManagementView.test.mjs`

Expected: PASS with the copy regression test green and the existing helper tests still passing.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/screens/workspaceCopyCleanup.test.mjs frontend/src/screens/DigitalIntakeInspectionWorkspace.js frontend/src/screens/QAAuditWorkspace.js frontend/src/screens/InvoiceOrderManagementWorkspace.js
git commit -m "feat: shorten intake qa and finance workspace copy"
```

### Task 3: Clean catalog, booking-service, and inventory workspace descriptions

**Files:**
- Modify: `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Modify: `frontend/src/screens/ShopProductAdmin.js`
- Modify: `frontend/src/components/BookingServiceAdmin.js`
- Modify: `frontend/src/screens/InventoryWorkspace.js`
- Test: `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Test: `frontend/src/screens/shopProductAdminView.test.mjs`
- Test: `frontend/src/components/bookingServiceAdminView.test.mjs`

- [ ] **Step 1: Extend the failing test**

```javascript
test('catalog, booking-service, and inventory workspaces use one-sentence descriptions', () => {
  const shop = read('frontend/src/screens/ShopProductAdmin.js')
  const booking = read('frontend/src/components/BookingServiceAdmin.js')
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')

  assert.ok(shop.includes('Create categories and publish storefront-ready catalog products.'))
  assert.ok(shop.includes('Create a category for product publishing.'))
  assert.ok(shop.includes('Publish products with fields that match the shared catalog store.'))

  assert.ok(booking.includes('Create booking categories and publish live booking services.'))
  assert.ok(booking.includes('Create a category before publishing services.'))
  assert.ok(booking.includes('Publish services with valid category records only.'))

  assert.ok(inventory.includes('Review live product visibility and planned inventory readiness.'))
  assert.ok(inventory.includes('Review current product visibility without stock counts.'))
  assert.ok(inventory.includes('Inspect current catalog metadata for the selected product.'))
  assert.ok(inventory.includes('Review which inventory capabilities are live or planned.'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs`

Expected: FAIL because the shop, booking-service, and inventory descriptions are still verbose.

- [ ] **Step 3: Write minimal implementation**

```javascript
// frontend/src/screens/ShopProductAdmin.js
description="Create categories and publish storefront-ready catalog products."
description="Create a category for product publishing."
description="Publish products with fields that match the shared catalog store."
description="Open any product row to manage details or images."

// frontend/src/components/BookingServiceAdmin.js
description="Create booking categories and publish live booking services."
description="Create a category before publishing services."
description="Publish services with valid category records only."
description="Review live services from the booking catalog."

// frontend/src/screens/InventoryWorkspace.js
description="Review live product visibility and planned inventory readiness."
description="Review current product visibility without stock counts."
description="Inspect current catalog metadata for the selected product."
description="Review which inventory capabilities are live or planned."
description="Review planned stock controls that are not live yet."
description="Review the planned stock-state glossary."
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs frontend/src/screens/shopProductAdminView.test.mjs frontend/src/components/bookingServiceAdminView.test.mjs`

Expected: PASS with the new copy assertions and existing helper tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/screens/workspaceCopyCleanup.test.mjs frontend/src/screens/ShopProductAdmin.js frontend/src/components/BookingServiceAdmin.js frontend/src/screens/InventoryWorkspace.js
git commit -m "feat: shorten catalog and inventory workspace copy"
```

### Task 4: Clean analytics and loyalty workspace descriptions

**Files:**
- Modify: `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Modify: `frontend/src/screens/AdminAnalyticsWorkspace.js`
- Modify: `frontend/src/screens/LoyaltyManager.js`
- Test: `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Test: `frontend/src/screens/adminAnalyticsView.test.mjs`
- Test: `frontend/src/screens/loyaltyManagerView.test.mjs`

- [ ] **Step 1: Extend the failing test**

```javascript
test('analytics and loyalty workspaces stay concise', () => {
  const analytics = read('frontend/src/screens/AdminAnalyticsWorkspace.js')
  const loyalty = read('frontend/src/screens/LoyaltyManager.js')

  assert.ok(analytics.includes('Inspect read-only analytics snapshots across operations and support domains.'))
  assert.ok(analytics.includes('Review derived sales signals from the latest snapshot.'))
  assert.ok(analytics.includes('Review insurance workload from the latest snapshot.'))
  assert.ok(analytics.includes('Review service demand from the latest dashboard snapshot.'))

  assert.ok(loyalty.includes('Manage rewards, earning rules, and loyalty analytics.'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs`

Expected: FAIL because `AdminAnalyticsWorkspace.js` still contains many longer descriptions.

- [ ] **Step 3: Write minimal implementation**

```javascript
// frontend/src/screens/AdminAnalyticsWorkspace.js
description="Inspect read-only analytics snapshots across operations and support domains."
description="Review derived sales signals from the latest snapshot."
description="Review insurance workload from the latest snapshot."
description="Review service demand from the latest dashboard snapshot."
description="Review slot pressure from the latest dashboard snapshot."
description="Review booking-state counts from the operations snapshot."
description="Review job-order counts from the operations snapshot."
description="Review adviser workload from the latest operations snapshot."
description="Review loyalty activity from the latest analytics snapshot."
description="Review invoice aging from the latest analytics snapshot."
description="Review the audit trail from the latest analytics snapshot."

// frontend/src/screens/LoyaltyManager.js
description="Manage rewards, earning rules, and loyalty analytics."
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs frontend/src/screens/adminAnalyticsView.test.mjs frontend/src/screens/loyaltyManagerView.test.mjs`

Expected: PASS with the analytics and loyalty copy assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/screens/workspaceCopyCleanup.test.mjs frontend/src/screens/AdminAnalyticsWorkspace.js frontend/src/screens/LoyaltyManager.js
git commit -m "feat: shorten analytics and loyalty workspace copy"
```

### Task 5: Final verification and cleanup

**Files:**
- Modify: `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Verify: `frontend/src/screens/Dashboard.js`
- Verify: `frontend/src/screens/DigitalIntakeInspectionWorkspace.js`
- Verify: `frontend/src/screens/QAAuditWorkspace.js`
- Verify: `frontend/src/screens/AdminAnalyticsWorkspace.js`
- Verify: `frontend/src/screens/ShopProductAdmin.js`
- Verify: `frontend/src/screens/SettingsWorkspace.js`
- Verify: `frontend/src/screens/LoyaltyManager.js`
- Verify: `frontend/src/screens/InvoiceOrderManagementWorkspace.js`
- Verify: `frontend/src/screens/InventoryWorkspace.js`
- Verify: `frontend/src/components/BookingServiceAdmin.js`

- [ ] **Step 1: Expand the regression test to cover the remaining targeted strings**

```javascript
test('old verbose workspace descriptions are removed from targeted files', () => {
  const checks = [
    [
      'frontend/src/screens/Dashboard.js',
      'Use this workspace as the staff command center for booking review, intake coordination, job-order handoff, QA checks, and finance follow-through.',
    ],
    [
      'frontend/src/screens/QAAuditWorkspace.js',
      'Review automated pre-check summaries, let the head technician record the final pass or block verdict, and keep overrides auditable when a super admin must intervene.',
    ],
    [
      'frontend/src/screens/AdminAnalyticsWorkspace.js',
      'This hub keeps analytics read-only and derived so staff can inspect the real snapshot without mixing reporting with unrelated review placeholders.',
    ],
    [
      'frontend/src/screens/InventoryWorkspace.js',
      'Review live catalog visibility, inspect product metadata, and keep planned stock behavior clearly separated from the current read-only inventory surface.',
    ],
  ]

  for (const [target, oldCopy] of checks) {
    const source = read(target)
    assert.ok(!source.includes(oldCopy))
  }
})
```

- [ ] **Step 2: Run the full targeted test set**

Run: `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs frontend/src/screens/adminAnalyticsView.test.mjs frontend/src/screens/digitalIntakeInspectionView.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs frontend/src/screens/invoiceOrderManagementView.test.mjs frontend/src/screens/loyaltyManagerView.test.mjs frontend/src/screens/qaAuditView.test.mjs frontend/src/screens/settingsView.test.mjs frontend/src/screens/shopProductAdminView.test.mjs frontend/src/components/bookingServiceAdminView.test.mjs`

Expected: PASS with all targeted view and copy regression tests green.

- [ ] **Step 3: Run the frontend linter**

Run: `npm run lint`

Expected: PASS with no ESLint warnings or errors.

- [ ] **Step 4: Review the diff for scope**

Run: `git diff -- frontend/src/screens frontend/src/components/BookingServiceAdmin.js`

Expected: Only copy-string changes plus the new regression test file.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/screens/workspaceCopyCleanup.test.mjs frontend/src/screens/Dashboard.js frontend/src/screens/DigitalIntakeInspectionWorkspace.js frontend/src/screens/QAAuditWorkspace.js frontend/src/screens/AdminAnalyticsWorkspace.js frontend/src/screens/ShopProductAdmin.js frontend/src/screens/SettingsWorkspace.js frontend/src/screens/LoyaltyManager.js frontend/src/screens/InvoiceOrderManagementWorkspace.js frontend/src/screens/InventoryWorkspace.js frontend/src/components/BookingServiceAdmin.js
git commit -m "feat: shorten web workspace descriptions"
```
