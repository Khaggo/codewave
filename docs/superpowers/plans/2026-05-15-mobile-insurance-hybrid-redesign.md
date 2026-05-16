# Mobile Insurance Hybrid Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the customer mobile insurance experience into a cleaner hybrid flow with a home-first control center and focused follow-on panels for request, documents, payment, renewal, and history.

**Architecture:** Keep the existing backend-driven insurance state, remembered inquiry mapping, and vehicle-scoped behavior intact. Move most state-derivation logic into `insuranceModuleView.mjs`, then split the current monolithic `InsuranceInquiryScreen.js` into a small set of focused panel components that are switched by local in-screen navigation instead of one long stacked scroll.

**Tech Stack:** Expo 54, React Native 0.81, React 19, Node test runner, existing mobile theme tokens, existing customer insurance client helpers

---

## File Map

### Existing files to modify

- `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
  - main insurance screen container, local destination state, data loading, event handlers, and panel switching
- `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.mjs`
  - derived hero state, action cards, destination metadata, and focused-panel content helpers
- `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs`
  - helper-level tests for hero state, action cards, and focused detail surface behavior

### New files to create

- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceHomePanel.js`
  - home-first insurance control center with hero card and quick action cards
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceRequestPanel.js`
  - focused request intake surface with pinned vehicle context and concise form layout
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceDocumentsPanel.js`
  - checklist and upload workspace for required, optional, and uploaded documents
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceStatusDetailPanel.js`
  - shared status-detail surface used for payment, renewal, and history destinations
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsurancePanelPrimitives.js`
  - shared presentational building blocks such as section shell, hero badge, action row, and vehicle strip
- `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`
  - source-level regression test that verifies the hybrid panel architecture replaced the single giant scroll layout

### Optional follow-up only if needed

- `C:\Vscode\Main\codewave\mobile\src\theme\tokens.js`
  - only if one missing token blocks the redesigned panel styling; avoid broad theme churn

The screen file is already `83k+` and should not keep absorbing more layout branches. This plan deliberately moves UI surface area into focused panel files while keeping workflow logic centralized in the existing helper module.

---

### Task 1: Add Hybrid Home-State Helpers

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.mjs`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs`

- [ ] **Step 1: Write the failing helper tests for hero state and quick actions**

Add these imports near the top of `insuranceModuleView.test.mjs`:

```javascript
import {
  buildCustomerInsuranceActionCards,
  buildCustomerInsuranceHeroState,
} from './insuranceModuleView.mjs'
```

Append these tests:

```javascript
test('insurance hero falls back to start state when there is no active request', () => {
  assert.deepEqual(
    buildCustomerInsuranceHeroState({
      selectedVehicleLabel: '2024 Toyota Vios · DEMOREV001',
      latestInquiry: null,
      missingRequiredDocuments: [],
      claimStatusUpdateCount: 0,
    }),
    {
      eyebrow: 'Insurance',
      title: 'Start a new request',
      message: 'Use the selected vehicle to open a customer-safe insurance request.',
      ctaLabel: 'Begin intake',
      routeKey: 'request',
      statusLabel: 'Ready',
      tone: 'default',
    },
  )
})

test('insurance hero prioritizes document follow-up when files are still missing', () => {
  assert.deepEqual(
    buildCustomerInsuranceHeroState({
      selectedVehicleLabel: '2024 Toyota Vios · DEMOREV001',
      latestInquiry: {
        id: 'inq-7',
        status: 'needs_documents',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [
        { type: 'policy', label: 'Policy copy' },
        { type: 'valid_id', label: 'Valid ID' },
      ],
      claimStatusUpdateCount: 0,
    }),
    {
      eyebrow: 'Current request',
      title: 'Upload required documents',
      message: '2 required documents still need attention for this request.',
      ctaLabel: 'Open documents',
      routeKey: 'documents',
      statusLabel: '2 missing',
      tone: 'warning',
    },
  )
})

test('insurance action cards expose focused destinations for the hybrid home', () => {
  assert.deepEqual(
    buildCustomerInsuranceActionCards({
      latestInquiry: {
        id: 'inq-8',
        status: 'payment_pending',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'upcoming',
      },
      requirementsChecklist: {
        required: [
          { type: 'or_cr', complete: true },
          { type: 'policy', complete: false },
          { type: 'valid_id', complete: false },
        ],
        optional: [],
      },
      claimStatusUpdateCount: 3,
      paymentSummary: {
        title: 'Proof submitted',
        message: 'Proof of payment is on file and waiting for review.',
        tone: 'default',
      },
      renewalSummary: {
        title: 'Renewal reminder',
        message: 'Your renewal window is coming up.',
        tone: 'default',
      },
    }).map(({ key, title, routeKey, value }) => ({ key, title, routeKey, value })),
    [
      { key: 'documents', title: 'Documents', routeKey: 'documents', value: '1/3' },
      { key: 'payment', title: 'Payment', routeKey: 'payment', value: 'Proof Submitted' },
      { key: 'renewal', title: 'Renewal', routeKey: 'renewal', value: 'Upcoming' },
      { key: 'history', title: 'History', routeKey: 'history', value: '3' },
    ],
  )
})
```

