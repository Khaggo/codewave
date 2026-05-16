# Mobile Insurance Minimal Shell Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current card-stacked mobile insurance flow with a direct-entry insurance shell that opens from the main app `Insurance` tab and uses a clean four-tab internal layout.

**Architecture:** Keep the existing backend-driven inquiry, upload, payment, renewal, and history logic, but replace the current insurance entry and workspace composition with one dedicated shell. The shell will own vehicle context, pull-to-refresh, and internal tab navigation, while each tab will own a focused, section-first layout with shorter copy and fewer bordered containers.

**Tech Stack:** Expo 54, React Native 0.81, React 19, Node test runner, existing mobile theme tokens, existing `insuranceClient` helpers, current mobile insurance screen and panel structure

---

## File Map

### Existing files to modify

- `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
  - top-level mobile insurance screen, shell wiring, selected vehicle state, refresh behavior, tab routing, status/history composition
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceEntryPanel.js`
  - current extra entry screen that should be removed or repurposed out of the render path
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceModeShell.js`
  - internal insurance shell frame, tab bar, shared header area
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceHomePanel.js`
  - current overview/home tab, to be rebuilt as a minimal overview screen
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceRequestPanel.js`
  - request tab layout, to be rebuilt with less card containment and shorter copy
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceDocumentsPanel.js`
  - documents tab layout, to be rebuilt as a cleaner workspace
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceStatusDetailPanel.js`
  - shared status/history surface, to be cleaned up to match the minimal shell direction
- `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsurancePanelPrimitives.js`
  - shared insurance UI primitives; may need lighter-weight section rows, dividers, pills, and header helpers
- `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`
  - source-level structure regression tests for the mobile insurance shell

### Existing files to verify

- `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs`
  - helper-level tests for insurance view-model behavior

### Notes on decomposition

- Keep request/upload/tracking logic in `InsuranceInquiryScreen.js`.
- Keep shell/header/tab content rendering in `mobile/src/screens/insurance/`.
- Do not introduce backend changes.
- This plan intentionally supersedes the current extra-entry insurance-mode pattern.

---

### Task 1: Replace The Extra Entry Flow With A Direct Insurance Shell

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceModeShell.js`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Add failing structure assertions for direct shell entry**

Append or update `insuranceScreenStructure.test.mjs` so it requires:

```javascript
test('insurance tab opens directly into the insurance shell without an extra entry gate', () => {
  const source = read('./InsuranceInquiryScreen.js')

  const requiredFragments = [
    '<InsuranceModeShell',
    "activeSection={activeInsuranceTab}",
    "onChangeSection={setActiveInsuranceTab}",
    "activeInsuranceTab === 'home'",
    "activeInsuranceTab === 'request'",
    "activeInsuranceTab === 'documents'",
    "activeInsuranceTab === 'status'",
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected direct-shell fragment: ${fragment}`)
  }

  assert.doesNotMatch(source, /<InsuranceEntryPanel/)
  assert.doesNotMatch(source, /Enter insurance mode/)
  assert.doesNotMatch(source, /Protection center/)
})
```

- [ ] **Step 2: Run the structure test to verify failure**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because the current screen still contains the extra insurance entry layer and old tab-state names

- [ ] **Step 3: Replace the old insurance-mode gate with direct shell state**

In `InsuranceInquiryScreen.js`, replace the current extra entry-state wiring with direct internal-tab state:

```javascript
const [activeInsuranceTab, setActiveInsuranceTab] = useState('home')

