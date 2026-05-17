import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_DIR = dirname(fileURLToPath(import.meta.url))

const read = (relativePath) => readFileSync(resolve(TEST_DIR, relativePath), 'utf8')

test('insurance tab opens directly into the insurance shell without an extra entry gate', () => {
  const source = read('./InsuranceInquiryScreen.js')

  const requiredFragments = [
    '<InsuranceModeShell',
    'activeSection={activeInsuranceTab}',
    'onChangeSection={handleChangeInsuranceTab}',
    "activeInsuranceTab === 'home'",
    "activeInsuranceTab === 'request'",
    "activeInsuranceTab === 'documents'",
    "activeInsuranceTab === 'status'",
    "const handleChangeInsuranceTab = (section) => {",
    "if (section === 'documents') {",
    'handleOpenPanel(section)',
    '<Text style={styles.statusSectionEyebrow}>History</Text>',
    '<Text style={styles.statusSectionTitle}>Recorded vehicle updates</Text>',
    '{historyStatusState.summary}',
    'sortedHistoryRecords.map((record) => (',
    '{historyStatusSection}',
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected direct-shell fragment: ${fragment}`)
  }

  assert.doesNotMatch(source, /<InsuranceEntryPanel/)
  assert.doesNotMatch(source, /Enter insurance mode/)
  assert.doesNotMatch(source, /Protection center/)
  assert.doesNotMatch(source, /heroCard/)
  assert.doesNotMatch(source, /heroSubtitle/)
  assert.doesNotMatch(source, /routePill/)
  assert.doesNotMatch(source, /Insurance workspace/)
  assert.doesNotMatch(source, /onChangeSection=\{setActiveInsuranceTab\}/)
  assert.doesNotMatch(source, /statusTabFocus/)
  assert.doesNotMatch(source, /section === 'history'/)
  assert.doesNotMatch(source, /statusInlineSectionFocused/)
  assert.equal((source.match(/<InsuranceStatusDetailPanel/g) ?? []).length, 1)
})

test('insurance shell exposes direct-entry tabs and vehicle picker trigger', () => {
  const source = read('./insurance/InsuranceModeShell.js')

  const requiredFragments = [
    "const TAB_ITEMS = [",
    "{ key: 'home', label: 'Home' }",
    "{ key: 'request', label: 'Request' }",
    "{ key: 'documents', label: 'Documents' }",
    "{ key: 'status', label: 'Status' }",
    '<Text style={styles.title}>Insurance</Text>',
    "selectedVehicleLabel || 'Select vehicle'",
    'isVehiclePickerAvailable',
    'onPress={onOpenVehiclePicker}',
    'disabled={!isVehiclePickerAvailable}',
    'onPress={() => onChangeSection(item.key)}',
    '<View style={styles.body}>{children}</View>',
    'summaryChips.map((item) => (',
    'item.emphasis && styles.summaryChipEmphasis',
    "item.icon ? item.icon : 'alert-circle-outline'",
    'styles.summaryChipValueMono',
    'styles.tabRowInner',
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected shell fragment: ${fragment}`)
  }

  assert.doesNotMatch(source, /Back to insurance/)
  assert.doesNotMatch(source, /Insurance mode/)
  assert.doesNotMatch(source, /History/)
  assert.match(source, /container:\s*\{[\s\S]*?flex:\s*1/)
  assert.match(source, /body:\s*\{[\s\S]*?flex:\s*1/)
  assert.match(
    source,
    /style=\{\[\s*styles\.vehicleTrigger,\s*!isVehiclePickerAvailable && styles\.vehicleTriggerDisabled,\s*\]\}/,
  )
  assert.match(
    source,
    /style=\{\[\s*styles\.vehicleTriggerText,\s*!isVehiclePickerAvailable && styles\.vehicleTriggerTextDisabled,\s*\]\}/,
  )
})

test('insurance shell uses a header-triggered vehicle picker instead of a body vehicle card', () => {
  const source = read('./InsuranceInquiryScreen.js')
  const shellSource = read('./insurance/InsuranceModeShell.js')

  assert.match(shellSource, /onOpenVehiclePicker/)
  assert.match(shellSource, /selectedVehicleLabel/)
  assert.match(source, /const \[isVehiclePickerOpen, setIsVehiclePickerOpen\] = useState\(false\)/)
  assert.match(source, /const handleOpenVehiclePicker = \(\) => \{/)
  assert.match(source, /if \(!hasSession \|\| !ownedVehicles\.length\) \{/)
  assert.match(source, /setIsVehiclePickerOpen\(false\)/)
  assert.match(source, /setIsVehiclePickerOpen\(true\)/)
  assert.match(source, /<Modal[\s\S]*?visible=\{isVehiclePickerOpen\}/)
  assert.match(source, /const isVehiclePickerAvailable = hasSession && ownedVehicles\.length > 0/)
  assert.match(source, /isVehiclePickerAvailable=\{isVehiclePickerAvailable\}/)
  assert.match(source, /<ScrollView[\s\S]*?style=\{styles\.sheetList\}/)
  assert.match(source, /sheetList:\s*\{[\s\S]*?maxHeight:\s*\d+/)
  assert.doesNotMatch(source, /Choose vehicle context/)
  assert.doesNotMatch(source, /Select vehicle/)
})

test('insurance shell uses pull-to-refresh and removes the floating reload affordance', () => {
  const source = read('./InsuranceInquiryScreen.js')
  const requestPanelSource = read('./insurance/InsuranceRequestPanel.js')
  const documentsPanelSource = read('./insurance/InsuranceDocumentsPanel.js')
  const statusPanelSource = read('./insurance/InsuranceStatusDetailPanel.js')

  assert.match(source, /RefreshControl/)
  assert.match(source, /onRefresh=\{refreshTracking\}/)
  assert.match(source, /refreshing=\{isRefreshing\}/)
  assert.match(source, /<InsuranceRequestPanel[\s\S]*?isRefreshing=\{isRefreshing\}[\s\S]*?onRefresh=\{refreshTracking\}/)
  assert.match(source, /<InsuranceDocumentsPanel[\s\S]*?isRefreshing=\{isRefreshing\}[\s\S]*?onRefresh=\{refreshTracking\}/)
  assert.match(source, /<InsuranceStatusDetailPanel[\s\S]*?isRefreshing=\{isRefreshing\}[\s\S]*?onRefresh=\{refreshTracking\}/)
  assert.match(requestPanelSource, /RefreshControl/)
  assert.match(requestPanelSource, /refreshing=\{isRefreshing\}/)
  assert.match(requestPanelSource, /onRefresh=\{onRefresh\}/)
  assert.match(documentsPanelSource, /RefreshControl/)
  assert.match(documentsPanelSource, /refreshing=\{isRefreshing\}/)
  assert.match(documentsPanelSource, /onRefresh=\{onRefresh\}/)
  assert.match(statusPanelSource, /RefreshControl/)
  assert.match(statusPanelSource, /refreshing=\{isRefreshing\}/)
  assert.match(statusPanelSource, /onRefresh=\{onRefresh\}/)
  assert.doesNotMatch(source, /floating/i)
  assert.doesNotMatch(source, /reload button/i)
  assert.doesNotMatch(source, /onPress=\{refreshTracking\}[\s\S]*?outside/i)
  assert.doesNotMatch(
    source,
    /<TouchableOpacity[\s\S]*?style=\{styles\.secondaryButton\}[\s\S]*?onPress=\{\(\) => refreshTracking\(\)\}[\s\S]*?<Text[\s\S]*?>Refresh<\/Text>[\s\S]*?<\/TouchableOpacity>/,
  )
})

test('home and status tabs use the premium dark redesign structure', () => {
  const screenSource = read('./InsuranceInquiryScreen.js')
  const homeSource = read('./insurance/InsuranceHomePanel.js')
  const statusSource = read('./insurance/InsuranceStatusDetailPanel.js')

  assert.match(homeSource, /overviewState\.routeRows/)
  assert.match(homeSource, /quickNavItems/)
  assert.match(homeSource, /Quick access/)
  assert.match(homeSource, /item\.description/)
  assert.match(homeSource, /item\.icon/)
  assert.match(homeSource, /chevron-right/)
  assert.match(homeSource, /current vehicle/i)
  assert.match(homeSource, /next step/i)
  assert.match(homeSource, /Current status/)
  assert.match(homeSource, /onOpenSection\(item\.key\)/)
  assert.doesNotMatch(homeSource, /Protection center/)
  assert.doesNotMatch(homeSource, /Open the dedicated insurance workspace/)

  assert.match(statusSource, /title = 'Status'/)
  assert.match(statusSource, /subtitle = 'Track review, approval, and next action'/)
  assert.match(statusSource, /Current status/)
  assert.match(statusSource, /Timeline/)
  assert.match(statusSource, /Process/)
  assert.match(statusSource, /Latest update/)
  assert.match(statusSource, /StepDot/)
  assert.match(statusSource, /Animated\.loop/)
  assert.match(screenSource, /History/)
  assert.match(screenSource, /Recorded vehicle updates/)
  assert.doesNotMatch(statusSource, /footerLabel/)
  assert.doesNotMatch(statusSource, /footerScrollTarget/)
  assert.doesNotMatch(statusSource, /onFooterPress/)
  assert.doesNotMatch(statusSource, /showsFooter/)
  assert.doesNotMatch(statusSource, /Boolean\(children\)/)
  assert.doesNotMatch(statusSource, /contentWithFooter/)
  assert.doesNotMatch(statusSource, /contentWithHistory/)
  assert.doesNotMatch(screenSource, /footerLabel=\{statusState\.ctaLabel\}/)
  assert.doesNotMatch(screenSource, /footerScrollTarget=/)
  assert.doesNotMatch(screenSource, /onFooterPress=/)
})

test('request and documents tabs use the redesigned premium layouts', () => {
  const requestSource = read('./insurance/InsuranceRequestPanel.js')
  const documentsSource = read('./insurance/InsuranceDocumentsPanel.js')

  assert.match(requestSource, /title="Request"/)
  assert.match(requestSource, /Request purpose/)
  assert.match(requestSource, /Inquiry type/)
  assert.match(requestSource, /Claim request/)
  assert.match(requestSource, /Estimate and approval/)
  assert.match(requestSource, /Request details/)
  assert.match(requestSource, /Insurance details/)
  assert.match(requestSource, /What happened\?/)
  assert.match(requestSource, /Additional details/)
  assert.match(requestSource, /Required now/)
  assert.match(requestSource, /Helpful next/)
  assert.match(requestSource, /Selected vehicle/)
  assert.match(requestSource, /Submit request/)
  assert.match(requestSource, /stickyFooter/)
  assert.doesNotMatch(requestSource, /Subject/)
  assert.doesNotMatch(requestSource, /InsuranceSummaryStrip/)
  assert.doesNotMatch(requestSource, /Start a customer-safe insurance request/)
  assert.doesNotMatch(requestSource, /Step 1 of 5/)
  assert.doesNotMatch(requestSource, /This request stays tied to the active vehicle in insurance mode\./)

  assert.match(documentsSource, /title="Documents"/)
  assert.match(documentsSource, /eyebrow="Documents"/)
  assert.match(documentsSource, /Checklist/)
  assert.match(documentsSource, /Upload notes/)
  assert.match(documentsSource, /Already on file/)
  assert.match(documentsSource, /Upload target/)
  assert.match(documentsSource, /Selected file/)
  assert.match(documentsSource, /Pending staged uploads/)
  assert.match(documentsSource, /No file selected\./)
  assert.match(documentsSource, /horizontal/)
  assert.match(documentsSource, /ChecklistItemRow/)
  assert.match(documentsSource, /useState/)
  assert.match(documentsSource, /toggleChecklistItem/)
  assert.match(documentsSource, /Upload file/)
  assert.match(documentsSource, /Note/)
  assert.doesNotMatch(documentsSource, /InsuranceSummaryStrip/)
  assert.doesNotMatch(documentsSource, /Manage supporting files/)
  assert.doesNotMatch(documentsSource, /Work through the checklist, attach the next file, and keep the current request tidy\./)
})

test('request and documents tabs reflect the real insurance workflow from intake notes', () => {
  const requestSource = read('./insurance/InsuranceRequestPanel.js')
  const documentsSource = read('./insurance/InsuranceDocumentsPanel.js')
  const screenSource = read('./InsuranceInquiryScreen.js')
  const viewModelSource = read('./insuranceModuleView.mjs')

  assert.match(requestSource, /Request purpose/)
  assert.match(requestSource, /Estimate and approval/)
  assert.match(screenSource, /value: 'new_application', label: 'New'/)
  assert.match(screenSource, /value: 'renewal', label: 'Renewal'/)
  assert.match(screenSource, /value: 'claim', label: 'Claim'/)
  assert.match(screenSource, /value: 'quotation', label: 'Quotation'/)
  assert.match(documentsSource, /Required now/)
  assert.match(documentsSource, /Helpful next/)
  assert.match(viewModelSource, /Readable digital copies accepted/)
  assert.match(viewModelSource, /Core documents are required before submit/)
  assert.match(viewModelSource, /Police report only when requested/)
  assert.match(screenSource, /purposeOptions/)
})

test('dashboard insurance tab uses one launcher CTA and no legacy duplicate insurance home blocks', () => {
  const dashboardSource = read('./Dashboard.js')

  assert.doesNotMatch(dashboardSource, /Insurance inquiry center/)
  assert.doesNotMatch(dashboardSource, /Choose Vehicle Context/)
  assert.doesNotMatch(dashboardSource, /Review reminders/)
  assert.doesNotMatch(dashboardSource, /bookingEyebrow}>INSURANCE/)
  assert.equal((dashboardSource.match(/Open Insurance Home/g) ?? []).length, 1)
  assert.match(dashboardSource, /if \(tabKey === 'insurance'\) \{/)
  assert.match(dashboardSource, /void navigateToInsuranceInquiry\(\)/)
})

test('insurance screen and action footers respect safe-area top and bottom insets', () => {
  const screenSource = read('./InsuranceInquiryScreen.js')
  const requestSource = read('./insurance/InsuranceRequestPanel.js')
  const documentsSource = read('./insurance/InsuranceDocumentsPanel.js')

  assert.match(screenSource, /useSafeAreaInsets/)
  assert.match(screenSource, /paddingTop:\s*Math\.max\(insets\.top,\s*\d+\)/)
  assert.match(screenSource, /paddingBottom:\s*Math\.max\(insets\.bottom,\s*\d+\)/)
  assert.match(screenSource, /bottomInset=\{insets\.bottom\}/)
  assert.match(requestSource, /bottomInset\s*=\s*0/)
  assert.match(requestSource, /paddingBottom:\s*Math\.max\(bottomInset,\s*\d+\)/)
  assert.match(documentsSource, /bottomInset\s*=\s*0/)
  assert.match(documentsSource, /paddingBottom:\s*Math\.max\(bottomInset,\s*\d+\)/)
})
