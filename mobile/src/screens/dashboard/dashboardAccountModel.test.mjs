import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDashboardProfileSavePlan,
  createDashboardProfileForm,
} from './dashboardAccountModel.mjs'

const birthday = new Date(1995, 5, 15)

const account = {
  firstName: 'Ari',
  lastName: 'Santos',
  email: 'ari@example.com',
  phoneNumber: '09171234567',
  birthday,
  city: 'Quezon City',
  gender: 'female',
}

test('Dashboard account model creates an editable form from customer data', () => {
  assert.deepEqual(createDashboardProfileForm(account), {
    fullName: 'Ari Santos',
    email: 'ari@example.com',
    phoneNumber: '09171234567',
    birthday,
    city: 'Quezon City',
    gender: 'female',
  })
})

test('Dashboard account model converts a stored PH country code for the mobile field', () => {
  assert.equal(
    createDashboardProfileForm({
      ...account,
      phoneNumber: '+63 917 000 0101',
    }).phoneNumber,
    '09170000101',
  )
})

test('Dashboard account model builds only supported profile mutations', () => {
  const plan = buildDashboardProfileSavePlan({
    account,
    profileForm: {
      ...createDashboardProfileForm(account),
      fullName: 'Ari Mae Santos',
      phoneNumber: '0918 222 3333',
    },
  })

  assert.deepEqual(plan.errors, {})
  assert.deepEqual(plan.unsupportedChanges, [])
  assert.deepEqual(plan.payload, {
    firstName: 'Ari',
    lastName: 'Mae Santos',
    phoneNumber: '09182223333',
    birthday,
  })
})

test('Dashboard account model reports invalid and unsupported changes', () => {
  const plan = buildDashboardProfileSavePlan({
    account,
    profileForm: {
      ...createDashboardProfileForm(account),
      fullName: '',
      email: 'different@example.com',
      city: 'Manila',
      gender: 'male',
    },
  })

  assert.equal(plan.errors.fullName, 'Enter your full name.')
  assert.deepEqual(plan.unsupportedChanges, ['email', 'city', 'gender'])
})