useEffect(() => {
  setActiveInsuranceTab('home')
}, [selectedVehicleId])
```

Remove the render branch shaped like:

```javascript
{!isInInsuranceMode ? (
  <InsuranceEntryPanel ... />
) : (
  <InsuranceModeShell ...>
```

and replace it with a single direct shell render:

```javascript
<InsuranceModeShell
  activeSection={activeInsuranceTab}
  onChangeSection={setActiveInsuranceTab}
  selectedVehicleLabel={selectedVehicleLabel}
  onOpenVehiclePicker={() => setIsVehiclePickerOpen(true)}
>
  {activeInsuranceTab === 'home' ? <InsuranceHomePanel ... /> : null}
  {activeInsuranceTab === 'request' ? <InsuranceRequestPanel ... /> : null}
  {activeInsuranceTab === 'documents' ? <InsuranceDocumentsPanel ... /> : null}
  {activeInsuranceTab === 'status' ? <InsuranceStatusDetailPanel ... /> : null}
</InsuranceModeShell>
```

- [ ] **Step 4: Rework `InsuranceModeShell.js` into a direct-entry shell**

Replace the extra-mode framing with a dedicated shell that looks like:

```javascript
const TAB_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'request', label: 'Request' },
  { key: 'documents', label: 'Documents' },
  { key: 'status', label: 'Status' },
]