- [ ] **Step 2: Run the helper tests to verify they fail**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs
```

Expected:
- FAIL because `buildCustomerInsuranceHeroState` and `buildCustomerInsuranceActionCards` do not exist yet

- [ ] **Step 3: Implement the helper functions in `insuranceModuleView.mjs`**

Add these exports near the existing home-focus helpers:

```javascript
export const INSURANCE_PANEL_KEYS = Object.freeze({
  home: 'home',
  request: 'request',
  documents: 'documents',
  payment: 'payment',
  renewal: 'renewal',
  history: 'history',
})

export const buildCustomerInsuranceHeroState = ({
  selectedVehicleLabel,
  latestInquiry = null,
  missingRequiredDocuments = [],
  claimStatusUpdateCount = 0,
} = {}) => {
  if (!latestInquiry?.id) {
    return {
      eyebrow: 'Insurance',
      title: 'Start a new request',
      message: selectedVehicleLabel
        ? 'Use the selected vehicle to open a customer-safe insurance request.'
        : 'Choose a vehicle before you start a customer-safe insurance request.',
      ctaLabel: 'Begin intake',
      routeKey: INSURANCE_PANEL_KEYS.request,
      statusLabel: selectedVehicleLabel ? 'Ready' : 'Vehicle needed',
      tone: selectedVehicleLabel ? 'default' : 'warning',
    }
  }

  if (missingRequiredDocuments.length > 0) {
    return {
      eyebrow: 'Current request',
      title: 'Upload required documents',
      message: `${missingRequiredDocuments.length} required document${missingRequiredDocuments.length === 1 ? '' : 's'} still need attention for this request.`,
      ctaLabel: 'Open documents',
      routeKey: INSURANCE_PANEL_KEYS.documents,
      statusLabel: `${missingRequiredDocuments.length} missing`,
      tone: 'warning',
    }
  }

  if (latestInquiry.status === 'payment_pending' || latestInquiry.paymentStatus === 'overdue') {
    return {
      eyebrow: 'Current request',
      title: latestInquiry.paymentStatus === 'overdue' ? 'Payment is overdue' : 'Review payment follow-up',
      message:
        latestInquiry.paymentStatus === 'overdue'
          ? 'Upload proof of payment or contact staff so the request can move forward.'
          : 'Payment proof has been submitted and is waiting for review.',
      ctaLabel: 'Open payment',
      routeKey: INSURANCE_PANEL_KEYS.payment,
      statusLabel: formatWorkflowLabel(latestInquiry.paymentStatus),
      tone: latestInquiry.paymentStatus === 'overdue' ? 'danger' : 'default',
    }
  }

  if (latestInquiry.status === 'for_renewal' || latestInquiry.renewalStatus === 'awaiting_customer') {
    return {
      eyebrow: 'Current request',
      title: 'Review renewal follow-up',
      message: 'Renewal follow-up is active for this vehicle.',
      ctaLabel: 'Open renewal',
      routeKey: INSURANCE_PANEL_KEYS.renewal,
      statusLabel: formatWorkflowLabel(latestInquiry.renewalStatus),
      tone: 'default',
    }
  }

  return {
    eyebrow: 'Current request',
    title: 'Review current request',
    message:
      claimStatusUpdateCount > 0
        ? 'Your latest request and vehicle history are both ready to review.'
        : 'Your latest request is ready to review.',
    ctaLabel: 'Check status',
    routeKey: INSURANCE_PANEL_KEYS.history,
    statusLabel: formatWorkflowLabel(latestInquiry.status),
    tone: 'success',
  }
}

