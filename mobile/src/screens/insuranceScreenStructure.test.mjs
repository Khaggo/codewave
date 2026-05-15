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
  assert.doesNotMatch(source, /statusState\.title === 'Renewal follow-up'/)
  assert.match(source, /const handleChangeModeSection = \(section\) => {/)
  assert.match(
    source,
    /useEffect\(\(\) => {\s*setActivePanel\('home'\);\s*setIsInInsuranceMode\(false\);\s*setActiveModeSection\('overview'\);\s*}, \[selectedVehicleId\]\);/s,
  )
  assert.match(
    source,
    /const handleChangeModeSection = \(section\) => {\s*setActiveModeSection\(section\);[\s\S]*?if \(section === 'overview'\) {\s*setActivePanel\('home'\);[\s\S]*?return;\s*}[\s\S]*?if \(section === 'documents'\) {[\s\S]*?handleOpenPanel\(section\);[\s\S]*?return;\s*}[\s\S]*?setActivePanel\(section\);[\s\S]*?};/s,
  )
  assert.match(
    source,
    /{!isInInsuranceMode \? \(\s*<InsuranceEntryPanel[\s\S]*?onEnterMode=\{\(\) => openInsuranceMode\('overview'\)\}[\s\S]*?\) : \(\s*<InsuranceModeShell[\s\S]*?activeSection=\{activeModeSection\}[\s\S]*?onChangeSection=\{handleChangeModeSection\}[\s\S]*?activeModeSection === 'overview'[\s\S]*?<InsuranceHomePanel[\s\S]*?activeModeSection === 'request'[\s\S]*?<InsuranceRequestPanel[\s\S]*?activeModeSection === 'documents'[\s\S]*?<InsuranceDocumentsPanel[\s\S]*?activeModeSection === 'status'[\s\S]*?<InsuranceStatusDetailPanel[\s\S]*?activeModeSection === 'history'[\s\S]*?<InsuranceStatusDetailPanel[\s\S]*?\)}/s,
  )
  assert.doesNotMatch(source, /statusPanelKey/)
  assert.doesNotMatch(source, /currentStatusDestinationKey/)
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
    'eyebrow="Status"',
    'eyebrow="History"',
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

test('request and documents sections own scrolling when sticky footers are enabled', () => {
  const screenSource = read('./InsuranceInquiryScreen.js')
  const modeShellSource = read('./insurance/InsuranceModeShell.js')
  const requestSource = read('./insurance/InsuranceRequestPanel.js')
  const documentsSource = read('./insurance/InsuranceDocumentsPanel.js')

  assert.match(
    screenSource,
    /const insuranceModeUsesPanelScroll = isInInsuranceMode &&\s*\(\s*activeModeSection === 'request' \|\|[\s\S]*?activeModeSection === 'documents' \|\|[\s\S]*?activeModeSection === 'status' \|\|[\s\S]*?activeModeSection === 'history'[\s\S]*?\);/,
  )
  assert.match(
    screenSource,
    /insuranceModeUsesPanelScroll \? <View style=\{styles\.fixedModeViewport\}>\{screenContent\}<\/View> : <ScrollView/s,
  )
  assert.match(modeShellSource, /style=\{\[styles\.container, style\]\}/)
  assert.match(requestSource, /import \{ ActivityIndicator, ScrollView, StyleSheet/)
  assert.match(
    requestSource,
    /<ScrollView[\s\S]*?contentContainerStyle=\{styles\.content\}[\s\S]*?showsVerticalScrollIndicator=\{false\}[\s\S]*?>/,
  )
  assert.match(documentsSource, /import \{ ActivityIndicator, ScrollView, StyleSheet/)
  assert.match(
    documentsSource,
    /<ScrollView[\s\S]*?contentContainerStyle=\{styles\.content\}[\s\S]*?showsVerticalScrollIndicator=\{false\}[\s\S]*?>/,
  )
})

test('status detail panel exposes a unified tracking surface with timeline and optional footer CTA', () => {
  const panelSource = read('./insurance/InsuranceStatusDetailPanel.js')

  assert.match(panelSource, /import \{ useRef \} from 'react'/)
  assert.match(panelSource, /import \{ ScrollView, StyleSheet, Text, TouchableOpacity, View \} from 'react-native'/)
  assert.match(panelSource, /const scrollViewRef = useRef\(null\)/)
  assert.match(panelSource, /const handleFooterPress = \(\) => \{/)
  assert.match(panelSource, /scrollViewRef\.current\?\.scrollToEnd\(\{ animated: true \}\)/)
  assert.match(panelSource, /statusState\.timeline\.map\(\(item\) => \(/)
  assert.match(panelSource, /title="Latest update"/)
  assert.match(panelSource, /const showsFooter = Boolean\(footerLabel && \(onFooterPress \|\| footerScrollTarget\)\)/)
  assert.match(panelSource, /\{showsFooter \? \(/)
  assert.match(panelSource, /paddingBottom:\s*140,/)
})

test('task 4 follow-up keeps footer space constrained, restores attached files, and uses stable status data', () => {
  const screenSource = read('./InsuranceInquiryScreen.js')
  const requestSource = read('./insurance/InsuranceRequestPanel.js')
  const documentsSource = read('./insurance/InsuranceDocumentsPanel.js')

  assert.match(
    requestSource,
    /<ScrollView[\s\S]*?style=\{styles\.scroll\}[\s\S]*?contentContainerStyle=\{styles\.content\}[\s\S]*?showsVerticalScrollIndicator=\{false\}[\s\S]*?>/,
  )
  assert.match(requestSource, /scroll:\s*\{\s*flex:\s*1,\s*minHeight:\s*0,/s)
  assert.match(requestSource, /paddingBottom:\s*140,/)

  assert.match(
    documentsSource,
    /<ScrollView[\s\S]*?style=\{styles\.scroll\}[\s\S]*?contentContainerStyle=\{styles\.content\}[\s\S]*?showsVerticalScrollIndicator=\{false\}[\s\S]*?>/,
  )
  assert.match(documentsSource, /latestInquiry\?\.documents\?\.length/)
  assert.match(documentsSource, /title="Already on file"/)
  assert.match(documentsSource, /latestInquiry\.documents\.map\(\(document\) => \(/)
  assert.match(documentsSource, /paddingBottom:\s*140,/)

  assert.match(screenSource, /const latestStatusUpdateLabel = useMemo\(/)
  assert.match(
    screenSource,
    /const latestStatusUpdateLabel = useMemo\(\(\) => \{\s*if \(latestInquiry\?\.statusHint\) \{\s*return latestInquiry\.statusHint;/s,
  )
  assert.match(screenSource, /if \(latestRecord\?\.statusHint\) \{\s*return latestRecord\.statusHint;/s)
  assert.doesNotMatch(screenSource, /latestUpdateLabel: timeline\[0\]\?\.message \?\? '--'/)
  assert.doesNotMatch(
    screenSource,
    /const latestStatusUpdateLabel = useMemo\(\(\) => \{\s*if \(latestInquiry\?\.updatedAt\) \{\s*return formatTimestampLabel\(latestInquiry\.updatedAt\);/s,
  )
  assert.match(screenSource, /latestUpdateLabel: latestStatusUpdateLabel,/)
  assert.match(screenSource, /const sortedHistoryRecords = useMemo\(\(\) => \{/)
  assert.match(screenSource, /return \[\.\.\.claimStatusUpdates\]\.sort\(\(left, right\) => \{/)
  assert.match(screenSource, /const latestHistoryRecord = sortedHistoryRecords\[0\] \?\? null;/)
  assert.match(screenSource, /const historyStatusState = useMemo\(/)
  assert.match(screenSource, /footerLabel=\{statusState\.ctaLabel\}/)
  assert.match(
    screenSource,
    /footerScrollTarget=\{statusState\.ctaRouteKey === 'status' \? 'end' : null\}/,
  )
  assert.match(
    screenSource,
    /onFooterPress=\{statusState\.ctaRouteKey === 'documents' \? \(\) => handleChangeModeSection\('documents'\) : null\}/,
  )
  assert.match(screenSource, /sortedHistoryRecords\.map\(\(record\) => \(/)
  assert.match(screenSource, /statusState=\{historyStatusState\}/)
})
