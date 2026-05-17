# Intake Inspection Intake Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the web intake inspection screen into an intake-first form with the requested sections, remove the old generic capture framing, and persist the new fields through the existing inspection payload.

**Architecture:** Keep the backend inspection DTO unchanged for this pass. Move intake-only defaults, field metadata, and payload serialization into a small pure helper so the mapping can be regression-tested with `node:test`, then update the React screen to render the new intake sections and consume the helper output while leaving inspection history/detail behavior intact.

**Tech Stack:** Next.js, React, Node `node:test`

---

## File Structure

- `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs`
  Responsibility: intake draft defaults, checklist/photo metadata, structured note serialization, and payload mapping into the existing inspection create DTO.
- `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`
  Responsibility: regression coverage for intake note serialization and payload mapping.
- `frontend/src/screens/digitalIntakeInspectionWorkspaceView.mjs`
  Responsibility: concise page-level hero copy for the intake-first screen.
- `frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
  Responsibility: regression coverage for the updated hero copy.
- `frontend/src/screens/DigitalIntakeInspectionWorkspace.js`
  Responsibility: render the new intake-first UI and wire it to the existing history/save flows.

### Task 1: Add failing tests for intake draft and payload mapping

**Files:**
- Create: `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`
- Create: `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildIntakeInspectionNotes,
  buildIntakeInspectionPayload,
  createInitialIntakeDraft,
} from './digitalIntakeInspectionWorkspaceForm.mjs'

test('buildIntakeInspectionNotes stores intake-only sections in labeled note blocks', () => {
  const draft = {
    ...createInitialIntakeDraft(),
    serviceConcern: 'Brake grinding noise, front left',
    currentOdometerKm: '45230',
    fuelLevel: '5/8',
    damageAreas: ['front_bumper', 'left_side_panels'],
    damageNotes: 'Scratch on left rear door.',
    customerItems: 'Dashcam and parking card',
    customerAcknowledged: true,
    customerSignatureName: 'Juan dela Cruz',
    receivedByStaff: 'staff-1',
    checklist: {
      batteryCondition: 'ok',
      engineOilLevel: 'ok',
      coolantLevel: 'issue',
      tirePressure: 'ok',
      allLightsFunctional: 'ok',
      brakePedalFeel: 'ok',
    },
  }

  const notes = buildIntakeInspectionNotes(draft)

  assert.match(notes, /SERVICE CONCERN/)
  assert.match(notes, /Fuel level on arrival: 5\/8/)
  assert.match(notes, /Damage areas: Front bumper, Left side panels/)
  assert.match(notes, /Coolant level: Issue/)
  assert.match(notes, /Customer signature: Juan dela Cruz/)
})

