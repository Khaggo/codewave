# Intake Inspection Front-Desk Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the intake inspection workspace into a front-desk guided intake flow that supports walk-ins, visit triage, customer concern capture, lightweight requirements checking, always-on arrival inspection, and clear next-step routing.

**Architecture:** Keep the existing intake workspace as the implementation base, but reorder it into a reception-first flow. Extend the draft/view helpers to support arrival context, visit classification, concern capture, requirement checks, and next-route decisions, while preserving the current inspection persistence path and adding the UI routing affordances needed for insurance and service handoff.

**Tech Stack:** Next.js App Router frontend, React 19, existing generated inspection helpers, local view-model `.mjs` helpers, Node test runner, ESLint

---

## File Map

### Existing files to modify

- `C:\Vscode\Main\codewave\frontend\src\screens\DigitalIntakeInspectionWorkspace.js`
  - main intake workspace UI, section ordering, save actions, conditional rendering, and interaction logic
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.mjs`
  - draft model, field defaults, payload builder, option sets, validation helpers, and new intake-specific field structure
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.mjs`
  - hero copy, visit-type copy, top-level section summaries, and view-state helpers
- `C:\Vscode\Main\codewave\frontend\src\lib\inspectionStaffClient.js`
  - only if needed to support extended payload fields or route handling
- `C:\Vscode\Main\codewave\frontend\src\lib\api\generated\inspections\staff-web-inspections.ts`
  - only if needed to keep the intake data contract aligned with the generated inspection types
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.test.mjs`
  - tests for draft shape, payload building, triage logic, and save-route decisions
- `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.test.mjs`
  - tests for hero copy, section guidance, conditional visit-type logic, and next-step labels
- `C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs`
  - copy/regression expectations if intake wording changes affect the concise-copy tests

### Potential backend follow-up files

- `C:\Vscode\Main\codewave\backend\apps\main-service\src\modules\inspections\...`
  - only if the current inspection payload cannot store the new intake fields cleanly

The plan assumes we first try to fit the redesign into the current contract. If the backend cannot hold the required data points, the implementation worker should stop and surface the exact mismatch before expanding scope.

---

### Task 1: Define the intake data model for reception-first flow

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.mjs`
- Test: `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.test.mjs`

- [ ] **Step 1: Write failing tests for the new intake draft fields**

Add tests covering:
- walk-in vs booking arrival type
- visit type
- customer concern fields
- lightweight requirements checklist
- next-route intent

Required test additions:

```javascript
test('createInitialIntakeDraft starts with reception-first intake fields', () => {
  const draft = createInitialIntakeDraft()

  assert.equal(draft.arrivalType, 'walk_in')
  assert.equal(draft.visitType, 'regular_service')
  assert.equal(draft.reasonForVisit, '')
  assert.equal(draft.requestedServiceSummary, '')
  assert.equal(draft.isRepeatVisit, false)
  assert.equal(draft.urgencyFlag, false)
  assert.deepEqual(draft.requirementsChecklist, {
    bookingFound: false,
    orCrPresent: false,
    validIdPresent: false,
    oldPolicyPresent: false,
    supportingDocsPresent: false,
  })
  assert.equal(draft.missingRequirementsNote, '')
  assert.equal(draft.nextRoute, 'service')
})

test('buildIntakeInspectionPayload preserves intake triage and requirements fields', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      arrivalType: 'with_booking',
      visitType: 'insurance_related',
      reasonForVisit: 'Customer arrived for insurance claim support.',
      requestedServiceSummary: 'Front bumper damage assessment.',
      isRepeatVisit: true,
      urgencyFlag: true,
      requirementsChecklist: {
        bookingFound: true,
        orCrPresent: true,
        validIdPresent: true,
        oldPolicyPresent: true,
        supportingDocsPresent: false,
      },
      missingRequirementsNote: 'Customer still needs to upload additional claim photos.',
      nextRoute: 'insurance',
      notes: 'Arrival inspection will continue below.',
    },
    receivedByStaff: 'Iris Santiago',
  })

  assert.equal(payload.arrivalType, 'with_booking')
  assert.equal(payload.visitType, 'insurance_related')
  assert.equal(payload.reasonForVisit, 'Customer arrived for insurance claim support.')
  assert.equal(payload.requestedServiceSummary, 'Front bumper damage assessment.')
  assert.equal(payload.isRepeatVisit, true)
  assert.equal(payload.urgencyFlag, true)
  assert.deepEqual(payload.requirementsChecklist, {
    bookingFound: true,
    orCrPresent: true,
    validIdPresent: true,
    oldPolicyPresent: true,
    supportingDocsPresent: false,
  })
  assert.equal(payload.missingRequirementsNote, 'Customer still needs to upload additional claim photos.')
  assert.equal(payload.nextRoute, 'insurance')
})
```

