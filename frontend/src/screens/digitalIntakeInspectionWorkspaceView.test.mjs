import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getArrivalPhotoButtonLabel,
  getArrivalPhotoDisplayLabel,
  getArrivalPhotoTemporaryRef,
  isArrivalPhotoTemporaryRef,
  getIntakeWorkspaceHeroCopy,
  getIntakeRequirementsBadge,
  getIntakeWorkspacePrimaryActionLabel,
} from './digitalIntakeInspectionWorkspaceView.mjs'

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