test('buildIntakeInspectionPayload maps intake fields into the current inspection DTO', () => {
  const draft = {
    ...createInitialIntakeDraft(),
    bookingId: 'booking-9',
    notes: 'Customer reports vibration at low speed.',
    arrivalPhotos: {
      front: 'upload://vehicle/front',
      rear: 'upload://vehicle/rear',
      leftSide: '',
      rightSide: 'upload://vehicle/right',
      dashboardOdometer: 'upload://vehicle/dashboard',
      interior: '',
      damageCloseup: 'upload://vehicle/damage',
      additional: '',
    },
    damageAreas: ['front_bumper'],
    damageNotes: 'Scuffed lower lip.',
  }

  const payload = buildIntakeInspectionPayload({
    draft,
    userId: 'staff-9',
  })

  assert.equal(payload.inspectionType, 'intake')
  assert.equal(payload.status, 'completed')
  assert.equal(payload.bookingId, 'booking-9')
  assert.equal(payload.inspectorUserId, 'staff-9')
  assert.deepEqual(payload.attachmentRefs, [
    'upload://vehicle/front',
    'upload://vehicle/rear',
    'upload://vehicle/right',
    'upload://vehicle/dashboard',
    'upload://vehicle/damage',
  ])
  assert.equal(payload.findings.length, 1)
  assert.equal(payload.findings[0].category, 'body')
  assert.equal(payload.findings[0].label, 'Existing damage marked')
  assert.match(payload.findings[0].notes, /Front bumper/)
  assert.match(payload.notes, /Customer reports vibration at low speed/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`
Expected: FAIL because `digitalIntakeInspectionWorkspaceForm.mjs` does not exist yet

- [ ] **Step 3: Write minimal implementation**

```javascript
const checklistLabels = {
  batteryCondition: 'Battery condition',
  engineOilLevel: 'Engine oil level',
  coolantLevel: 'Coolant level',
  tirePressure: 'Tire pressure',
  allLightsFunctional: 'All lights functional',
  brakePedalFeel: 'Brake pedal feel',
}

const damageAreaLabels = {
  front_bumper: 'Front bumper',
  rear_bumper_trunk: 'Rear bumper / trunk',
  roof_windshield: 'Roof / windshield',
  hood_front: 'Hood / front',
  left_side_panels: 'Left side panels',
  right_side_panels: 'Right side panels',
  undercarriage: 'Undercarriage',
}

export const createInitialIntakeDraft = () => ({
  customerUserId: '',
  vehicleId: '',
  bookingId: '',
  notes: '',
  serviceConcern: '',
  currentOdometerKm: '',
  fuelLevel: '1/2',
  damageAreas: [],
  damageNotes: '',
  customerItems: '',
  customerAcknowledged: false,
  customerSignatureName: '',
  receivedByStaff: '',
  arrivalPhotos: {
    front: '',
    rear: '',
    leftSide: '',
    rightSide: '',
    dashboardOdometer: '',
    interior: '',
    damageCloseup: '',
    additional: '',
  },
  checklist: {
    batteryCondition: 'ok',
    engineOilLevel: 'ok',
    coolantLevel: 'ok',
    tirePressure: 'ok',
    allLightsFunctional: 'ok',
    brakePedalFeel: 'ok',
  },
})

export const buildIntakeInspectionNotes = (draft) => {
  const lines = []
  lines.push('SERVICE CONCERN')
  lines.push(draft.serviceConcern || 'Not provided')
  lines.push('')
  lines.push('INTAKE DETAILS')
  lines.push(`Current odometer (km): ${draft.currentOdometerKm || 'Not provided'}`)
  lines.push(`Fuel level on arrival: ${draft.fuelLevel || 'Not provided'}`)
  lines.push(
    `Damage areas: ${
      draft.damageAreas.map((area) => damageAreaLabels[area] || area).join(', ') || 'None marked'
    }`,
  )
  lines.push(`Damage notes: ${draft.damageNotes || 'None'}`)
  lines.push('')
  lines.push('PRE-SERVICE CHECKLIST')
  Object.entries(draft.checklist).forEach(([key, value]) => {
    const label = checklistLabels[key] || key
    lines.push(`${label}: ${value === 'issue' ? 'Issue' : 'OK'}`)
  })
  lines.push('')
  lines.push('CUSTOMER ITEMS')
  lines.push(draft.customerItems || 'None noted')
  lines.push('')
  lines.push('CUSTOMER ACKNOWLEDGMENT')
  lines.push(`Acknowledged: ${draft.customerAcknowledged ? 'Yes' : 'No'}`)
  lines.push(`Customer signature: ${draft.customerSignatureName || 'Not captured'}`)
  lines.push(`Received by staff: ${draft.receivedByStaff || 'Not assigned'}`)
  return lines.join('\n')
}

export const buildIntakeInspectionPayload = ({ draft, userId }) => {
  const attachmentRefs = Object.values(draft.arrivalPhotos).filter(Boolean)
  const damageLabels = draft.damageAreas.map((area) => damageAreaLabels[area] || area)
  const finding =
    damageLabels.length || draft.damageNotes.trim()
      ? {
          category: 'body',
          label: 'Existing damage marked',
          severity: 'medium',
          notes: [damageLabels.join(', '), draft.damageNotes.trim()].filter(Boolean).join(' | '),
          isVerified: true,
        }
      : null

  return {
    inspectionType: 'intake',
    status: 'completed',
    bookingId: draft.bookingId.trim() || undefined,
    inspectorUserId: userId,
    notes: [draft.notes.trim(), buildIntakeInspectionNotes(draft)].filter(Boolean).join('\n\n'),
    attachmentRefs,
    findings: finding ? [finding] : [],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs
git commit -m "test: cover intake inspection payload mapping"
```

### Task 2: Update hero copy for the intake-first screen

**Files:**
- Modify: `frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
- Modify: `frontend/src/screens/digitalIntakeInspectionWorkspaceView.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'

import { getIntakeWorkspaceHeroCopy } from './digitalIntakeInspectionWorkspaceView.mjs'

test('staff hero copy matches the intake-first workspace wording', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(false), {
    title: 'Car Intake Inspection',
    description: 'Record vehicle condition before service begins.',
  })
})

test('technician hero copy stays intake-first and concise', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(true), {
    title: 'Car Intake Inspection',
    description: 'Record vehicle condition before service begins.',
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
Expected: FAIL because the current helper still returns the older generic inspection wording

- [ ] **Step 3: Write minimal implementation**

```javascript
export const getIntakeWorkspaceHeroCopy = () => ({
  title: 'Car Intake Inspection',
  description: 'Record vehicle condition before service begins.',
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/screens/digitalIntakeInspectionWorkspaceView.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs
git commit -m "test: refresh intake inspection workspace copy"
```

### Task 3: Refactor the workspace screen to render the intake-first form

**Files:**
- Modify: `frontend/src/screens/DigitalIntakeInspectionWorkspace.js`
- Test: `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`
- Test: `frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`

- [ ] **Step 1: Write the failing test**

Add this assertion to `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`:

```javascript
test('buildIntakeInspectionPayload can save a pending draft without changing the intake mapping', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      status: 'pending',
      notes: 'Waiting for customer acknowledgment.',
    },
    userId: 'staff-5',
  })

  assert.equal(payload.inspectionType, 'intake')
  assert.equal(payload.status, 'pending')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`
Expected: FAIL because `buildIntakeInspectionPayload` currently hard-codes `completed`

- [ ] **Step 3: Write minimal implementation**

Update `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs` so the draft carries `status`, then wire the screen to use it:

```javascript
export const createInitialIntakeDraft = () => ({
  customerUserId: '',
  vehicleId: '',
  bookingId: '',
  status: 'completed',
  notes: '',
  // ...
})

export const buildIntakeInspectionPayload = ({ draft, userId }) => ({
  inspectionType: 'intake',
  status: draft.status || 'completed',
  bookingId: draft.bookingId.trim() || undefined,
  inspectorUserId: userId,
  notes: [draft.notes.trim(), buildIntakeInspectionNotes(draft)].filter(Boolean).join('\n\n'),
  attachmentRefs: Object.values(draft.arrivalPhotos).filter(Boolean),
  findings: finding ? [finding] : [],
})
```

Then replace the old generic form in `frontend/src/screens/DigitalIntakeInspectionWorkspace.js` with these changes:

```javascript
import {
  buildIntakeInspectionPayload,
  createInitialIntakeDraft,
  intakeChecklistItems,
  intakeDamageAreaOptions,
  intakePhotoSlots,
} from './digitalIntakeInspectionWorkspaceForm.mjs'

const [draft, setDraft] = useState(createInitialIntakeDraft())

const saveInspection = async (nextStatus = draft.status) => {
  // existing access/vehicle checks stay in place
  const savedInspection = await createVehicleInspection({
    vehicleId: draft.vehicleId.trim(),
    inspection: buildIntakeInspectionPayload({
      draft: {
        ...draft,
        status: nextStatus,
        receivedByStaff: draft.receivedByStaff || user?.id || '',
      },
      userId: user?.id,
    }),
    accessToken: user.accessToken,
  })
}
```

Render the new intake-first sections in the left column:

```jsx
<div className="card p-5 md:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p className="card-title">Booking Reference</p>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">
        Link the intake record to the customer, vehicle, and visit context.
      </p>
    </div>
    <span className="badge badge-gray">{draft.status === 'pending' ? 'Pending intake' : 'Ready to save'}</span>
  </div>

  {/* customer, vehicle, booking selectors */}
  {/* vehicle details with current odometer input */}
  {/* fuel level segmented buttons */}
  {/* existing damage chips + notes */}
  {/* arrival photo ref inputs using named slots */}
  {/* pre-service checklist using OK / Issue toggles */}
  {/* customer items textarea */}
  {/* acknowledgment checkbox + signature/staff inputs */}
</div>
```

Remove the old generic elements:

```jsx
{/* remove "Live Vehicle Inspection Capture" */}
{/* remove inspection type selector */}
{/* remove status selector */}
{/* remove generic attachment refs single-line input */}
{/* remove primary finding card */}
{/* remove the entire Workflow Notes section */}
```

Keep the right-side history and selected-inspection panels unchanged except for any imports or copy that become unused.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
Expected: PASS

- [ ] **Step 5: Run frontend lint**

Run: `npm run lint`
Working directory: `frontend`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/screens/DigitalIntakeInspectionWorkspace.js frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceView.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs
git commit -m "feat: turn intake inspection into intake-first form"
```
