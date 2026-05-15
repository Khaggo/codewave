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
    "if (section === 'history') {",
    "setActiveInsuranceTab('status')",
    'title="Recorded vehicle updates"',
    'statusState={historyStatusState}',
    'sortedHistoryRecords.map((record) => (',
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected direct-shell fragment: ${fragment}`)
  }

  assert.doesNotMatch(source, /<InsuranceEntryPanel/)
  assert.doesNotMatch(source, /Enter insurance mode/)
  assert.doesNotMatch(source, /Protection center/)
  assert.doesNotMatch(source, /onChangeSection=\{setActiveInsuranceTab\}/)
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
    'onPress={onOpenVehiclePicker}',
    'onPress={() => onChangeSection(item.key)}',
    '<View style={styles.body}>{children}</View>',
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected shell fragment: ${fragment}`)
  }

  assert.doesNotMatch(source, /Back to insurance/)
  assert.doesNotMatch(source, /Insurance mode/)
  assert.doesNotMatch(source, /History/)
})