export default function InsuranceModeShell({
  activeSection,
  onChangeSection,
  selectedVehicleLabel,
  onOpenVehiclePicker,
  children,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Insurance</Text>
        <TouchableOpacity style={styles.vehicleTrigger} onPress={onOpenVehiclePicker} activeOpacity={0.88}>
          <Text style={styles.vehicleTriggerText}>{selectedVehicleLabel || 'Select vehicle'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {TAB_ITEMS.map((item) => {
          const active = item.key === activeSection
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.tabButton, active && styles.tabButtonActive]}
              onPress={() => onChangeSection(item.key)}
              activeOpacity={0.88}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.body}>{children}</View>
    </View>
  )
}
```

- [ ] **Step 5: Run the structure test to verify it passes**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- PASS for the direct-entry shell assertions

- [ ] **Step 6: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/InsuranceInquiryScreen.js `
  mobile/src/screens/insurance/InsuranceModeShell.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: open mobile insurance directly in shell"
```

### Task 2: Move Vehicle Selection Into A Header Bottom Sheet

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsurancePanelPrimitives.js`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Add failing structure assertions for header-triggered vehicle selection**

Append this test:

```javascript
test('insurance shell uses a header-triggered vehicle picker instead of a body vehicle card', () => {
  const source = read('./InsuranceInquiryScreen.js')
  const shellSource = read('./insurance/InsuranceModeShell.js')

  assert.match(shellSource, /onOpenVehiclePicker/)
  assert.match(shellSource, /selectedVehicleLabel/)
  assert.match(source, /const \[isVehiclePickerOpen, setIsVehiclePickerOpen\] = useState\(false\)/)
  assert.match(source, /<Modal[\s\S]*?visible=\{isVehiclePickerOpen\}/)
  assert.doesNotMatch(source, /Choose vehicle context/)
  assert.doesNotMatch(source, /Select vehicle/)
})
```

- [ ] **Step 2: Run the structure test to verify failure**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because the vehicle selector still lives in the body

- [ ] **Step 3: Add bottom-sheet vehicle picker state and modal**

In `InsuranceInquiryScreen.js`, add:

```javascript
const [isVehiclePickerOpen, setIsVehiclePickerOpen] = useState(false)
```

and render a simple modal sheet:

```javascript
<Modal
  animationType="slide"
  transparent
  visible={isVehiclePickerOpen}
  onRequestClose={() => setIsVehiclePickerOpen(false)}
>
  <Pressable style={styles.sheetBackdrop} onPress={() => setIsVehiclePickerOpen(false)}>
    <Pressable style={styles.sheetCard}>
      <Text style={styles.sheetTitle}>Choose vehicle</Text>
      {ownedVehicles.map((vehicle) => {
        const vehicleLabel = buildOwnedVehicleInsuranceLabel(vehicle)
        const selected = vehicle.id === selectedVehicleId

        return (
          <TouchableOpacity
            key={vehicle.id}
            style={[styles.sheetRow, selected && styles.sheetRowSelected]}
            onPress={() => {
              handleSelectVehicle(vehicle.id)
              setIsVehiclePickerOpen(false)
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.sheetRowLabel}>{vehicleLabel}</Text>
            {selected ? <Text style={styles.sheetRowMeta}>Current</Text> : null}
          </TouchableOpacity>
        )
      })}
    </Pressable>
  </Pressable>
</Modal>
```

- [ ] **Step 4: Add light-weight sheet primitives/styles**

Append shared shell-friendly styles or helpers in `InsurancePanelPrimitives.js` only if reused. If not reused, keep the sheet local to `InsuranceInquiryScreen.js`. Use compact visual treatment like:

```javascript
sheetCard: {
  borderTopLeftRadius: radius.xl,
  borderTopRightRadius: radius.xl,
  backgroundColor: colors.surface,
  padding: 20,
  gap: 10,
},
sheetRow: {
  minHeight: 52,
  borderBottomWidth: 1,
  borderBottomColor: colors.borderSoft,
  justifyContent: 'center',
  paddingVertical: 10,
},
sheetRowSelected: {
  backgroundColor: colors.primarySoft,
}
```

- [ ] **Step 5: Remove the old body vehicle block**

Delete the body section that renders the large vehicle chooser card. The active vehicle should now appear only in the header trigger and the current tab content where needed.

- [ ] **Step 6: Run the structure test to verify it passes**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- PASS for the header-triggered vehicle picker assertions

- [ ] **Step 7: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/InsuranceInquiryScreen.js `
  mobile/src/screens/insurance/InsurancePanelPrimitives.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: move mobile insurance vehicle picker into header"
```

### Task 3: Remove Floating Reload And Convert Refresh To Pull-To-Refresh

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Add failing structure assertions for pull-to-refresh**

Append this test:

```javascript
test('insurance shell uses pull-to-refresh and removes the floating reload affordance', () => {
  const source = read('./InsuranceInquiryScreen.js')

  assert.match(source, /RefreshControl/)
  assert.match(source, /onRefresh=\{refreshTracking\}/)
  assert.match(source, /refreshing=\{isRefreshing\}/)
  assert.doesNotMatch(source, /floating/i)
  assert.doesNotMatch(source, /reload button/i)
  assert.doesNotMatch(source, /onPress=\{refreshTracking\}[\s\S]*?outside/i)
})
```

- [ ] **Step 2: Run the structure test to verify failure**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because the current screen still uses explicit reload UI

- [ ] **Step 3: Add `RefreshControl` to the scroll container**

Update imports and shell scroll wiring in `InsuranceInquiryScreen.js`:

```javascript
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
```

Attach refresh control:

```javascript
<ScrollView
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={false}
  refreshControl={
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={refreshTracking}
      tintColor={colors.primary}
    />
  }
>
```

- [ ] **Step 4: Delete the floating reload control**

Remove the stray reload/floating affordance from the insurance body and any supporting styles such as:

```javascript
floatingRefreshButton
floatingRefreshIcon
reloadButton
```

Only keep inline retry UI inside explicit error states if already present.

- [ ] **Step 5: Run the structure test to verify it passes**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- PASS for the refresh assertions

- [ ] **Step 6: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/InsuranceInquiryScreen.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: switch mobile insurance to pull-to-refresh"
```

### Task 4: Rebuild Home And Status Around Section-First Layout

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceHomePanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceStatusDetailPanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsurancePanelPrimitives.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\InsuranceInquiryScreen.js`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Add failing structure assertions for the minimal section-first layout**

Append this test:

```javascript
test('home and status tabs use section-first layout with short copy and no extra top-level cards', () => {
  const homeSource = read('./insurance/InsuranceHomePanel.js')
  const statusSource = read('./insurance/InsuranceStatusDetailPanel.js')

  assert.match(homeSource, /title="Overview"/)
  assert.match(homeSource, /current vehicle/i)
  assert.match(homeSource, /next step/i)
  assert.match(homeSource, /Request/)
  assert.match(homeSource, /Documents/)
  assert.match(homeSource, /Status/)
  assert.doesNotMatch(homeSource, /Protection center/)
  assert.doesNotMatch(homeSource, /Open the dedicated insurance workspace/)

  assert.match(statusSource, /title="Latest update"/)
  assert.match(statusSource, /timeline/i)
  assert.match(statusSource, /history/i)
})
```

- [ ] **Step 2: Run the structure test to verify failure**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because the current home/status presentation still carries too much legacy structure

- [ ] **Step 3: Rebuild `InsuranceHomePanel.js` as a lightweight overview tab**

Replace the current overview with a section-first layout like:

```javascript
export default function InsuranceHomePanel({
  selectedVehicleLabel,
  overviewState,
  statusState,
  onOpenSection,
}) {
  return (
    <View style={styles.root}>
      <InsuranceSectionDivider title="Current vehicle">
        <Text style={styles.primaryValue}>{selectedVehicleLabel || 'No vehicle selected'}</Text>
      </InsuranceSectionDivider>

      <InsuranceSectionDivider title="Next step">
        <Text style={styles.summaryText}>{overviewState.title}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => onOpenSection(overviewState.routeKey)} activeOpacity={0.88}>
          <Text style={styles.primaryButtonText}>{overviewState.ctaLabel}</Text>
        </TouchableOpacity>
      </InsuranceSectionDivider>

      <InsuranceSectionDivider title="Current status">
        <Text style={styles.summaryText}>{statusState.summary}</Text>
      </InsuranceSectionDivider>

      <View style={styles.linkList}>
        {[
          { key: 'request', label: 'Request' },
          { key: 'documents', label: 'Documents' },
          { key: 'status', label: 'Status' },
        ].map((item) => (
          <TouchableOpacity key={item.key} style={styles.linkRow} onPress={() => onOpenSection(item.key)} activeOpacity={0.88}>
            <Text style={styles.linkLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
```

- [ ] **Step 4: Rebuild `InsuranceStatusDetailPanel.js` as a minimal shared status/history surface**

Keep the shared timeline/history logic, but simplify the layout to fewer bordered blocks:

```javascript
<ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
  <InsuranceSectionDivider title="Current status">
    <Text style={styles.statusTitle}>{statusState.title}</Text>
    <Text style={styles.statusSummary}>{statusState.summary}</Text>
  </InsuranceSectionDivider>

  {statusState.timeline.length ? (
    <InsuranceSectionDivider title="Timeline">
      {statusState.timeline.map((item) => (
        <View key={item.key} style={styles.timelineRow}>
          <View style={[styles.timelineDot, item.active && styles.timelineDotActive]} />
          <Text style={styles.timelineLabel}>{item.label}</Text>
        </View>
      ))}
    </InsuranceSectionDivider>
  ) : null}

  <InsuranceSectionDivider title="Latest update">
    <Text style={styles.statusSummary}>{statusState.latestUpdateLabel}</Text>
  </InsuranceSectionDivider>

  {children}
</ScrollView>
```

- [ ] **Step 5: Update shell wiring for shorter copy**

In `InsuranceInquiryScreen.js`, shorten screen labels and remove old marketing copy:

```javascript
const homeTitle = 'Overview'
const statusSubtitle = 'Current status and next step'
```

Pass the overview tab enough data:

```javascript
<InsuranceHomePanel
  selectedVehicleLabel={selectedVehicleLabel}
  overviewState={overviewState}
  statusState={statusState}
  onOpenSection={setActiveInsuranceTab}
/>
```

- [ ] **Step 6: Run the structure test to verify it passes**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- PASS for the home/status structure assertions

- [ ] **Step 7: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/InsuranceInquiryScreen.js `
  mobile/src/screens/insurance/InsuranceHomePanel.js `
  mobile/src/screens/insurance/InsuranceStatusDetailPanel.js `
  mobile/src/screens/insurance/InsurancePanelPrimitives.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: rebuild mobile insurance home and status tabs"
```

### Task 5: Strip Down Request And Documents Layouts To Minimal Sections

**Files:**
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceRequestPanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsuranceDocumentsPanel.js`
- Modify: `C:\Vscode\Main\codewave\mobile\src\screens\insurance\InsurancePanelPrimitives.js`
- Test: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`

- [ ] **Step 1: Add failing structure assertions for low-card request/documents tabs**

Append this test:

```javascript
test('request and documents tabs use section dividers instead of stacked wrapper cards', () => {
  const requestSource = read('./insurance/InsuranceRequestPanel.js')
  const documentsSource = read('./insurance/InsuranceDocumentsPanel.js')

  assert.match(requestSource, /Inquiry type/)
  assert.match(requestSource, /Claim details/)
  assert.match(requestSource, /Insurance details/)
  assert.doesNotMatch(requestSource, /Protection center/)

  assert.match(documentsSource, /Checklist/)
  assert.match(documentsSource, /Already on file/)
  assert.match(documentsSource, /Upload target/)
  assert.match(documentsSource, /Upload file/)
})
```

- [ ] **Step 2: Run the structure test to verify failure**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- FAIL because request/documents still retain too much container-heavy structure

- [ ] **Step 3: Simplify `InsuranceRequestPanel.js`**

Keep the same fields, but reduce layout chrome:

```javascript
<ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
  <InsuranceSectionDivider title="Inquiry type">
    <View style={styles.segmentRow}>...</View>
  </InsuranceSectionDivider>

  <InsuranceSectionDivider title="Claim details">
    <TextInput ... />
    <TextInput ... />
    <TextInput ... />
  </InsuranceSectionDivider>

  <InsuranceSectionDivider title="Insurance details">
    <TextInput ... />
    <TextInput ... />
  </InsuranceSectionDivider>
</ScrollView>

<View style={styles.footer}>
  <TouchableOpacity style={styles.submitButton} onPress={onSubmit} activeOpacity={0.88}>
    <Text style={styles.submitButtonText}>Submit request</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 4: Simplify `InsuranceDocumentsPanel.js`**

Keep current logic, but use section-first layout:

```javascript
<ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
  <InsuranceSectionDivider title="Checklist">...</InsuranceSectionDivider>
  <InsuranceSectionDivider title="Already on file">...</InsuranceSectionDivider>
  <InsuranceSectionDivider title="Upload target">...</InsuranceSectionDivider>
  <InsuranceSectionDivider title="Selected file">...</InsuranceSectionDivider>
  <InsuranceSectionDivider title="Note">...</InsuranceSectionDivider>
</ScrollView>

<View style={styles.footer}>
  <TouchableOpacity style={styles.uploadButton} onPress={onUploadDocument} activeOpacity={0.88}>
    <Text style={styles.uploadButtonText}>Upload file</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 5: Add lighter shared primitives if needed**

If the current `InsuranceSectionCard` remains too heavy, add a lighter divider-based primitive in `InsurancePanelPrimitives.js`:

```javascript
export function InsuranceSectionDivider({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}
```

with styles:

```javascript
section: {
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: colors.borderSoft,
  gap: 10,
},
sectionTitle: {
  color: colors.labelText,
  fontSize: 12,
  fontWeight: '800',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
},
```

- [ ] **Step 6: Run the structure test to verify it passes**

Run:

```powershell
node --test C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- PASS for the request/documents layout assertions

- [ ] **Step 7: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/insurance/InsuranceRequestPanel.js `
  mobile/src/screens/insurance/InsuranceDocumentsPanel.js `
  mobile/src/screens/insurance/InsurancePanelPrimitives.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: simplify mobile insurance request and documents tabs"
```

### Task 6: Final Verification And Expo Handoff

**Files:**
- Verify: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs`
- Verify: `C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs`
- Verify runtime output under: `C:\Vscode\Main\codewave\mobile\.runtime\`

- [ ] **Step 1: Run the focused mobile tests**

Run:

```powershell
node --test `
  C:\Vscode\Main\codewave\mobile\src\screens\insuranceModuleView.test.mjs `
  C:\Vscode\Main\codewave\mobile\src\screens\insuranceScreenStructure.test.mjs
```

Expected:
- PASS with `0 fail`

- [ ] **Step 2: Export the iOS bundle into the exact verification target**

Run:

```powershell
cmd /c "cd /d C:\Vscode\Main\codewave\mobile && npx expo export --platform ios --output-dir .expo-export-tmp-mode"
```

Expected:
- output ends with `Exported: .expo-export-tmp-mode`

- [ ] **Step 3: Export the Android bundle into the exact verification target**

Run:

```powershell
cmd /c "cd /d C:\Vscode\Main\codewave\mobile && npx expo export --platform android --output-dir .expo-export-tmp-mode-android"
```

Expected:
- output ends with `Exported: .expo-export-tmp-mode-android`

- [ ] **Step 4: Restart Expo LAN mode**

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
- stderr is empty or only non-fatal warnings

- [ ] **Step 5: Compute the Expo Go URL**

Run:

```powershell
$lanIp = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike '169.*' -and
    $_.IPAddress -ne '127.0.0.1' -and
    $_.InterfaceAlias -notmatch 'vEthernet'
  } |
  Select-Object -First 1 -ExpandProperty IPAddress