- [ ] **Step 2: Run the form tests to verify failure**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.test.mjs
```

Expected:
- tests fail because the draft shape and payload builder do not yet include the new intake fields

- [ ] **Step 3: Implement the minimal draft and payload model changes**

Update:
- `createInitialIntakeDraft`
- any field max length maps if needed
- `buildIntakeInspectionPayload`

Required behavior:
- draft includes reception-first fields
- payload carries them forward
- no unrelated inspection fields are removed

- [ ] **Step 4: Run the form tests to verify pass**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.test.mjs
```

Expected:
- new tests pass
- existing form tests stay green

- [ ] **Step 5: Commit**

```bash
git -C C:\Vscode\Main\codewave add ^
  frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs ^
  frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: extend intake draft for front-desk triage"
```

### Task 2: Add view helpers for visit-type guidance and next-step labels

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.mjs`
- Test: `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.test.mjs`

- [ ] **Step 1: Write failing tests for visit-type copy and routing labels**

Add tests covering:
- walk-in copy
- insurance-related continuation action
- complaint/back-job action
- inspection-only action

Required test additions:

```javascript
test('getIntakeWorkspaceHeroCopy keeps intake framed as front-desk arrival flow', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(false), {
    title: 'Front-Desk Intake',
    description: 'Capture arrival details, confirm the visit, and record vehicle condition.',
  })
})

test('getIntakePrimaryActionLabel returns the correct next-step action for each visit type', () => {
  assert.equal(getIntakePrimaryActionLabel('regular_service'), 'Save and Continue to Service')
  assert.equal(getIntakePrimaryActionLabel('insurance_related'), 'Save and Continue to Insurance')
  assert.equal(getIntakePrimaryActionLabel('back_job_complaint'), 'Save and Flag Complaint')
  assert.equal(getIntakePrimaryActionLabel('inspection_only'), 'Save Inspection')
})
```

- [ ] **Step 2: Run the workspace-view tests to verify failure**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.test.mjs
```

Expected:
- tests fail because the current helpers still describe a narrower inspection-first page

- [ ] **Step 3: Implement the new view helpers**

Add or update helper functions for:
- hero copy
- visit-type label formatting
- primary next-step button label
- optional requirement-section guidance

Keep the helper output concise and UI-friendly.

- [ ] **Step 4: Run the workspace-view tests to verify pass**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.test.mjs
```

Expected:
- new tests pass
- existing tests stay green

- [ ] **Step 5: Commit**

```bash
git -C C:\Vscode\Main\codewave add ^
  frontend/src/screens/digitalIntakeInspectionWorkspaceView.mjs ^
  frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: add intake visit guidance helpers"
```

### Task 3: Reorder the intake workspace into a guided front-desk flow

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\DigitalIntakeInspectionWorkspace.js`

- [ ] **Step 1: Write a failing copy/regression test for the new intake framing**

Extend `workspaceCopyCleanup.test.mjs` with dashboard-style source assertions for the intake screen.

Required test addition:

```javascript
test('intake workspace is framed as front-desk triage before inspection details', () => {
  const source = read('frontend/src/screens/DigitalIntakeInspectionWorkspace.js')

  assert.ok(source.includes('Arrival'))
  assert.ok(source.includes('Visit Type'))
  assert.ok(source.includes('Customer Concern'))
  assert.ok(source.includes('Requirements'))
  assert.ok(source.includes('Arrival Inspection'))
})
```

- [ ] **Step 2: Run the copy/regression test to verify failure**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected:
- intake framing assertions fail before the layout is updated

- [ ] **Step 3: Rebuild the intake workspace layout**

In `DigitalIntakeInspectionWorkspace.js`, reorder the sections into:

1. Arrival
2. Visit Type
3. Customer Concern
4. Requirements
5. Arrival Inspection
6. Inspection History
7. Next Step actions

Required implementation rules:
- walk-in and booking arrivals are both supported
- arrival inspection remains always visible
- helper text stays short
- the page should feel like front-desk intake, not a raw inspection data form

- [ ] **Step 4: Run the copy/regression test to verify pass**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected:
- new intake framing assertions pass
- unrelated concise-copy expectations remain green

- [ ] **Step 5: Commit**

```bash
git -C C:\Vscode\Main\codewave add ^
  frontend/src/screens/DigitalIntakeInspectionWorkspace.js ^
  frontend/src/screens/workspaceCopyCleanup.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: reorder intake workspace for front-desk flow"
```

### Task 4: Add lightweight requirements logic and conditional insurance/service routing

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\DigitalIntakeInspectionWorkspace.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.mjs`
- Test: `C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.test.mjs`

- [ ] **Step 1: Write failing tests for requirements and next-route rules**

Add tests covering:
- insurance-related visits surface the insurance next route
- regular service defaults to service routing
- walk-in does not require booking

Required test additions:

```javascript
test('buildIntakeInspectionPayload defaults regular service to service routing', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      visitType: 'regular_service',
      nextRoute: 'service',
    },
    receivedByStaff: 'Iris Santiago',
  })

  assert.equal(payload.nextRoute, 'service')
})

test('buildIntakeInspectionPayload keeps insurance-related routing when selected', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      visitType: 'insurance_related',
      nextRoute: 'insurance',
    },
    receivedByStaff: 'Iris Santiago',
  })

  assert.equal(payload.nextRoute, 'insurance')
})
```

- [ ] **Step 2: Run the form tests to verify failure**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.test.mjs
```

Expected:
- routing or requirements expectations fail before implementation is finished

- [ ] **Step 3: Implement lightweight requirements and route selection behavior**

Implementation should ensure:
- insurance visits show insurance-relevant requirement checks
- regular service keeps requirements simpler
- booking remains optional for walk-ins
- the chosen visit type controls the primary next-step intent

- [ ] **Step 4: Run the form tests to verify pass**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.test.mjs
```

Expected:
- routing and requirement tests pass

- [ ] **Step 5: Commit**

```bash
git -C C:\Vscode\Main\codewave add ^
  frontend/src/screens/DigitalIntakeInspectionWorkspace.js ^
  frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs ^
  frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: add intake requirements and next-route handling"
```

### Task 5: Polish intake UI/UX to match the recent insurance cleanup

**Files:**
- Modify: `C:\Vscode\Main\codewave\frontend\src\screens\DigitalIntakeInspectionWorkspace.js`
- Modify: `C:\Vscode\Main\codewave\frontend\src\app\globals.css` only if shared utility polish is truly needed

- [ ] **Step 1: Add a failing copy/regression expectation for shorter intake guidance**

Extend `workspaceCopyCleanup.test.mjs` to assert the page does not rely on long explanation blocks.

Required test addition:

```javascript
test('intake workspace guidance stays concise after front-desk redesign', () => {
  const source = read('frontend/src/screens/DigitalIntakeInspectionWorkspace.js')

  assert.ok(source.includes('Capture the visit, then record the vehicle condition.'))
})
```

- [ ] **Step 2: Run the regression test to verify failure**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected:
- concise guidance assertion fails before polish is applied

- [ ] **Step 3: Implement the polish pass**

Apply the same UI direction used on the insurance screens:
- lighter helper text
- fewer competing cards
- clearer section order
- stronger next-step button emphasis
- less “system-first” language

Avoid broad unrelated style changes.

- [ ] **Step 4: Run the regression test to verify pass**

Run:

```bash
node --test C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected:
- concise intake expectations pass

