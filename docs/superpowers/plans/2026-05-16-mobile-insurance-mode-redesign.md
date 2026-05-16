# Mobile Insurance Mode Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the mobile insurance experience into a lightweight app-level entry screen plus a dedicated insurance-only mode with internal navigation for overview, request, docs, status, and history.

**Architecture:** Keep the existing backend-driven inquiry, upload, payment, renewal, and history behavior intact, but reorganize the UI around two layers: an app-level `Insurance` entry screen and an in-module `Insurance mode` shell. Reuse the current split-panel direction where it helps, then refactor the current hybrid home into a true overview hub and consolidate payment and renewal into one unified status destination.

**Tech Stack:** Expo 54, React Native 0.81, React 19, Node test runner, existing mobile theme tokens, existing `insuranceClient` helpers, existing `insuranceModuleView.mjs` derived-state layer

---

## File Map

### Existing files to modify

- `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
  - top-level insurance container, app-entry vs insurance-mode routing, data loading, submit/upload handlers, and section selection
- `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.mjs`
  - derived entry-state, overview-state, and status-state helpers for the redesigned mode flow
- `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs`
  - helper-level tests for entry CTA logic, overview routing, and unified status behavior
- `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`
  - source-level structure test for the redesigned entry screen and insurance-mode shell
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceHomePanel.js`
  - repurpose from hybrid home card grid into the in-mode `Overview` hub
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceRequestPanel.js`
  - convert into a cleaner sectioned request page with sticky action area
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceDocumentsPanel.js`
  - convert into a checklist-and-upload workspace with less card nesting
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceStatusDetailPanel.js`
  - convert into the unified status/history presentation surface
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsurancePanelPrimitives.js`
  - shared presentational primitives for the entry screen, insurance-mode shell, internal nav, section rows, and sticky action footer

### New files to create

- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceEntryPanel.js`
  - lightweight app-level insurance doorway with selected vehicle, state summary, and `Enter insurance mode` CTA
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceModeShell.js`
  - internal insurance-mode frame with header, back affordance, and top section nav

### Notes on decomposition

- Keep the heavy workflow logic in `InsuranceInquiryScreen.js` and `insuranceModuleView.mjs`.
- Keep presentational concerns inside the `mobile/src/screens/insurance/` folder.
- Do not introduce new backend-facing files for this redesign.
- Do not rename existing panel files unless implementation is blocked by a naming collision. The current filenames can survive as long as their responsibilities become clearer.

---

### Task 1: Add Insurance Mode View-Model Helpers

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.mjs`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs`

- [ ] **Step 1: Write the failing helper tests for entry, overview, and status state**

Append these tests to `insuranceModuleView.test.mjs`:

```javascript
test('entry state keeps the app-level insurance tab lightweight', () => {
  assert.deepEqual(
    buildCustomerInsuranceEntryState({
      selectedVehicleLabel: '2024 Toyota Vios • DEMOREV001',
      latestInquiry: null,
      reminderCount: 2,
    }),
    {
      title: 'Protection center',
      summary: 'Open the dedicated insurance workspace for requests, documents, updates, and history.',
      vehicleLabel: '2024 Toyota Vios • DEMOREV001',
      statusLabel: 'Ready',
      ctaLabel: 'Enter insurance mode',
      reminderLabel: '2 reminders',
      tone: 'default',
    },
  )
})

test('overview state routes users to the best next action inside insurance mode', () => {
  assert.deepEqual(
    buildCustomerInsuranceOverviewState({
      selectedVehicleLabel: '2024 Toyota Vios • DEMOREV001',
      latestInquiry: {
        id: 'inq-18',
        status: 'needs_documents',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [{ type: 'valid_id', label: 'Valid ID' }],
      historyCount: 0,
    }),
    {
      title: 'Upload required documents',
      message: 'One required file is blocking review for this request.',
      ctaLabel: 'Open docs',
      routeKey: 'documents',
      routeRows: [
        { key: 'request', label: 'Request', helper: 'Review the request details and customer-safe notes.' },
        { key: 'documents', label: 'Documents', helper: 'Upload the missing file and review what is already on file.' },
        { key: 'status', label: 'Status', helper: 'See the current blocker, timeline, and latest update.' },
        { key: 'history', label: 'History', helper: 'Past completed insurance records for this vehicle.' },
      ],
    },
  )
})

test('status state folds payment and renewal into one tracking model', () => {
  assert.deepEqual(
    buildCustomerInsuranceStatusState({
      latestInquiry: {
        status: 'payment_pending',
        paymentStatus: 'awaiting_payment',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [],
      latestUpdateLabel: 'Payment instructions are ready.',
    }),
    {
      title: 'Payment follow-up',
      summary: 'Payment is the current blocker for this request.',
      ctaLabel: 'Review payment',
      ctaRouteKey: 'status',
      timeline: [
        { key: 'request', label: 'Request submitted', active: true },
        { key: 'documents', label: 'Documents complete', active: true },
        { key: 'payment', label: 'Payment follow-up', active: true },
        { key: 'renewal', label: 'Renewal', active: false },
      ],
    },
  )
})
```