export const buildCustomerInsuranceActionCards = ({
  latestInquiry = null,
  requirementsChecklist = { required: [], optional: [] },
  claimStatusUpdateCount = 0,
  paymentSummary = null,
  renewalSummary = null,
} = {}) => {
  const requiredItems = Array.isArray(requirementsChecklist.required)
    ? requirementsChecklist.required
    : []
  const completedRequiredCount = requiredItems.filter((item) => item.complete).length
  const totalRequiredCount = requiredItems.length

  return [
    {
      key: 'documents',
      title: 'Documents',
      routeKey: INSURANCE_PANEL_KEYS.documents,
      value: `${completedRequiredCount}/${totalRequiredCount || 0}`,
      description:
        totalRequiredCount > completedRequiredCount
          ? 'See what is still missing and upload when ready.'
          : 'Required files are complete. You can still add more later.',
    },
    {
      key: 'payment',
      title: 'Payment',
      routeKey: INSURANCE_PANEL_KEYS.payment,
      value: latestInquiry ? formatWorkflowLabel(latestInquiry.paymentStatus) : 'Not required',
      description: paymentSummary?.message ?? 'Payment follow-up will appear here when needed.',
    },
    {
      key: 'renewal',
      title: 'Renewal',
      routeKey: INSURANCE_PANEL_KEYS.renewal,
      value: latestInquiry ? formatWorkflowLabel(latestInquiry.renewalStatus) : 'Not applicable',
      description: renewalSummary?.message ?? 'Renewal follow-up will appear here when needed.',
    },
    {
      key: 'history',
      title: 'History',
      routeKey: INSURANCE_PANEL_KEYS.history,
      value: String(claimStatusUpdateCount),
      description:
        claimStatusUpdateCount > 0
          ? 'Past insurance records are ready to review.'
          : 'Past insurance records will appear here after staff close and record them.',
    },
  ]
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

git -C C:\Vscode\Main\codewave commit -m "feat: add hybrid insurance home helpers"
```

### Task 2: Add Screen-Structure Regression Coverage

**Files:**
- Create: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Write the failing source-regression test**

Create `insuranceScreenStructure.test.mjs` with:

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

test('insurance screen uses the hybrid panel architecture', () => {
  const source = read('mobile/src/screens/InsuranceInquiryScreen.js')

  const requiredFragments = [
    "import InsuranceHomePanel from './insurance/InsuranceHomePanel';",
    "import InsuranceRequestPanel from './insurance/InsuranceRequestPanel';",
    "import InsuranceDocumentsPanel from './insurance/InsuranceDocumentsPanel';",
    "import InsuranceStatusDetailPanel from './insurance/InsuranceStatusDetailPanel';",
    "const [activePanel, setActivePanel] = useState('home');",
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected insurance screen source to include: ${fragment}`)
  }
})

test('insurance screen no longer relies on one giant stacked home page', () => {
  const source = read('mobile/src/screens/InsuranceInquiryScreen.js')

  assert.ok(!source.includes('Create insurance inquiry'))
  assert.ok(!source.includes('Requirements checklist'))
  assert.ok(!source.includes('Insurance history'))
})
```

- [ ] **Step 2: Run the structure test to verify it fails**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because the current screen still contains the old long stacked layout and does not import the new panel files

- [ ] **Step 3: Create the new panel files with minimal exports**

Create `mobile/src/screens/insurance/InsurancePanelPrimitives.js`:

```javascript
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { colors, radius } from '../../theme'

export function InsurancePanelShell({ eyebrow, title, subtitle, children }) {
  return (
    <View style={styles.shell}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  )
}

