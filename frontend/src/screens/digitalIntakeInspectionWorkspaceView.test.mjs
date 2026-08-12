import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  getArrivalPhotoButtonLabel,
  getArrivalPhotoDisplayLabel,
  getArrivalPhotoTemporaryRef,
  isArrivalPhotoTemporaryRef,
  getIntakeWorkspaceHeroCopy,
  getIntakeRequirementsBadge,
  getIntakeWorkspacePrimaryActionLabel,
  INTAKE_STAGE_ORDER,
  canNavigateFromVisitTypeStage,
  getAdjacentIntakeStage,
  getIntakeStageKeyForBlocker,
  getIntakeStageStatusText,
} from './digitalIntakeInspectionWorkspaceView.mjs'

const workspaceSource = readFileSync(new URL('./DigitalIntakeInspectionWorkspace.js', import.meta.url), 'utf8')
const pagerSource = readFileSync(new URL('./ArrivalInspectionPager.jsx', import.meta.url), 'utf8')
const comboboxSource = readFileSync(new URL('./IntakeSearchCombobox.jsx', import.meta.url), 'utf8')
const componentsSource = readFileSync(new URL('./DigitalIntakeInspectionComponents.jsx', import.meta.url), 'utf8')

test('intake stages use document flow without a normal-viewport inner scroller', () => {
  assert.match(
    workspaceSource,
    /ops-page-shell flex min-h-0 min-w-0 flex-col overflow-x-hidden lg:h-full/,
  )
  assert.match(
    workspaceSource,
    /mx-auto flex min-h-0 w-full max-w-\[90rem\] flex-1 overflow-x-hidden/,
  )
  assert.doesNotMatch(workspaceSource, /sm:overflow-y-auto/)
  assert.match(workspaceSource, /data-intake-stage-shell/)
  assert.match(workspaceSource, /data-intake-stage-panel/)
  assert.match(workspaceSource, /data-intake-actions/)
  assert.match(workspaceSource, /lg:grid-cols-6/)
  assert.doesNotMatch(pagerSource, /overflow-y-auto/)
  assert.match(pagerSource, /className="space-y-2"/)
})

test('Intake Batch 2 mounts compact walk-in, choice, and category-pager paths', () => {
  assert.match(workspaceSource, /<WalkInCustomerModal/)
  assert.match(workspaceSource, /<IntakeChoiceModal/)
  assert.match(workspaceSource, /<ArrivalInspectionPager/)
  assert.match(workspaceSource, /Add walk-in customer/)
  assert.match(workspaceSource, /Choose reasons/)
  assert.match(workspaceSource, /Choose services/)
  assert.doesNotMatch(workspaceSource, /sm:overflow-y-auto/)
})

test('optional requirement and arrival details use focused draft modals', () => {
  assert.match(workspaceSource, /title="Requirement notes"/)
  assert.match(workspaceSource, /returnFocusRef=\{requirementsNotesTriggerRef\}/)
  assert.match(workspaceSource, /title="Arrival condition details"/)
  assert.match(workspaceSource, /returnFocusRef=\{arrivalDetailsTriggerRef\}/)
  assert.match(workspaceSource, /const \[detailModalDraft, setDetailModalDraft\] = useState\(null\)/)
  assert.match(workspaceSource, /const applyDetailModal = \(\) =>/)
  assert.match(workspaceSource, /onClose=\{closeDetailModal\}/)
  assert.doesNotMatch(workspaceSource, /value=\{draft\.customerItems\}/)
  assert.doesNotMatch(workspaceSource, /value=\{draft\.customerSignatureName\}/)
  assert.doesNotMatch(workspaceSource, /value=\{draft\.paperChecklistStatus\}/)
})

test('inspection and review keep full details behind focused modal launchers', () => {
  const inspectionOverviewIndex = workspaceSource.indexOf('data-intake-inspection-overview')
  const inspectionModalIndex = workspaceSource.indexOf('open={inspectionModalOpen}')
  const pagerIndex = workspaceSource.indexOf('<ArrivalInspectionPager')
  const reviewOverviewIndex = workspaceSource.indexOf('data-intake-review-overview')
  const reviewModalIndex = workspaceSource.indexOf('open={reviewDetailsModalOpen}')

  assert.ok(inspectionOverviewIndex >= 0)
  assert.ok(inspectionOverviewIndex < inspectionModalIndex)
  assert.ok(inspectionModalIndex < pagerIndex)
  assert.ok(reviewOverviewIndex >= 0)
  assert.ok(reviewOverviewIndex < reviewModalIndex)
  assert.match(workspaceSource, /returnFocusRef=\{inspectionModalTriggerRef\}/)
  assert.match(workspaceSource, /returnFocusRef=\{reviewDetailsTriggerRef\}/)
})