- [ ] **Step 2: Run the helper tests to verify failure**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs
```

Expected:
- FAIL because `buildCustomerInsuranceEntryState`, `buildCustomerInsuranceOverviewState`, and `buildCustomerInsuranceStatusState` do not exist yet

- [ ] **Step 3: Add the new helper exports in `insuranceModuleView.mjs`**

Add these exports near the existing `INSURANCE_PANEL_KEYS` and hero helpers:

```javascript
export const INSURANCE_MODE_SECTION_KEYS = Object.freeze({
  overview: 'overview',
  request: 'request',
  documents: 'documents',
  status: 'status',
  history: 'history',
})

export const buildCustomerInsuranceEntryState = ({
  selectedVehicleLabel = '',
  latestInquiry = null,
  reminderCount = 0,
} = {}) => ({
  title: 'Protection center',
  summary:
    'Open the dedicated insurance workspace for requests, documents, updates, and history.',
  vehicleLabel: selectedVehicleLabel || 'Choose a vehicle to continue',
  statusLabel: latestInquiry?.id ? formatWorkflowLabel(latestInquiry.status) : selectedVehicleLabel ? 'Ready' : 'Vehicle needed',
  ctaLabel: 'Enter insurance mode',
  reminderLabel:
    reminderCount > 0 ? `${reminderCount} reminder${reminderCount === 1 ? '' : 's'}` : 'No reminders',
  tone: selectedVehicleLabel ? 'default' : 'warning',
})

export const buildCustomerInsuranceOverviewState = ({
  latestInquiry = null,
  missingRequiredDocuments = [],
} = {}) => {
  const missingCount = Array.isArray(missingRequiredDocuments) ? missingRequiredDocuments.length : 0

  const primary =
    !latestInquiry?.id
      ? {
          title: 'Start your first insurance request',
          message: 'Use insurance mode to create a customer-safe request and track what happens next.',
          ctaLabel: 'Open request',
          routeKey: INSURANCE_MODE_SECTION_KEYS.request,
        }
      : missingCount > 0
        ? {
            title: 'Upload required documents',
            message: `One required file is blocking review for this request.`,
            ctaLabel: 'Open docs',
            routeKey: INSURANCE_MODE_SECTION_KEYS.documents,
          }
        : {
            title: 'Review current request',
            message: 'See the latest status, payment follow-up, or renewal update in one place.',
            ctaLabel: 'Open status',
            routeKey: INSURANCE_MODE_SECTION_KEYS.status,
          }

  return {
    ...primary,
    routeRows: [
      {
        key: INSURANCE_MODE_SECTION_KEYS.request,
        label: 'Request',
        helper: 'Review the request details and customer-safe notes.',
      },
      {
        key: INSURANCE_MODE_SECTION_KEYS.documents,
        label: 'Documents',
        helper: 'Upload the missing file and review what is already on file.',
      },
      {
        key: INSURANCE_MODE_SECTION_KEYS.status,
        label: 'Status',
        helper: 'See the current blocker, timeline, and latest update.',
      },
      {
        key: INSURANCE_MODE_SECTION_KEYS.history,
        label: 'History',
        helper: 'Past completed insurance records for this vehicle.',
      },
    ],
  }
}