export function InsuranceActionRow({ icon, label, value, description, onPress }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.actionHeader}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
        </View>
        {value ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  shell: { gap: 12 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.mutedText, fontSize: 14, lineHeight: 22 },
  actionRow: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18, gap: 10 },
  actionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryMuted },
  value: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  actionLabel: { color: colors.text, fontSize: 17, fontWeight: '800' },
  actionDescription: { color: colors.mutedText, fontSize: 14, lineHeight: 21 },
})
```

Create these files with default exports that currently return `null` so the screen can import them before wiring:

```javascript
// mobile/src/screens/insurance/InsuranceHomePanel.js
export default function InsuranceHomePanel() {
  return null
}

// mobile/src/screens/insurance/InsuranceRequestPanel.js
export default function InsuranceRequestPanel() {
  return null
}

// mobile/src/screens/insurance/InsuranceDocumentsPanel.js
export default function InsuranceDocumentsPanel() {
  return null
}

// mobile/src/screens/insurance/InsuranceStatusDetailPanel.js
export default function InsuranceStatusDetailPanel() {
  return null
}
```

- [ ] **Step 4: Run the structure test again and confirm it still fails only on the screen wiring**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because `InsuranceInquiryScreen.js` still has not been rewired yet

- [ ] **Step 5: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/insurance/InsurancePanelPrimitives.js `
  mobile/src/screens/insurance/InsuranceHomePanel.js `
  mobile/src/screens/insurance/InsuranceRequestPanel.js `
  mobile/src/screens/insurance/InsuranceDocumentsPanel.js `
  mobile/src/screens/insurance/InsuranceStatusDetailPanel.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "test: scaffold hybrid insurance screen structure"
```

### Task 3: Refactor the Insurance Home Into a Focused Control Center

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceHomePanel.js`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Wire the new imports and local panel state in `InsuranceInquiryScreen.js`**

Add these imports:

```javascript
import InsuranceHomePanel from './insurance/InsuranceHomePanel';
import InsuranceRequestPanel from './insurance/InsuranceRequestPanel';
import InsuranceDocumentsPanel from './insurance/InsuranceDocumentsPanel';
import InsuranceStatusDetailPanel from './insurance/InsuranceStatusDetailPanel';
```

Add this state near the other `useState` hooks:

```javascript
const [activePanel, setActivePanel] = useState('home');
```

Add these derived values near the existing `homeCards` logic:

```javascript
const heroState = useMemo(
  () =>
    buildCustomerInsuranceHeroState({
      selectedVehicleLabel: selectedVehicle
        ? buildOwnedVehicleInsuranceLabel(selectedVehicle)
        : '',
      latestInquiry,
      missingRequiredDocuments,
      claimStatusUpdateCount: claimStatusUpdates.length,
    }),
  [claimStatusUpdates.length, latestInquiry, missingRequiredDocuments, selectedVehicle],
)

const actionCards = useMemo(
  () =>
    buildCustomerInsuranceActionCards({
      latestInquiry,
      requirementsChecklist,
      claimStatusUpdateCount: claimStatusUpdates.length,
      paymentSummary,
      renewalSummary: buildRenewalPrompt(latestInquiry),
    }),
  [claimStatusUpdates.length, latestInquiry, paymentSummary, requirementsChecklist],
)
```

- [ ] **Step 2: Implement the home panel UI**

Replace `InsuranceHomePanel.js` with:

```javascript
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { InsuranceActionRow, InsurancePanelShell } from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

const iconByKey = {
  documents: 'file-document-edit-outline',
  payment: 'cash-check',
  renewal: 'calendar-clock-outline',
  history: 'history',
}

