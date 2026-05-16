# Service Flow Workspaces Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `Job Orders`, `QA Audit`, and `Invoices & Orders` into cleaner queue-first service workspaces with detail panels below the queue and lighter, more operational UI copy.

**Architecture:** Keep the existing module boundaries and backend contracts intact, but reshape each screen around a primary queue, filters, and selected-row detail. Use helper `.mjs` files for copy and small layout decisions where possible, then tighten shared copy tests so the redesign stays aligned with the interview-driven service flow.

**Tech Stack:** Next.js App Router, React, existing Tailwind-style utility classes, local helper `.mjs` view files, Node test runner, ESLint

---

## File Structure

- `C:\Vscode\Main\codewave\frontend\src\screens\JobOrderWorkbench.js`
  - main `Job Orders` execution workspace
- `C:\Vscode\Main\codewave\frontend\src\screens\QAAuditWorkspace.js`
  - main `QA Audit` release decision workspace
- `C:\Vscode\Main\codewave\frontend\src\screens\InvoiceOrderManagementWorkspace.js`
  - main `Invoices & Orders` completion/payment workspace
- `C:\Vscode\Main\codewave\frontend\src\screens\qaAuditView.mjs`
  - QA-specific grouping/sorting helpers and any added presentation helpers
- `C:\Vscode\Main\codewave\frontend\src\screens\invoiceOrderManagementView.mjs`
  - finance helper labels/tone helpers and any added queue/detail helpers
- `C:\Vscode\Main\codewave\frontend\src\screens\qaAuditView.test.mjs`
  - focused QA helper tests
- `C:\Vscode\Main\codewave\frontend\src\screens\invoiceOrderManagementView.test.mjs`
  - focused finance helper tests
- `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`
  - cross-screen copy/structure regression checks

---

### Task 1: Lock in Shared Copy and Queue-First Expectations

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Add failing copy and structure assertions for all three workspaces**

Add a new test block near the existing workspace cleanup tests:

```javascript
test('service flow workspaces use queue-first copy and remove bulky dashboard wording', () => {
  const jobOrders = read('frontend/src/screens/JobOrderWorkbench.js')
  const qa = read('frontend/src/screens/QAAuditWorkspace.js')
  const finance = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  assert.ok(jobOrders.includes('Review active work, update progress, and prepare jobs for QA.'))
  assert.ok(jobOrders.includes('Focus on the live execution queue first.'))

  assert.ok(qa.includes('Review release checks, record verdicts, and keep overrides auditable.'))
  assert.ok(qa.includes('Focus on the jobs waiting for release review.'))

  assert.ok(finance.includes('Review invoice-ready work, payment entries, and completion records.'))
  assert.ok(finance.includes('Focus on records that are ready for payment or invoice follow-through.'))

  assert.ok(!jobOrders.includes('Choose a schedule date and refresh to load confirmed bookings.'))
  assert.ok(
    !qa.includes(
      'Review the validator summary before the head technician decides.',
    ),
  )
  assert.ok(
    !finance.includes(
      'Review aging, payment guidance, and live billing lookups before detail review.',
    ),
  )
})
```

