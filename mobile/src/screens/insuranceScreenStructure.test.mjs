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
  assert.match(
    source,
    /useEffect\(\(\) => {\s*setActivePanel\('home'\);\s*setIsInInsuranceMode\(false\);\s*setActiveModeSection\('overview'\);\s*}, \[selectedVehicleId\]\);/s,
  )
  assert.match(
    source,
    /{!isInInsuranceMode \? \(\s*<InsuranceEntryPanel[\s\S]*?onEnterMode=\{\(\) => openInsuranceMode\('overview'\)\}[\s\S]*?\) : \(\s*<InsuranceModeShell[\s\S]*?activeSection=\{activeModeSection\}[\s\S]*?<InsuranceHomePanel[\s\S]*?overviewState=\{overviewState\}[\s\S]*?\)}/s,
  )
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