test('Issue close preserves the parent dialog and restores the exact clicked trigger', () => {
  const openIssueSource = workspaceSource.slice(
    workspaceSource.indexOf('const openChecklistIssueEditor'),
    workspaceSource.indexOf('const closeChecklistIssueEditor'),
  )
  const closeIssueSource = workspaceSource.slice(
    workspaceSource.indexOf('const closeChecklistIssueEditor'),
    workspaceSource.indexOf('const saveChecklistIssue'),
  )

  assert.match(openIssueSource, /checklistIssueTriggerRef\.current =/)
  assert.match(openIssueSource, /document\.activeElement/)
  assert.doesNotMatch(openIssueSource, /setInspectionModalOpen/)
  assert.match(closeIssueSource, /setChecklistIssueEditor\(null\)/)
  assert.doesNotMatch(closeIssueSource, /setInspectionModalOpen/)
  assert.match(workspaceSource, /returnFocusRef=\{checklistIssueTriggerRef\}/)
  assert.match(componentsSource, /intakeModalStack\.at\(-1\) !== stackToken/)
  assert.match(componentsSource, /event\.stopImmediatePropagation\(\)/)
})

test('Arrival uses bounded accessible searchable customer and vehicle comboboxes', () => {
  assert.match(workspaceSource, /import IntakeSearchCombobox from '\.\/IntakeSearchCombobox\.jsx'/)
  assert.match(comboboxSource, /export function IntakeSearchCombobox/)
  assert.match(comboboxSource, /export default IntakeSearchCombobox/)
  assert.match(workspaceSource, /<IntakeSearchCombobox[\s\S]*label="Customer"/)
  assert.match(workspaceSource, /<IntakeSearchCombobox[\s\S]*label="Vehicle"/)
  assert.match(comboboxSource, /role="combobox"/)
  assert.match(comboboxSource, /aria-autocomplete="list"/)
  assert.match(comboboxSource, /aria-activedescendant=/)
  assert.match(comboboxSource, /role="listbox"/)
  assert.match(comboboxSource, /role="option"/)
  assert.match(comboboxSource, /Showing 20 of/)
  assert.match(workspaceSource, /onSearchChange=\{setCustomerSearchQuery\}/)
  assert.match(workspaceSource, /controller\.abort\(\)/)
})

test('concerns are summarized on stage and edited through a cancel-safe focused modal', () => {
  assert.doesNotMatch(workspaceSource, /value=\{draft\.serviceConcern\}/)
  assert.match(workspaceSource, /title="Customer concerns"/)
  assert.match(workspaceSource, /returnFocusRef=\{concernsTriggerRef\}/)
  assert.match(workspaceSource, /const saveConcernsModal = \(\) =>/)
  assert.match(workspaceSource, /serializeCustomerConcerns\(values\)/)
  assert.match(workspaceSource, /Save concerns/)
})

test('workspace keeps one page heading and removes the redundant stage subheader', () => {
  assert.equal((workspaceSource.match(/<h1/g) ?? []).length, 1)
  assert.doesNotMatch(workspaceSource, />Intake stages</)
  assert.doesNotMatch(workspaceSource, />Digital intake and inspection</)
})

test('staff hero copy matches the intake-first workspace wording', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(false), {
    title: 'Front-Desk Arrival Intake',
    description: 'Check in arrivals and capture vehicle condition before handoff.',
  })
})

test('technician hero copy stays intake-first and concise', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(true), {
    title: 'Front-Desk Arrival Intake',
    description: 'Check in arrivals and capture vehicle condition before handoff.',
  })
})

test('primary action labels stay concise across supported visit types', () => {
  assert.equal(getIntakeWorkspacePrimaryActionLabel('regular_service'), 'Save Service Intake')
  assert.equal(
    getIntakeWorkspacePrimaryActionLabel('insurance_related'),
    'Save Insurance Intake',
  )
  assert.equal(getIntakeWorkspacePrimaryActionLabel('back_job_complaint'), 'Save Complaint Intake')
  assert.equal(getIntakeWorkspacePrimaryActionLabel('inspection_only'), 'Save Inspection')
})

test('primary action labels fall back safely for missing visit types', () => {
  assert.equal(getIntakeWorkspacePrimaryActionLabel(undefined), 'Save Intake')
  assert.equal(getIntakeWorkspacePrimaryActionLabel('unknown_visit_type'), 'Save Intake')
})

test('requirements badge reflects checklist progress and missing notes', () => {
  assert.equal(getIntakeRequirementsBadge({}, ''), 'Pending check')
  assert.equal(
    getIntakeRequirementsBadge(
      {
        bookingFound: true,
        orCrPresent: false,
        validIdPresent: false,
      },
      '',
    ),
    'Partially checked',
  )
  assert.equal(
    getIntakeRequirementsBadge(
      {
        bookingFound: true,
        orCrPresent: true,
        validIdPresent: true,
        oldPolicyPresent: true,
        supportingDocsPresent: true,
      },
      '',
    ),
    'Ready to hand off',
  )
  assert.equal(
    getIntakeRequirementsBadge(
      {
        bookingFound: true,
        orCrPresent: true,
      },
      '',
    ),
    'Partially checked',
  )
  assert.equal(
    getIntakeRequirementsBadge(
      {
        bookingFound: true,
        orCrPresent: true,
        validIdPresent: true,
        oldPolicyPresent: true,
        supportingDocsPresent: true,
      },
      'Customer still needs to return with documents.',
    ),
    'Needs follow-up',
  )
})