export const buildCustomerInsuranceStatusState = ({
  latestInquiry = null,
  missingRequiredDocuments = [],
  latestUpdateLabel = '--',
} = {}) => {
  const missingCount = Array.isArray(missingRequiredDocuments) ? missingRequiredDocuments.length : 0

  if (missingCount > 0) {
    return {
      title: 'Documents needed',
      summary: 'Documents are the current blocker for this request.',
      ctaLabel: 'Open docs',
      ctaRouteKey: INSURANCE_MODE_SECTION_KEYS.documents,
      latestUpdateLabel,
      timeline: [
        { key: 'request', label: 'Request submitted', active: true },
        { key: 'documents', label: 'Documents needed', active: true },
        { key: 'payment', label: 'Payment follow-up', active: false },
        { key: 'renewal', label: 'Renewal', active: false },
      ],
    }
  }

  if (latestInquiry?.paymentStatus && latestInquiry.paymentStatus !== 'not_required') {
    return {
      title: 'Payment follow-up',
      summary: 'Payment is the current blocker for this request.',
      ctaLabel: 'Review payment',
      ctaRouteKey: INSURANCE_MODE_SECTION_KEYS.status,
      latestUpdateLabel,
      timeline: [
        { key: 'request', label: 'Request submitted', active: true },
        { key: 'documents', label: 'Documents complete', active: true },
        { key: 'payment', label: 'Payment follow-up', active: true },
        { key: 'renewal', label: 'Renewal', active: false },
      ],
    }
  }

  return {
    title: 'Current request status',
    summary: 'Review the latest customer-safe update and next step.',
    ctaLabel: 'Review status',
    ctaRouteKey: INSURANCE_MODE_SECTION_KEYS.status,
    latestUpdateLabel,
    timeline: [
      { key: 'request', label: 'Request submitted', active: true },
      { key: 'documents', label: 'Documents complete', active: true },
      { key: 'payment', label: 'Payment follow-up', active: false },
      { key: 'renewal', label: 'Renewal', active: false },
    ],
  }
}
```

- [ ] **Step 4: Run the helper tests to verify they pass**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/insuranceModuleView.mjs `
  mobile/src/screens/insuranceModuleView.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: add insurance mode view-model helpers"
```

### Task 2: Scaffold The App Entry And Insurance Mode Shell

**Files:**
- Create: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceEntryPanel.js`
- Create: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceModeShell.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsurancePanelPrimitives.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Add failing structure assertions for the new shell**

Update `insuranceScreenStructure.test.mjs` so it requires these fragments:

```javascript
const requiredFragments = [
  "import InsuranceEntryPanel from './insurance/InsuranceEntryPanel';",
  "import InsuranceModeShell from './insurance/InsuranceModeShell';",
  "const [isInInsuranceMode, setIsInInsuranceMode] = useState(false);",
  "const [activeModeSection, setActiveModeSection] = useState('overview');",
  "<InsuranceEntryPanel",
  "<InsuranceModeShell",
]
```

- [ ] **Step 2: Run the structure test to verify failure**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because the new entry panel and insurance-mode shell are not wired yet

- [ ] **Step 3: Create the minimal entry panel and mode shell**

Create `InsuranceEntryPanel.js`:

```javascript
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { InsuranceSectionCard } from './InsurancePanelPrimitives'
import { colors } from '../../theme'

export default function InsuranceEntryPanel({ entryState, onEnterMode }) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Insurance</Text>
      <Text style={styles.title}>{entryState.title}</Text>
      <Text style={styles.summary}>{entryState.summary}</Text>
      <InsuranceSectionCard title={entryState.vehicleLabel} helper={entryState.statusLabel} />
      <TouchableOpacity style={styles.button} onPress={onEnterMode} activeOpacity={0.88}>
        <Text style={styles.buttonText}>{entryState.ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  eyebrow: { color: colors.labelText, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900' },
  summary: { color: colors.mutedText, fontSize: 15, lineHeight: 24 },
  button: { borderRadius: 18, backgroundColor: colors.primary, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' },
})
```

Create `InsuranceModeShell.js`:

```javascript
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { colors, radius } from '../../theme'

const SECTION_LABELS = ['Overview', 'Request', 'Docs', 'Status', 'History']

export default function InsuranceModeShell({ activeSection, onChangeSection, onExitMode, children }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onExitMode} activeOpacity={0.85}>
        <Text style={styles.backLink}>Back to insurance</Text>
      </TouchableOpacity>

      <Text style={styles.eyebrow}>Customer insurance</Text>
      <Text style={styles.title}>Insurance mode</Text>

      <View style={styles.navRow}>
        {SECTION_LABELS.map((label) => {
          const key = label.toLowerCase() === 'docs' ? 'documents' : label.toLowerCase()
          const active = activeSection === key

          return (
            <TouchableOpacity
              key={key}
              style={[styles.navButton, active && styles.navButtonActive]}
              onPress={() => onChangeSection(key)}
              activeOpacity={0.88}
            >
              <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  backLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  navRow: { flexDirection: 'row', gap: 8, padding: 8, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  navButton: { flex: 1, borderRadius: radius.lg, paddingVertical: 12, alignItems: 'center' },
  navButtonActive: { backgroundColor: colors.primary },
  navText: { color: colors.mutedText, fontSize: 13, fontWeight: '700' },
  navTextActive: { color: colors.onPrimary },
})
```

- [ ] **Step 4: Add the shared primitive for section cards**

Append this export in `InsurancePanelPrimitives.js`:

```javascript
export function InsuranceSectionCard({ title, helper, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionCardTitle}>{title}</Text>
      {helper ? <Text style={styles.sectionCardHelper}>{helper}</Text> : null}
      {children}
    </View>
  )
}
```

Add styles:

```javascript
sectionCard: {
  borderRadius: radius.xl,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  padding: 18,
  gap: 8,
},
sectionCardTitle: {
  color: colors.text,
  fontSize: 17,
  fontWeight: '800',
},
sectionCardHelper: {
  color: colors.mutedText,
  fontSize: 14,
  lineHeight: 22,
},
```

- [ ] **Step 5: Run the structure test again**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- still FAIL because the top-level screen is not wired to the new shell yet

- [ ] **Step 6: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/insurance/InsuranceEntryPanel.js `
  mobile/src/screens/insurance/InsuranceModeShell.js `
  mobile/src/screens/insurance/InsurancePanelPrimitives.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: scaffold insurance entry and mode shell"
```

### Task 3: Wire The App Entry Screen And Mode Navigation

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Add the new imports and route state**

Add these imports near the existing panel imports:

```javascript
import InsuranceEntryPanel from './insurance/InsuranceEntryPanel';
import InsuranceModeShell from './insurance/InsuranceModeShell';
```

Add these state hooks near the current `activePanel` hook:

```javascript
const [isInInsuranceMode, setIsInInsuranceMode] = useState(false);
const [activeModeSection, setActiveModeSection] = useState('overview');
```

Replace the older `activePanel` home-default usage with:

```javascript
const openInsuranceMode = (section = 'overview') => {
  setIsInInsuranceMode(true);
  setActiveModeSection(section);
};

const closeInsuranceMode = () => {
  setIsInInsuranceMode(false);
  setActiveModeSection('overview');
};
```

- [ ] **Step 2: Derive entry, overview, and status state from the helper layer**

Add these memos near the current hero/action-card derivations:

```javascript
const selectedVehicleLabel = selectedVehicle
  ? buildOwnedVehicleInsuranceLabel(selectedVehicle)
  : '';

const entryState = useMemo(
  () =>
    buildCustomerInsuranceEntryState({
      selectedVehicleLabel,
      latestInquiry,
      reminderCount: claimStatusUpdates.length,
    }),
  [claimStatusUpdates.length, latestInquiry, selectedVehicleLabel],
)

const overviewState = useMemo(
  () =>
    buildCustomerInsuranceOverviewState({
      selectedVehicleLabel,
      latestInquiry,
      missingRequiredDocuments,
      historyCount: claimStatusUpdates.length,
    }),
  [claimStatusUpdates.length, latestInquiry, missingRequiredDocuments, selectedVehicleLabel],
)

