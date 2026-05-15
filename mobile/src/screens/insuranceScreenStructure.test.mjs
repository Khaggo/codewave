import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(TEST_DIR, '../../..')

const read = (relativePath) => readFileSync(resolve(TEST_DIR, relativePath), 'utf8')

test('insurance screen uses the hybrid panel architecture', () => {
  const source = read('./InsuranceInquiryScreen.js')

  assert.match(source, /import InsuranceEntryPanel from '\.\/insurance\/InsuranceEntryPanel';/)
  assert.match(source, /import InsuranceModeShell from '\.\/insurance\/InsuranceModeShell';/)
  assert.match(source, /const \[isInInsuranceMode, setIsInInsuranceMode\] = useState\(false\);/)
  assert.match(source, /const \[activeModeSection, setActiveModeSection\] = useState\('overview'\);/)
  assert.match(source, /const entryState = useMemo\(/)
  assert.match(source, /const overviewState = useMemo\(/)
  assert.match(source, /const statusPanelKey = useMemo\(\(\) => {/)
  assert.doesNotMatch(source, /statusState\.title === 'Renewal follow-up'/)
  assert.match(source, /const handleChangeModeSection = \(section\) => {/)
  assert.match(
    source,
    /useEffect\(\(\) => {\s*setActivePanel\('home'\);\s*setIsInInsuranceMode\(false\);\s*setActiveModeSection\('overview'\);\s*}, \[selectedVehicleId\]\);/s,
  )
  assert.match(
    source,
    /const statusPanelKey = useMemo\(\(\) => {[\s\S]*?return 'renewal';[\s\S]*?return 'payment';[\s\S]*?return 'status';[\s\S]*?}\s*, \[[\s\S]*?\]\);/s,
  )
  assert.match(
    source,
    /const handleChangeModeSection = \(section\) => {\s*setActiveModeSection\(section\);[\s\S]*?if \(section === 'overview'\) {\s*setActivePanel\('home'\);[\s\S]*?return;\s*}[\s\S]*?if \(section === 'status'\) {[\s\S]*?setActivePanel\(statusPanelKey\);[\s\S]*?return;\s*}[\s\S]*?handleOpenPanel\(section\);[\s\S]*?};/s,
  )
  assert.match(
    source,
    /{!isInInsuranceMode \? \(\s*<InsuranceEntryPanel[\s\S]*?onEnterMode=\{\(\) => openInsuranceMode\('overview'\)\}[\s\S]*?\) : \(\s*<InsuranceModeShell[\s\S]*?activeSection=\{activeModeSection\}[\s\S]*?onChangeSection=\{handleChangeModeSection\}[\s\S]*?activeModeSection === 'overview'[\s\S]*?<InsuranceHomePanel[\s\S]*?activeModeSection === 'request'[\s\S]*?<InsuranceRequestPanel[\s\S]*?activeModeSection === 'documents'[\s\S]*?<InsuranceDocumentsPanel[\s\S]*?activeModeSection === 'status'[\s\S]*?<InsuranceStatusDetailPanel[\s\S]*?activeModeSection === 'history'[\s\S]*?<InsuranceStatusDetailPanel[\s\S]*?\)}/s,
  )
  assert.match(
    source,
    /activePanel === 'renewal'[\s\S]*?activePanel === 'payment'[\s\S]*?: 'Current request status'/s,
  )
  assert.match(source, /activePanel === 'payment' \? \(/)
  assert.match(source, /: statusState\.summary/)
})

test('task 3 panel dependencies are tracked for clean checkouts', () => {
  const trackedFiles = execFileSync(
    'git',
    [
      '-C',
      REPO_ROOT,
      'ls-files',
      '--error-unmatch',
      'mobile/src/screens/insurance/InsuranceHomePanel.js',
      'mobile/src/screens/insurance/InsuranceRequestPanel.js',
      'mobile/src/screens/insurance/InsuranceDocumentsPanel.js',
      'mobile/src/screens/insurance/InsuranceStatusDetailPanel.js',
    ],
    { encoding: 'utf8' },
  )

  assert.match(trackedFiles, /InsuranceHomePanel\.js/)
  assert.match(trackedFiles, /InsuranceRequestPanel\.js/)
  assert.match(trackedFiles, /InsuranceDocumentsPanel\.js/)
  assert.match(trackedFiles, /InsuranceStatusDetailPanel\.js/)
})

test('insurance mode renders overview, request, docs, status, and history destinations', () => {
  const source = read('./InsuranceInquiryScreen.js')

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

test('task 4 uses the redesigned overview, request, and document workspace structure', () => {
  const screenSource = read('./InsuranceInquiryScreen.js')
  const homeSource = read('./insurance/InsuranceHomePanel.js')
  const requestSource = read('./insurance/InsuranceRequestPanel.js')
  const documentsSource = read('./insurance/InsuranceDocumentsPanel.js')

  const homeFragments = [
    'title="Insurance overview"',
    'overviewState.routeRows.map((row) => (',
    'styles.routeRow',
  ]

  const requestFragments = [
    'Step 1 of 5',
    'styles.footer',
    'styles.summaryStrip',
    'styles.sectionDivider',
  ]

  const documentFragments = [
    'styles.sectionDivider',
    'styles.uploadTargetRow',
    'styles.footer',
    'Upload file',
  ]

  assert.match(
    screenSource,
    /onChangeDraft=\{\(patch\) => \{[\s\S]*?setDraft\(\(current\) => \(\{ \.\.\.current, \.\.\.patch \}\)\)[\s\S]*?\}\}/,
  )
  assert.match(screenSource, /onPickDocument=\{pickCustomerInsuranceDocument\}/)
  assert.match(screenSource, /onUploadDocument=\{handleUploadPickedDocument\}/)
  assert.match(
    screenSource,
    /onChangeDocumentDraft=\{\(patch\) => \{[\s\S]*?setDocumentDraft\(\(current\) => \(\{ \.\.\.current, \.\.\.patch \}\)\)[\s\S]*?\}\}/,
  )

  for (const fragment of homeFragments) {
    assert.ok(homeSource.includes(fragment), `Expected home redesign fragment: ${fragment}`)
  }

  for (const fragment of requestFragments) {
    assert.ok(requestSource.includes(fragment), `Expected request redesign fragment: ${fragment}`)
  }

  for (const fragment of documentFragments) {
    assert.ok(documentsSource.includes(fragment), `Expected documents redesign fragment: ${fragment}`)
  }
})