- [ ] **Step 2: Run the copy regression test and confirm it fails**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/workspaceCopyCleanup.test.mjs
```

Expected:
- FAIL because the new concise copy is not in the three workspaces yet

- [ ] **Step 3: Commit the failing expectation change**

```powershell
cd C:\Vscode\Main\codewave
git add frontend/src/screens/workspaceCopyCleanup.test.mjs
git commit -m "test: lock service workspace redesign copy goals"
```

---

### Task 2: Redesign Job Orders as a Queue-First Execution Workspace

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\JobOrderWorkbench.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Write a narrow layout/copy assertion for Job Orders**

Append this test to `workspaceCopyCleanup.test.mjs`:

```javascript
test('job orders workspace keeps queue before detail actions', () => {
  const source = read('frontend/src/screens/JobOrderWorkbench.js')

  const queueIndex = source.indexOf('Job Order Queue')
  const detailIndex = source.indexOf('Selected Job Order')
  const progressIndex = source.indexOf('Progress Updates')

  assert.notEqual(queueIndex, -1)
  assert.notEqual(detailIndex, -1)
  assert.notEqual(progressIndex, -1)
  assert.ok(queueIndex < detailIndex)
  assert.ok(detailIndex < progressIndex)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/workspaceCopyCleanup.test.mjs
```

Expected:
- FAIL because the current screen does not yet expose the new queue/detail section labels in that order

- [ ] **Step 3: Refactor the Job Orders page header and queue summary copy**

In `JobOrderWorkbench.js`, replace the long operational framing with:

```javascript
const workbenchHero = {
  title: 'Job Orders',
  description: 'Review active work, update progress, and prepare jobs for QA.',
}
```

Update the main queue intro copy to:

```jsx
<p className="card-title">Job Order Queue</p>
<p className="mt-2 text-sm leading-6 text-ink-secondary">
  Focus on the live execution queue first.
</p>
```

- [ ] **Step 4: Move selected-row detail below the queue and label the execution sections clearly**

In `JobOrderWorkbench.js`, ensure the rendered order becomes:

```jsx
<section className="card">
  <p className="card-title">Job Order Queue</p>
  {/* filters + queue table */}
</section>

<section className="mt-6 grid gap-6">
  <div className="card p-6">
    <p className="card-title">Selected Job Order</p>
    {/* overview tiles */}
  </div>

  <div className="card p-6">
    <p className="card-title">Assignments</p>
    {/* assignment controls */}
  </div>

  <div className="card p-6">
    <p className="card-title">Progress Updates</p>
    {/* progress controls */}
  </div>

  <div className="card p-6">
    <p className="card-title">Evidence</p>
    {/* photo/evidence controls */}
  </div>

  <div className="card p-6">
    <p className="card-title">Finalize</p>
    {/* finalize/payment controls */}
  </div>
</section>
```

- [ ] **Step 5: Run the copy regression test and verify it passes**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/workspaceCopyCleanup.test.mjs
```

Expected:
- PASS for the new Job Orders assertions

- [ ] **Step 6: Commit the Job Orders redesign slice**

```powershell
cd C:\Vscode\Main\codewave
git add frontend/src/screens/JobOrderWorkbench.js frontend/src/screens/workspaceCopyCleanup.test.mjs
git commit -m "style: redesign job orders as queue-first execution workspace"
```

---

### Task 3: Redesign QA Audit as a Queue-First Release Workspace

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\QAAuditWorkspace.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\qaAuditView.mjs`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\qaAuditView.test.mjs`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Add a QA helper test for stable release grouping**

Append to `qaAuditView.test.mjs`:

```javascript
test('getGroupedQualityFindings keeps blocking findings ahead of review-needed findings', () => {
  const grouped = getGroupedQualityFindings([
    { id: 'w1', severity: 'warning', gate: 'notes', code: 'warn' },
    { id: 'c1', severity: 'critical', gate: 'photos', code: 'crit' },
  ])

  assert.equal(grouped[0].key, 'critical')
  assert.equal(grouped[1].key, 'warning')
})
```

- [ ] **Step 2: Run the QA helper tests and verify the new one passes before layout changes**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/qaAuditView.test.mjs
```

Expected:
- PASS

- [ ] **Step 3: Add a failing workspace copy/structure assertion for QA**

Append to `workspaceCopyCleanup.test.mjs`:

```javascript
test('qa audit workspace keeps release queue ahead of findings and verdict actions', () => {
  const source = read('frontend/src/screens/QAAuditWorkspace.js')

  const queueIndex = source.indexOf('QA Queue')
  const detailIndex = source.indexOf('Selected Audit')
  const blockingIndex = source.indexOf('Blocking Findings')
  const verdictIndex = source.indexOf('Verdict / Override')

  assert.notEqual(queueIndex, -1)
  assert.notEqual(detailIndex, -1)
  assert.notEqual(blockingIndex, -1)
  assert.notEqual(verdictIndex, -1)
  assert.ok(queueIndex < detailIndex)
  assert.ok(detailIndex < blockingIndex)
  assert.ok(blockingIndex < verdictIndex)
})
```

- [ ] **Step 4: Run the workspace cleanup test and confirm QA fails**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/workspaceCopyCleanup.test.mjs
```

Expected:
- FAIL because the QA workspace has not yet been reordered/labeled to match the new layout

- [ ] **Step 5: Refactor the QA page into release-queue-first structure**

In `QAAuditWorkspace.js`, update the top copy and main section labels to:

```jsx
<PageHeader
  title="QA Audit"
  description="Review release checks, record verdicts, and keep overrides auditable."
/>
```

```jsx
<section className="card">
  <p className="card-title">QA Queue</p>
  <p className="mt-2 text-sm leading-6 text-ink-secondary">
    Focus on the jobs waiting for release review.
  </p>
  {/* filters + queue */}
</section>

<section className="mt-6 grid gap-6">
  <div className="card p-6">
    <p className="card-title">Selected Audit</p>
  </div>
  <div className="card p-6">
    <p className="card-title">Pre-Check Summary</p>
  </div>
  <div className="card p-6">
    <p className="card-title">Blocking Findings</p>
  </div>
  <div className="card p-6">
    <p className="card-title">Review Needed</p>
  </div>
  <div className="card p-6">
    <p className="card-title">Verdict / Override</p>
  </div>
  <div className="card p-6">
    <p className="card-title">History</p>
  </div>
</section>
```

- [ ] **Step 6: Run QA helper tests and workspace cleanup tests**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/qaAuditView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs
```

Expected:
- PASS

- [ ] **Step 7: Commit the QA redesign slice**

```powershell
cd C:\Vscode\Main\codewave
git add frontend/src/screens/QAAuditWorkspace.js frontend/src/screens/qaAuditView.mjs frontend/src/screens/qaAuditView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs
git commit -m "style: redesign qa audit as release queue workspace"
```

---

### Task 4: Redesign Invoices & Orders as a Queue-First Completion Workspace

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\InvoiceOrderManagementWorkspace.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\invoiceOrderManagementView.mjs`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\invoiceOrderManagementView.test.mjs`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Add a finance helper test for concise invoice-state labels**

Append to `invoiceOrderManagementView.test.mjs`:

```javascript
test('getLoadMessageTone keeps finance workspace tones stable', () => {
  assert.equal(getLoadMessageTone('invoice_order_empty'), 'warning')
  assert.equal(getLoadMessageTone('invoice_order_loaded'), 'success')
  assert.equal(getLoadMessageTone('invoice_order_forbidden_role'), 'danger')
})
```

- [ ] **Step 2: Run the finance helper tests and verify they pass**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/invoiceOrderManagementView.test.mjs
```

Expected:
- PASS

- [ ] **Step 3: Add a failing workspace structure assertion for the finance page**

Append to `workspaceCopyCleanup.test.mjs`:

```javascript
test('invoice workspace keeps record queue before payment details', () => {
  const source = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  const queueIndex = source.indexOf('Invoice & Order Queue')
  const detailIndex = source.indexOf('Selected Record')
  const paymentIndex = source.indexOf('Payment Entries')

  assert.notEqual(queueIndex, -1)
  assert.notEqual(detailIndex, -1)
  assert.notEqual(paymentIndex, -1)
  assert.ok(queueIndex < detailIndex)
  assert.ok(detailIndex < paymentIndex)
})
```

- [ ] **Step 4: Run the workspace cleanup test and confirm finance fails**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/workspaceCopyCleanup.test.mjs
```

Expected:
- FAIL because the finance workspace has not yet been reordered/labeled to the new queue-first structure

- [ ] **Step 5: Refactor the finance page into completion-workspace structure**

In `InvoiceOrderManagementWorkspace.js`, update the top copy and queue/detail labels to:

```jsx
<PageHeader
  title="Invoices & Orders"
  description="Review invoice-ready work, payment entries, and completion records."
/>
```

```jsx
<section className="card">
  <p className="card-title">Invoice & Order Queue</p>
  <p className="mt-2 text-sm leading-6 text-ink-secondary">
    Focus on records that are ready for payment or invoice follow-through.
  </p>
  {/* filters + queue */}
</section>

<section className="mt-6 grid gap-6">
  <div className="card p-6">
    <p className="card-title">Selected Record</p>
  </div>
  <div className="card p-6">
    <p className="card-title">Invoice</p>
  </div>
  <div className="card p-6">
    <p className="card-title">Payment Entries</p>
  </div>
  <div className="card p-6">
    <p className="card-title">Linked Orders</p>
  </div>
  <div className="card p-6">
    <p className="card-title">History</p>
  </div>
</section>
```

- [ ] **Step 6: Run finance helper tests and workspace cleanup tests**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/invoiceOrderManagementView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs
```

Expected:
- PASS

- [ ] **Step 7: Commit the finance redesign slice**

```powershell
cd C:\Vscode\Main\codewave
git add frontend/src/screens/InvoiceOrderManagementWorkspace.js frontend/src/screens/invoiceOrderManagementView.mjs frontend/src/screens/invoiceOrderManagementView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs
git commit -m "style: redesign invoice workspace as completion queue"
```

---

### Task 5: Final Consistency Sweep Across the Three Service Workspaces

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\JobOrderWorkbench.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\QAAuditWorkspace.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\InvoiceOrderManagementWorkspace.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Add a final regression test for consistent service-workspace section naming**

Append to `workspaceCopyCleanup.test.mjs`:

```javascript
test('service workspaces use concise queue-first section labels', () => {
  const jobOrders = read('frontend/src/screens/JobOrderWorkbench.js')
  const qa = read('frontend/src/screens/QAAuditWorkspace.js')
  const finance = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  assert.ok(jobOrders.includes('Job Order Queue'))
  assert.ok(jobOrders.includes('Selected Job Order'))

  assert.ok(qa.includes('QA Queue'))
  assert.ok(qa.includes('Selected Audit'))

  assert.ok(finance.includes('Invoice & Order Queue'))
  assert.ok(finance.includes('Selected Record'))
})
```

- [ ] **Step 2: Run the service-workspace tests and confirm current state**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/qaAuditView.test.mjs frontend/src/screens/invoiceOrderManagementView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs
```

Expected:
- PASS if the prior tasks landed correctly

- [ ] **Step 3: Tighten any remaining bulky copy or redundant helper panels**

Apply final cleanup in the three screen files using these rules:

```text
- remove repeated helper paragraphs that only restate the obvious
- keep section descriptions to one short sentence
- keep summary chips/cards only when they change actionability
- prefer queue > detail > action order everywhere
```

- [ ] **Step 4: Commit the final consistency sweep**

```powershell
cd C:\Vscode\Main\codewave
git add frontend/src/screens/JobOrderWorkbench.js frontend/src/screens/QAAuditWorkspace.js frontend/src/screens/InvoiceOrderManagementWorkspace.js frontend/src/screens/workspaceCopyCleanup.test.mjs
git commit -m "style: unify service flow workspace redesign"
```

---

### Task 6: Verification and Real-App Review Readiness

**Files:**
- No code changes required unless verification exposes issues

- [ ] **Step 1: Run the focused screen/helper tests**

Run:

```powershell
cd C:\Vscode\Main\codewave
node --test frontend/src/screens/qaAuditView.test.mjs frontend/src/screens/invoiceOrderManagementView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs
```

Expected:
- PASS

- [ ] **Step 2: Run frontend lint**

Run:

```powershell
cd C:\Vscode\Main\codewave\frontend
npm.cmd run lint
```

Expected:
- PASS with no ESLint errors

- [ ] **Step 3: Build the frontend**

Run:

```powershell
cd C:\Vscode\Main\codewave\frontend
npm.cmd run build
```

Expected:
- PASS with production build success

- [ ] **Step 4: Restart and verify the real local app routes**

Run the usual local frontend restart for `3002`, then verify:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/admin/job-orders | Select-Object -ExpandProperty StatusCode
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/admin/qa-audit | Select-Object -ExpandProperty StatusCode
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/admin/invoices | Select-Object -ExpandProperty StatusCode
```

Expected:
- all three return `200`

- [ ] **Step 5: Commit only if verification required a final follow-up fix**

```powershell
cd C:\Vscode\Main\codewave
git add -A
git commit -m "fix: address final service workspace verification issues"
```

Use this step only if verification exposed and required a final patch.

---

## Self-Review

### Spec coverage

- Queue-first layout: covered in Tasks 2, 3, 4, and 5
- Detail below queue: covered in Tasks 2, 3, and 4
- Job Orders redesign: covered in Task 2
- QA Audit redesign: covered in Task 3
- Invoices & Orders redesign: covered in Task 4
- Copy reduction and consistency: covered in Tasks 1 and 5
- Verification on the real `3002` app: covered in Task 6

### Placeholder scan

- No `TBD`, `TODO`, or “implement later” markers included
- Every task has exact file paths
- Every run step has an exact command and expected result

### Type consistency

- Queue section labels are consistent across test tasks and implementation tasks
- Existing helper file names and screen file names match the real codebase

## Execution Handoff

Plan complete and saved to `C:\Vscode\Main\codewave\docs\superpowers\plans\2026-05-15-service-flow-workspaces-redesign.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