export default function InsuranceHomePanel({
  hero,
  actionCards,
  selectedVehicleLabel,
  onOpenPanel,
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <InsurancePanelShell
        eyebrow={hero.eyebrow}
        title="Insurance home"
        subtitle="Review the current request, then open the exact task you need."
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{hero.title}</Text>
          <Text style={styles.heroMessage}>{hero.message}</Text>
          {selectedVehicleLabel ? <Text style={styles.vehicleLabel}>{selectedVehicleLabel}</Text> : null}
          <TouchableOpacity style={styles.heroButton} onPress={() => onOpenPanel(hero.routeKey)} activeOpacity={0.9}>
            <Text style={styles.heroButtonText}>{hero.ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </InsurancePanelShell>

      <View style={styles.actionsGrid}>
        {actionCards.map((card) => (
          <InsuranceActionRow
            key={card.key}
            icon={iconByKey[card.key]}
            label={card.title}
            value={card.value}
            description={card.description}
            onPress={() => onOpenPanel(card.routeKey)}
          />
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingBottom: 32 },
  heroCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20, gap: 12 },
  heroTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  heroMessage: { color: colors.mutedText, fontSize: 15, lineHeight: 23 },
  vehicleLabel: { color: colors.labelText, fontSize: 13, fontWeight: '700' },
  heroButton: { marginTop: 4, borderRadius: radius.lg, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center' },
  heroButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '800' },
  actionsGrid: { gap: 14 },
})
```

- [ ] **Step 3: Render the home panel in `InsuranceInquiryScreen.js` instead of the old stacked home blocks**

Inside the main screen render tree, switch to:

```javascript
{activePanel === 'home' ? (
  <InsuranceHomePanel
    hero={heroState}
    actionCards={actionCards}
    selectedVehicleLabel={
      selectedVehicle ? buildOwnedVehicleInsuranceLabel(selectedVehicle) : null
    }
    onOpenPanel={setActivePanel}
  />
) : null}
```

Also add a simple reset when the selected vehicle changes:

```javascript
useEffect(() => {
  setActivePanel('home');
}, [selectedVehicleId]);
```

- [ ] **Step 4: Run the structure regression test**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- PASS for the import/state architecture check
- the second assertion may still fail until the old long-form blocks are fully removed in the next task

- [ ] **Step 5: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/InsuranceInquiryScreen.js `
  mobile/src/screens/insurance/InsuranceHomePanel.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: add hybrid insurance home panel"
```

### Task 4: Split Request, Documents, and Detail Destinations

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceRequestPanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceDocumentsPanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceStatusDetailPanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs`

- [ ] **Step 1: Expand the structure test to require focused destinations**

Append this test in `insuranceScreenStructure.test.mjs`:

```javascript
test('insurance screen renders focused request, documents, and detail destinations', () => {
  const source = read('mobile/src/screens/InsuranceInquiryScreen.js')

  const requiredFragments = [
    "activePanel === 'request'",
    "activePanel === 'documents'",
    "activePanel === 'payment'",
    "activePanel === 'renewal'",
    "activePanel === 'history'",
    '<InsuranceRequestPanel',
    '<InsuranceDocumentsPanel',
    '<InsuranceStatusDetailPanel',
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected destination fragment: ${fragment}`)
  }
})
```

- [ ] **Step 2: Run the structure test to verify failure**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because the request, documents, payment, renewal, and history panels are not wired yet

- [ ] **Step 3: Implement the focused request panel**

Replace `InsuranceRequestPanel.js` with:

```javascript
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { InsurancePanelShell } from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