"exp://${lanIp}:8081"
```

Expected:
- prints a usable Expo Go URL such as `exp://192.168.x.x:8081`

- [ ] **Step 6: Commit**

```powershell
git -C C:\Vscode\Main\codewave add `
  mobile/src/screens/InsuranceInquiryScreen.js `
  mobile/src/screens/insurance/InsuranceModeShell.js `
  mobile/src/screens/insurance/InsuranceHomePanel.js `
  mobile/src/screens/insurance/InsuranceRequestPanel.js `
  mobile/src/screens/insurance/InsuranceDocumentsPanel.js `
  mobile/src/screens/insurance/InsuranceStatusDetailPanel.js `
  mobile/src/screens/insurance/InsurancePanelPrimitives.js `
  mobile/src/screens/insuranceScreenStructure.test.mjs

git -C C:\Vscode\Main\codewave commit -m "feat: redesign mobile insurance into minimal shell"
```

## Self-Review

### Spec coverage

Covered requirements:

- direct entry into insurance-only shell from the main app `Insurance` tab
- no extra `Enter insurance mode` screen
- four internal tabs: `Home / Request / Documents / Status`
- `History` folded into `Status`
- header-triggered bottom-sheet vehicle picker
- pull-to-refresh
- floating reload control removed
- shorter copy
- section-first layout
- reduced card stacking
- fixed footer ownership limited to request/documents
- Expo verification and `exp://` handoff

No obvious spec gaps remain.

### Placeholder scan

Checked for:

- `TODO`, `TBD`, or vague “implement later” wording
- steps without commands
- code-change steps without code blocks
- references to undefined functions in later tasks

No placeholders remain.

### Type consistency

Consistent names used throughout:

- `activeInsuranceTab`
- `isVehiclePickerOpen`
- `InsuranceModeShell`
- `InsuranceSectionDivider`
- `sortedHistoryRecords`

The plan intentionally avoids reusing the older `isInInsuranceMode` / `activeModeSection` naming so the execution target is clear.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-16-mobile-insurance-minimal-shell-redesign.md`. Two execution options:

1. `Subagent-Driven (recommended)` - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. `Inline Execution` - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
