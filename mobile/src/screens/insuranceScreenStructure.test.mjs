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
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected shell fragment: ${fragment}`)
  }

  assert.doesNotMatch(source, /Back to insurance/)
  assert.doesNotMatch(source, /Insurance mode/)
  assert.doesNotMatch(source, /History/)
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

test('home and status tabs use section-first layout with short copy and no extra top-level cards', () => {
  const screenSource = read('./InsuranceInquiryScreen.js')
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

test('request and documents tabs use minimal section-first layouts', () => {
  const requestSource = read('./insurance/InsuranceRequestPanel.js')
  const documentsSource = read('./insurance/InsuranceDocumentsPanel.js')

  assert.match(requestSource, /title="Request"/)
  assert.match(requestSource, /Inquiry type/)
  assert.match(requestSource, /Claim details/)
  assert.match(requestSource, /Insurance details/)
  assert.match(requestSource, /Selected vehicle/)
  assert.match(requestSource, /Submit request/)
  assert.doesNotMatch(requestSource, /InsuranceSummaryStrip/)
  assert.doesNotMatch(requestSource, /Start a customer-safe insurance request/)
  assert.doesNotMatch(requestSource, /Step 1 of 5/)
  assert.doesNotMatch(requestSource, /This request stays tied to the active vehicle in insurance mode\./)

  assert.match(documentsSource, /title="Documents"/)
  assert.match(documentsSource, /Checklist/)
  assert.match(documentsSource, /Already on file/)
  assert.match(documentsSource, /Upload target/)
  assert.match(documentsSource, /Selected file/)
  assert.match(documentsSource, /Upload file/)
  assert.match(documentsSource, /Note/)
  assert.doesNotMatch(documentsSource, /InsuranceSummaryStrip/)
  assert.doesNotMatch(documentsSource, /Manage supporting files/)
  assert.doesNotMatch(documentsSource, /Work through the checklist, attach the next file, and keep the current request tidy\./)
})