const statusState = useMemo(
  () =>
    buildCustomerInsuranceStatusState({
      latestInquiry,
      missingRequiredDocuments,
      latestUpdateLabel: timeline[0]?.message ?? '--',
    }),
  [latestInquiry, missingRequiredDocuments, timeline],
)
```

- [ ] **Step 3: Reset mode state when the selected vehicle changes**

Add:

```javascript
useEffect(() => {
  setIsInInsuranceMode(false);
  setActiveModeSection('overview');
}, [selectedVehicleId]);
```

- [ ] **Step 4: Replace the top-level render flow**

In the main screen JSX, switch to this shape:

```javascript
{!isInInsuranceMode ? (
  <InsuranceEntryPanel
    entryState={entryState}
    onEnterMode={() => openInsuranceMode('overview')}
  />
) : (
  <InsuranceModeShell
    activeSection={activeModeSection}
    onChangeSection={setActiveModeSection}
    onExitMode={closeInsuranceMode}
  >
    {activeModeSection === 'overview' ? (
      <InsuranceHomePanel
        overviewState={overviewState}
        onOpenSection={setActiveModeSection}
      />
    ) : null}
  </InsuranceModeShell>
)}
```

Remove any remaining app-level render path that still shows the request form, checklist, payment, renewal, or history directly outside insurance mode.

- [ ] **Step 5: Run the structure test**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- PASS for the new entry-screen and insurance-mode shell wiring

- [ ] **Step 6: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/InsuranceInquiryScreen.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: wire mobile insurance mode shell"
```

### Task 4: Redesign Overview, Request, And Docs Pages

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceHomePanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceRequestPanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceDocumentsPanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsurancePanelPrimitives.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Expand the structure test to require the new in-mode sections**

Append this test:

```javascript
test('insurance mode renders overview, request, docs, status, and history destinations', () => {
  const source = read('mobile/src/screens/InsuranceInquiryScreen.js')

  const requiredFragments = [
    "activeModeSection === 'overview'",
    "activeModeSection === 'request'",
    "activeModeSection === 'documents'",
    "activeModeSection === 'status'",
    "activeModeSection === 'history'",
    '<InsuranceHomePanel',
    '<InsuranceRequestPanel',
    '<InsuranceDocumentsPanel',
    '<InsuranceStatusDetailPanel',
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected insurance mode fragment: ${fragment}`)
  }
})
```

- [ ] **Step 2: Run the structure test to verify failure**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because only the overview branch is wired so far

- [ ] **Step 3: Convert `InsuranceHomePanel.js` into the overview hub**

Replace the current hybrid-card content with a route-hub component shaped like:

```javascript
export default function InsuranceHomePanel({ overviewState, onOpenSection }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <InsurancePanelShell
        eyebrow="Overview"
        title="Insurance overview"
        subtitle="Use one section at a time so the current request stays easy to follow."
      >
        <InsuranceSectionCard title={overviewState.title} helper={overviewState.message}>
          <TouchableOpacity style={styles.primaryAction} onPress={() => onOpenSection(overviewState.routeKey)} activeOpacity={0.88}>
            <Text style={styles.primaryActionText}>{overviewState.ctaLabel}</Text>
          </TouchableOpacity>
        </InsuranceSectionCard>
      </InsurancePanelShell>

      {overviewState.routeRows.map((row) => (
        <TouchableOpacity key={row.key} style={styles.routeRow} onPress={() => onOpenSection(row.key)} activeOpacity={0.88}>
          <View>
            <Text style={styles.routeLabel}>{row.label}</Text>
            <Text style={styles.routeHelper}>{row.helper}</Text>
          </View>
          <Text style={styles.routeArrow}>→</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}
```

- [ ] **Step 4: Refactor `InsuranceRequestPanel.js` into a sectioned page with sticky action**

Keep the current request fields, but update the layout to use:
- one header
- vehicle summary strip
- inquiry type segment row
- claim details section
- insurance details section
- sticky footer button

Use this footer pattern:

```javascript
<View style={styles.footer}>
  <Text style={styles.footerMeta}>Step 1 of 5</Text>
  <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={isSubmitting} activeOpacity={0.88}>
    <Text style={styles.submitButtonText}>{isSubmitting ? 'Submitting...' : 'Submit request'}</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 5: Refactor `InsuranceDocumentsPanel.js` into a checklist-and-upload workspace**

Keep the current upload behavior, but rearrange the page into:
- current request summary
- checklist section
- upload target chips
- selected file summary
- note field
- sticky `Upload file` action

Use section dividers instead of nesting each logical group inside separate heavy cards.

- [ ] **Step 6: Wire the request and docs sections in `InsuranceInquiryScreen.js`**

Inside the `InsuranceModeShell`, add:

```javascript
{activeModeSection === 'request' ? (
  <InsuranceRequestPanel
    selectedVehicleLabel={selectedVehicleLabel}
    draft={draft}
    inquiryTypeOptions={inquiryTypeOptions}
    onChangeDraft={(patch) => setDraft((current) => ({ ...current, ...patch }))}
    onSubmit={handleSubmitInquiry}
    isSubmitting={isSubmitting}
  />
) : null}

{activeModeSection === 'documents' ? (
  <InsuranceDocumentsPanel
    checklist={requirementsChecklist}
    latestInquiry={latestInquiry}
    documentDraft={documentDraft}
    onChangeDocumentDraft={(patch) => setDocumentDraft((current) => ({ ...current, ...patch }))}
    onPickDocument={pickCustomerInsuranceDocument}
    onUploadDocument={handleUploadPickedDocument}
    isUploadingDocument={isUploadingDocument}
  />
) : null}
```

- [ ] **Step 7: Run the structure test**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- still FAIL only on the remaining status/history destination assertions

- [ ] **Step 8: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/InsuranceInquiryScreen.js `
  mobile/src/screens/insurance/InsuranceHomePanel.js `
  mobile/src/screens/insurance/InsuranceRequestPanel.js `
  mobile/src/screens/insurance/InsuranceDocumentsPanel.js `
  mobile/src/screens/insurance/InsurancePanelPrimitives.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: redesign mobile insurance overview and task pages"
```

### Task 5: Unify Status, History, And Final Verification

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceStatusDetailPanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Finish the structure test with status and history branches**

Ensure the structure test requires both:

```javascript
"activeModeSection === 'status'"
"activeModeSection === 'history'"
```

and both render branches:

```javascript
"eyebrow=\"Status\""
"eyebrow=\"History\""
```

- [ ] **Step 2: Run the structure test to verify failure**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because the new unified tracking destinations are not wired yet

- [ ] **Step 3: Refactor `InsuranceStatusDetailPanel.js` into a unified tracking surface**

Replace the current narrow wrapper with a panel that supports:
- one summary block
- timeline rows
- latest update row
- optional children for payment, renewal, or history details
- sticky CTA footer when a next action exists

Shape it like:

```javascript
export default function InsuranceStatusDetailPanel({
  eyebrow,
  title,
  subtitle,
  statusState,
  footerLabel,
  onFooterPress,
  children,
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <InsurancePanelShell eyebrow={eyebrow} title={title} subtitle={subtitle}>
        <InsuranceSectionCard title={statusState.title} helper={statusState.summary} />
      </InsurancePanelShell>

      <View style={styles.timelineSection}>
        {statusState.timeline.map((item) => (
          <View key={item.key} style={styles.timelineRow}>
            <View style={[styles.timelineDot, item.active && styles.timelineDotActive]} />
            <Text style={styles.timelineLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <InsuranceSectionCard title="Latest update" helper={statusState.latestUpdateLabel} />
      {children}

      {footerLabel && onFooterPress ? (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerButton} onPress={onFooterPress} activeOpacity={0.88}>
            <Text style={styles.footerButtonText}>{footerLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  )
}
```

- [ ] **Step 4: Wire status and history in `InsuranceInquiryScreen.js`**

Add these branches:

```javascript
{activeModeSection === 'status' ? (
  <InsuranceStatusDetailPanel
    eyebrow="Status"
    title="Current request status"
    subtitle="Review the current blocker, latest update, and next action in one place."
    statusState={statusState}
    footerLabel={statusState.ctaLabel}
    onFooterPress={() => {
      if (statusState.ctaRouteKey === 'documents') {
        setActiveModeSection('documents');
      }
    }}
  >
    {latestInquiry?.paymentStatus && latestInquiry.paymentStatus !== 'not_required' ? (
      <InsuranceSectionCard
        title="Payment"
        helper={paymentSummary.message}
      />
    ) : null}

    {latestInquiry?.renewalStatus && latestInquiry.renewalStatus !== 'not_applicable' ? (
      <InsuranceSectionCard
        title="Renewal"
        helper={buildRenewalPrompt(latestInquiry).message}
      />
    ) : null}
  </InsuranceStatusDetailPanel>
) : null}

{activeModeSection === 'history' ? (
  <InsuranceStatusDetailPanel
    eyebrow="History"
    title="Recorded vehicle updates"
    subtitle="Completed customer-safe insurance records for this vehicle."
    statusState={{
      title: claimStatusUpdates.length ? 'Completed records' : 'No history yet',
      summary: historySummary,
      latestUpdateLabel: claimStatusUpdates[0]?.description ?? '--',
      timeline: [],
    }}
  >
    {claimStatusUpdates.length
      ? claimStatusUpdates.map((record) => (
          <InsuranceSectionCard
            key={`${record.status}-${record.updatedAt}`}
            title={record.statusLabel}
            helper={record.description}
          />
        ))
      : (
        <InsuranceSectionCard
          title="No completed records yet"
          helper="Completed insurance records will appear here after staff close and record them."
        />
      )}
  </InsuranceStatusDetailPanel>
) : null}
```

- [ ] **Step 5: Run the focused tests**

Run:

```powershell
node --test `
  C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs `
  C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- PASS

- [ ] **Step 6: Export the mobile bundles**

Run:

```powershell
cd C:\Vscode\Main\codewave\mobile
npx expo export --platform ios --output-dir .expo-export-tmp-mode
npx expo export --platform android --output-dir .expo-export-tmp-mode-android
```

Expected:
- both exports complete successfully

- [ ] **Step 7: Restart Expo LAN mode and verify the local URL**

Run:

```powershell
$logDir = 'C:\Vscode\Main\codewave\mobile\.runtime'
$stdoutLog = Join-Path $logDir 'expo-insurance-mode.out.log'
$stderrLog = Join-Path $logDir 'expo-insurance-mode.err.log'
$pidFile = Join-Path $logDir 'expo-insurance-mode.pid'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Remove-Item -Force $stdoutLog, $stderrLog, $pidFile -ErrorAction SilentlyContinue

Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -match 'C:\\Vscode\\Main\\codewave\\mobile' -and
    ($_.CommandLine -match 'expo\\bin\\cli' -or $_.CommandLine -match 'npx-cli.js\" expo start')
  } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Start-Sleep -Seconds 2

$process = Start-Process -FilePath 'cmd.exe' `
  -ArgumentList '/c', 'set CI=1&& npx expo start --lan --clear --port 8081' `
  -WorkingDirectory 'C:\Vscode\Main\codewave\mobile' `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -WindowStyle Hidden `
  -PassThru

$process.Id | Set-Content $pidFile
Start-Sleep -Seconds 20

Get-Content -Raw $stdoutLog
Get-Content -Raw $stderrLog
```

Expected:
- stdout contains `Waiting on http://localhost:8081`
- stderr is empty or only contains non-fatal warnings

- [ ] **Step 8: Compute the `exp://` URL**

Run:

```powershell
$lanIp = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike '169.*' -and
    $_.IPAddress -ne '127.0.0.1' -and
    $_.InterfaceAlias -notmatch 'vEthernet'
  } |
  Select-Object -First 1 -ExpandProperty IPAddress

"exp://$lanIp:8081"
```

Expected:
- prints a usable Expo Go LAN URL like `exp://192.168.x.x:8081`

- [ ] **Step 9: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/InsuranceInquiryScreen.js `
  mobile/src/screens/insurance/InsuranceStatusDetailPanel.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs `
  mobile/src/screens/insuranceModuleView.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: finalize mobile insurance mode redesign"
```

## Self-Review

### Spec coverage

Covered requirements:
- lightweight app-level insurance entry
- dedicated insurance-only mode shell
- internal nav for overview, request, docs, status, and history
- overview-first landing inside insurance mode
- cleaner sectioned request page
- cleaner checklist-and-upload docs page
- unified status tracking with payment and renewal folded in
- separate read-only history page
- reduced stacked-card density and shorter copy
- Expo validation and `exp://` handoff

No obvious spec gaps remain.

### Placeholder scan

Checked for:
- `TODO`, `TBD`, and `FIXME`
- vague "handle later" language
- missing file paths
- missing commands
- steps without concrete code snippets

No placeholders remain.

### Type consistency

Consistent section keys used throughout the plan:
- `overview`
- `request`
- `documents`
- `status`
- `history`

Consistent helper names used throughout the plan:
- `buildCustomerInsuranceEntryState`
- `buildCustomerInsuranceOverviewState`
- `buildCustomerInsuranceStatusState`
- `INSURANCE_MODE_SECTION_KEYS`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-16-mobile-insurance-mode-redesign.md`. Two execution options:

1. `Subagent-Driven (recommended)` - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. `Inline Execution` - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
