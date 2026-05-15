import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_DIR = dirname(fileURLToPath(import.meta.url))

const read = (relativePath) => readFileSync(resolve(TEST_DIR, relativePath), 'utf8')

test('insurance screen uses the hybrid panel architecture', () => {
  const source = read('./InsuranceInquiryScreen.js')

  const requiredFragments = [
    "import InsuranceEntryPanel from './insurance/InsuranceEntryPanel';",
    "import InsuranceModeShell from './insurance/InsuranceModeShell';",
    "const [isInInsuranceMode, setIsInInsuranceMode] = useState(false);",
    "const [activeModeSection, setActiveModeSection] = useState('overview');",
    '<InsuranceEntryPanel',
    '<InsuranceModeShell',
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected insurance screen source to include: ${fragment}`)
  }
})

test('insurance screen no longer relies on one giant stacked home page', () => {
  const source = read('./InsuranceInquiryScreen.js')

  assert.ok(!source.includes('Create insurance inquiry'))
  assert.ok(!source.includes('Requirements checklist'))
  assert.ok(!source.includes('Insurance history'))
})

test('insurance screen wires split request, documents, and detail destinations', () => {
  const source = read('./InsuranceInquiryScreen.js')

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
    assert.ok(source.includes(fragment), `Expected insurance screen source to include: ${fragment}`)
  }
})