export default function InsuranceRequestPanel({
  selectedVehicleLabel,
  draft,
  inquiryTypeOptions,
  onChangeDraft,
  onSubmit,
  isSubmitting,
  onBack,
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <InsurancePanelShell
        eyebrow="Request"
        title="Start a new request"
        subtitle="Share the key concern first, then submit the request."
      >
        <TouchableOpacity onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.backLink}>Back to home</Text>
        </TouchableOpacity>
      </InsurancePanelShell>

      <View style={styles.vehicleCard}>
        <Text style={styles.vehicleLabel}>Selected vehicle</Text>
        <Text style={styles.vehicleValue}>{selectedVehicleLabel || 'Choose a vehicle first'}</Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.segmentRow}>
          {inquiryTypeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.segmentButton, draft.inquiryType === option.value && styles.segmentButtonActive]}
              onPress={() => onChangeDraft({ inquiryType: option.value })}
              activeOpacity={0.88}
            >
              <Text style={[styles.segmentText, draft.inquiryType === option.value && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Accident repair inquiry"
          placeholderTextColor={colors.labelText}
          value={draft.subject}
          onChangeText={(value) => onChangeDraft({ subject: value })}
        />

        <TextInput
          style={[styles.input, styles.textarea]}
          multiline
          placeholder="Describe the concern, damage, or claim context."
          placeholderTextColor={colors.labelText}
          value={draft.description}
          onChangeText={(value) => onChangeDraft({ description: value })}
        />

        <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={isSubmitting} activeOpacity={0.88}>
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Submitting...' : 'Submit request'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingBottom: 32 },
  backLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  vehicleCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18, gap: 8 },
  vehicleLabel: { color: colors.labelText, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1 },
  vehicleValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
  formCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18, gap: 14 },
  segmentRow: { flexDirection: 'row', gap: 10 },
  segmentButton: { flex: 1, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, alignItems: 'center' },
  segmentButtonActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  segmentText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  segmentTextActive: { color: colors.primary },
  input: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBackground, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 15 },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  submitButton: { borderRadius: radius.lg, backgroundColor: colors.primary, paddingVertical: 15, alignItems: 'center' },
  submitButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '800' },
})
```

- [ ] **Step 4: Implement the focused documents and status panels**

Replace `InsuranceDocumentsPanel.js` with:

```javascript
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { InsurancePanelShell } from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

function ChecklistGroup({ title, items }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item.type} style={styles.itemRow}>
          <Text style={styles.itemLabel}>{item.label}</Text>
          <Text style={styles.itemValue}>{item.complete ? 'Uploaded' : 'Missing'}</Text>
        </View>
      ))}
    </View>
  )
}

