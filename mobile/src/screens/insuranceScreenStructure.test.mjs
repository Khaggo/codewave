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