test('arrival photo helpers provide temporary refs and upload tile copy', () => {
  assert.equal(getArrivalPhotoTemporaryRef('front'), 'upload://vehicle/front')
  assert.equal(getArrivalPhotoTemporaryRef('dashboardOdometer'), 'upload://vehicle/dashboardOdometer')
  assert.equal(isArrivalPhotoTemporaryRef('upload://vehicle/front'), true)
  assert.equal(
    isArrivalPhotoTemporaryRef('upload://vehicle/7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d/front/photo.jpg'),
    false,
  )
  assert.equal(getArrivalPhotoButtonLabel('front-view.jpg'), 'Replace photo')
  assert.equal(getArrivalPhotoButtonLabel(''), 'Add photo')
  assert.equal(getArrivalPhotoDisplayLabel('front-view.jpg'), 'front-view.jpg')
  assert.equal(getArrivalPhotoDisplayLabel(''), 'No photo selected')
})

test('intake stage navigation stays bounded and preserves the six-stage order', () => {
  assert.deepEqual(
    INTAKE_STAGE_ORDER.map((stage) => stage.key),
    ['arrival', 'visit_type', 'concerns_services', 'requirements', 'arrival_inspection', 'review_handoff'],
  )
  assert.equal(getAdjacentIntakeStage('arrival', 'previous'), 'arrival')
  assert.equal(getAdjacentIntakeStage('arrival_inspection', 'next'), 'review_handoff')
  assert.equal(getAdjacentIntakeStage('review_handoff', 'next'), 'review_handoff')
})

test('Visit Type gates forward progress but permits completed-stage revisits', () => {
  assert.equal(canNavigateFromVisitTypeStage({
    currentStage: 'visit_type',
    targetStage: 'concerns_services',
    visitTypeReady: false,
  }), false)
  assert.equal(canNavigateFromVisitTypeStage({
    currentStage: 'visit_type',
    targetStage: 'concerns_services',
    visitTypeReady: true,
  }), true)
  assert.equal(canNavigateFromVisitTypeStage({
    currentStage: 'visit_type',
    targetStage: 'concerns_services',
    visitTypeReady: false,
    targetStageState: 'ready',
    allowCompletedRevisit: true,
  }), true)
  assert.equal(canNavigateFromVisitTypeStage({
    currentStage: 'visit_type',
    targetStage: 'arrival',
    visitTypeReady: false,
  }), true)
})

test('Visit Type Next uses a native disabled gate with a visible focus target', () => {
  assert.match(workspaceSource, /const visitTypeNextBlocked = activeIntakeTab === 'visit_type' && !visitTypeReady/)
  assert.match(workspaceSource, /disabled=\{!nextIntakeStage \|\| captureState\.status === 'capture_submitting' \|\| visitTypeNextBlocked\}/)
  assert.match(workspaceSource, /Choose a visit type to continue\./)
  assert.match(workspaceSource, /ref=\{visitTypeGroupRef\}[\s\S]*role="group"[\s\S]*aria-label="Visit Type"/)
  assert.match(workspaceSource, /focusVisitTypeGate\(\)/)
  assert.match(workspaceSource, /requestIntakeStage\(tab\.key, \{ allowCompletedRevisit: true \}\)/)
})

test('completion blockers map to the visible stage without changing their contract tab', () => {
  assert.equal(getIntakeStageKeyForBlocker({ tab: 'arrival_visit', control: 'customer' }), 'arrival')
  assert.equal(getIntakeStageKeyForBlocker({ tab: 'arrival_visit', control: 'visit-type' }), 'visit_type')
  assert.equal(
    getIntakeStageKeyForBlocker({ tab: 'concern_requirements', control: 'requested-services' }),
    'concerns_services',
  )
  assert.equal(getIntakeStageKeyForBlocker({ tab: 'concern_requirements', control: 'bookingFound' }), 'requirements')
  assert.equal(
    getIntakeStageKeyForBlocker({ tab: 'inspection_signoff', control: 'checklist-battery' }),
    'arrival_inspection',
  )
})

test('stage status has a text alternative to color', () => {
  assert.equal(getIntakeStageStatusText('ready'), 'Complete')
  assert.equal(getIntakeStageStatusText('blocked'), 'Needs attention')
  assert.equal(getIntakeStageStatusText('incomplete'), 'Not started')
})