- [ ] **Step 5: Commit**

```bash
git -C C:\Vscode\Main\codewave add ^
  frontend/src/screens/DigitalIntakeInspectionWorkspace.js ^
  frontend/src/screens/workspaceCopyCleanup.test.mjs ^
  frontend/src/app/globals.css

git -C C:\Vscode\Main\codewave commit -m "style: polish intake workspace for front-desk flow"
```

### Task 6: Verify the intake redesign against the real local app

**Files:**
- No new source files required

- [ ] **Step 1: Run the focused intake/frontend tests**

Run:

```bash
node --test ^
  C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceForm.test.mjs ^
  C:\Vscode\Main\codewave\frontend\src\screens\digitalIntakeInspectionWorkspaceView.test.mjs ^
  C:\Vscode\Main\codewave\frontend\src\screens\workspaceCopyCleanup.test.mjs
```

Expected:
- all targeted intake/copy tests pass

- [ ] **Step 2: Run frontend lint**

Run:

```bash
cd C:\Vscode\Main\codewave\frontend
npm.cmd run lint
```

Expected:
- no ESLint warnings or errors

- [ ] **Step 3: Build the frontend**

Run:

```bash
cd C:\Vscode\Main\codewave\frontend
npm.cmd run build
```

Expected:
- successful production build

- [ ] **Step 4: Restart the real review app and verify routes**

Run:

```bash
Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -match '127.0.0.1 --port 3002' -and
    $_.CommandLine -match 'C:\\Vscode\\Main\\codewave\\frontend'
  } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Start-Sleep -Seconds 2

Start-Process -FilePath 'npm.cmd' `
  -ArgumentList 'run','start','--','--hostname','127.0.0.1','--port','3002' `
  -WorkingDirectory 'C:\Vscode\Main\codewave\frontend' `
  -WindowStyle Hidden

Start-Sleep -Seconds 8

Invoke-WebRequest -Uri 'http://127.0.0.1:3002/admin/intake-inspections' -UseBasicParsing
```

Expected:
- route responds with `200`

- [ ] **Step 5: Commit**

```bash
git -C C:\Vscode\Main\codewave add -A
git -C C:\Vscode\Main\codewave commit -m "test: verify intake front-desk alignment"
```

## Self-Review

### Spec coverage

Covered requirements:
- walk-in support
- visit-type classification
- customer concern capture
- lightweight requirements check
- always-on arrival inspection
- next-step routing to service or insurance
- front-desk-first layout
- concise UI/UX polish

No obvious spec gaps remain in this plan. The only deliberate caution is backend expansion: the worker should avoid inventing backend scope unless the current intake contract truly cannot store the required fields.

### Placeholder scan

Checked for:
- TODO/TBD placeholders
- vague “add error handling” language
- missing commands
- missing file paths

No placeholders remain.

### Type consistency

Planned field names are consistent across tasks:
- `arrivalType`
- `visitType`
- `reasonForVisit`
- `requestedServiceSummary`
- `isRepeatVisit`
- `urgencyFlag`
- `requirementsChecklist`
- `missingRequirementsNote`
- `nextRoute`

The same visit-type values are used consistently:
- `regular_service`
- `insurance_related`
- `back_job_complaint`
- `inspection_only`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-15-intake-inspection-front-desk-alignment.md`. Two execution options:

1. `Subagent-Driven (recommended)` - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. `Inline Execution` - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
