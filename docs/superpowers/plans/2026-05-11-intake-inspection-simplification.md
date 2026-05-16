# Intake Inspection Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant Intake Inspection cards and shorten explanatory copy without changing workflow behavior.

**Architecture:** Move the screen copy and summary-card structure into a small view helper so the simplified layout can be regression-tested with `node:test`. Update the workspace component to render only the kept sections and consume the new copy helper.

**Tech Stack:** Next.js, React, Node `node:test`

---

### Task 1: Add a regression test for simplified workspace content

**Files:**
- Create: `frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
- Create: `frontend/src/screens/digitalIntakeInspectionWorkspaceView.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getIntakeWorkspaceHeroCopy,
  getIntakeWorkspaceSummaryCards,
} from './digitalIntakeInspectionWorkspaceView.mjs'

test('staff hero copy is concise and route cards are no longer needed', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(false), {
    title: 'Capture Vehicle Condition Before Release Decisions',
    description: 'Record intake, pre-repair, completion, and return findings per vehicle.',
  })
})

test('staff summary cards are reduced to three focused cards', () => {
  const cards = getIntakeWorkspaceSummaryCards({ isTechnician: false, inspectionCount: 0 })

  assert.equal(cards.length, 3)
  assert.deepEqual(
    cards.map((card) => card.title),
    ['Vehicle-scoped intake', 'Known vehicle lookup', 'Release review stays separate'],
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
Expected: FAIL because `digitalIntakeInspectionWorkspaceView.mjs` does not exist yet

- [ ] **Step 3: Write minimal implementation**

```javascript
export const getIntakeWorkspaceHeroCopy = (isTechnician) =>
  isTechnician
    ? {
        title: 'Capture Vehicle Condition And Workshop Findings',
        description: 'Review history and save vehicle inspection findings before and after service.',
      }
    : {
        title: 'Capture Vehicle Condition Before Release Decisions',
        description: 'Record intake, pre-repair, completion, and return findings per vehicle.',
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceView.mjs
git commit -m "test: cover intake inspection workspace copy"
```

### Task 2: Apply the simplified content to the workspace screen

**Files:**
- Modify: `frontend/src/screens/DigitalIntakeInspectionWorkspace.js`
- Test: `frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
test('technician summary copy stays concise after simplification', () => {
  const cards = getIntakeWorkspaceSummaryCards({ isTechnician: true, inspectionCount: 2 })

  assert.equal(cards.length, 3)
  assert.equal(cards[0].description, 'Save findings for the vehicle without creating separate booking or job-order truth.')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
Expected: FAIL because technician copy is not implemented yet

- [ ] **Step 3: Write minimal implementation**

```javascript
const heroCopy = getIntakeWorkspaceHeroCopy(isTechnician)
const summaryCards = getIntakeWorkspaceSummaryCards({
  isTechnician,
  inspectionCount: inspections.length,
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/screens/DigitalIntakeInspectionWorkspace.js
git commit -m "feat: simplify intake inspection workspace copy"
```