export default function InsuranceDocumentsPanel({
  checklist,
  latestInquiry,
  onPickDocument,
  isUploadingDocument,
  onBack,
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <InsurancePanelShell
        eyebrow="Documents"
        title="Documents"
        subtitle="See what is required, what is optional, and what is already on file."
      >
        <TouchableOpacity onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.backLink}>Back to home</Text>
        </TouchableOpacity>
      </InsurancePanelShell>

      <View style={styles.card}>
        <ChecklistGroup title="Required" items={checklist.required} />
        <ChecklistGroup title="Optional" items={checklist.optional} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Uploaded files</Text>
        {(latestInquiry?.documents ?? []).length ? (
          latestInquiry.documents.map((document) => (
            <View key={document.id ?? `${document.documentType}-${document.fileName}`} style={styles.itemRow}>
              <Text style={styles.itemLabel}>{document.fileName || document.documentType}</Text>
              <Text style={styles.itemValue}>Uploaded</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No files uploaded yet.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.uploadButton} onPress={onPickDocument} disabled={isUploadingDocument} activeOpacity={0.88}>
        <Text style={styles.uploadButtonText}>{isUploadingDocument ? 'Uploading...' : 'Choose file'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
```

Replace `InsuranceStatusDetailPanel.js` with:

```javascript
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { InsurancePanelShell } from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

export default function InsuranceStatusDetailPanel({
  eyebrow,
  title,
  subtitle,
  statusLabel,
  summary,
  children,
  onBack,
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <InsurancePanelShell eyebrow={eyebrow} title={title} subtitle={subtitle}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.backLink}>Back to home</Text>
        </TouchableOpacity>
      </InsurancePanelShell>

      <View style={styles.summaryCard}>
        <Text style={styles.statusLabel}>{statusLabel}</Text>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>

      <View style={styles.detailCard}>{children}</View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingBottom: 32 },
  backLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  summaryCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18, gap: 8 },
  statusLabel: { color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1 },
  summaryText: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  detailCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18, gap: 12 },
})
```

- [ ] **Step 5: Wire all non-home destinations in `InsuranceInquiryScreen.js`**

Add panel rendering like:

```javascript
{activePanel === 'request' ? (
  <InsuranceRequestPanel
    selectedVehicleLabel={selectedVehicle ? buildOwnedVehicleInsuranceLabel(selectedVehicle) : null}
    draft={draft}
    inquiryTypeOptions={inquiryTypeOptions}
    onChangeDraft={(patch) => setDraft((current) => ({ ...current, ...patch }))}
    onSubmit={handleSubmitInquiry}
    isSubmitting={isSubmitting}
    onBack={() => setActivePanel('home')}
  />
) : null}

{activePanel === 'documents' ? (
  <InsuranceDocumentsPanel
    checklist={requirementsChecklist}
    latestInquiry={latestInquiry}
    onPickDocument={pickAndUploadDocument}
    isUploadingDocument={isUploadingDocument}
    onBack={() => setActivePanel('home')}
  />
) : null}

{activePanel === 'payment' ? (
  <InsuranceStatusDetailPanel
    eyebrow="Payment"
    title="Payment"
    subtitle="Review the current payment follow-up for this request."
    statusLabel={formatWorkflowLabel(latestInquiry?.paymentStatus ?? 'not_required')}
    summary={paymentSummary.message}
    onBack={() => setActivePanel('home')}
  >
    <Text style={styles.detailBodyText}>{paymentSummary.title}</Text>
  </InsuranceStatusDetailPanel>
) : null}
```

Mirror the same pattern for `renewal` and `history`.

Also remove the old stacked request form, checklist block, payment block, renewal block, and history block from the home layout so the source-regression test passes.

- [ ] **Step 6: Run the helper and structure tests**

Run:

```powershell
node --test `
  C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs `
  C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- PASS

- [ ] **Step 7: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/InsuranceInquiryScreen.js `
  mobile/src/screens/insurance/InsuranceRequestPanel.js `
  mobile/src/screens/insurance/InsuranceDocumentsPanel.js `
  mobile/src/screens/insurance/InsuranceStatusDetailPanel.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs `
  mobile/src/screens/insuranceModuleView.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: split mobile insurance into focused panels"
```

### Task 5: Final Verification and Expo Validation

**Files:**
- No new source files required

- [ ] **Step 1: Run the focused mobile insurance tests**

Run:

```powershell
node --test `
  C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs `
  C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- all targeted mobile insurance tests pass

- [ ] **Step 2: Verify the mobile bundles export cleanly**

Run:

```powershell
cd C:\Vscode\Main\codewave\mobile
npx expo export --platform ios --output-dir .expo-export-tmp
npx expo export --platform android --output-dir .expo-export-tmp-android
```

Expected:
- both exports complete successfully
- Metro reports bundled output for iOS and Android

- [ ] **Step 3: Restart Expo LAN mode cleanly**

Run:

```powershell
$logDir = 'C:\Vscode\Main\codewave\mobile\.runtime'
$stdoutLog = Join-Path $logDir 'expo-lan.out.log'
$stderrLog = Join-Path $logDir 'expo-lan.err.log'
$pidFile = Join-Path $logDir 'expo-lan.pid'
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
- stderr stays empty or only contains non-fatal warnings

- [ ] **Step 4: Compute the LAN `exp://` URL**

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

- [ ] **Step 5: Commit**

```powershell
git -C C:\Vscode\Main\codewave add -A
git -C C:\Vscode\Main\codewave commit -m "test: verify mobile insurance hybrid redesign"
```

## Self-Review

### Spec coverage

Covered requirements:
- hybrid home-first information architecture
- active-request-first hero behavior
- compact action destinations for request, documents, payment, renewal, and history
- focused request surface
- focused documents surface
- focused status detail surfaces
- modern dark premium visual hierarchy
- preserved vehicle-scoped and remembered-inquiry behavior
- final Expo validation with a clean `exp://` URL

No obvious spec gaps remain. The plan intentionally keeps the bottom tab shell untouched and avoids backend scope.

### Placeholder scan

Checked for:
- TODO/TBD placeholders
- “similar to above” shortcuts
- vague “add error handling” instructions
- missing file paths or commands

No placeholders remain.

### Type consistency

The new panel keys stay consistent across the plan:
- `home`
- `request`
- `documents`
- `payment`
- `renewal`
- `history`

The helper names also stay consistent:
- `buildCustomerInsuranceHeroState`
- `buildCustomerInsuranceActionCards`
- `INSURANCE_PANEL_KEYS`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-15-mobile-insurance-hybrid-redesign.md`. Two execution options:

1. `Subagent-Driven (recommended)` - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. `Inline Execution` - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
