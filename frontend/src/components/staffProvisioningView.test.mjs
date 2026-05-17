import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildProvisioningErrors,
  buildStatusErrors,
  formatEmailPreviewName,
  summarizeManagedAccounts,
} from './staffProvisioningView.mjs'

test('buildProvisioningErrors validates the required fields', () => {
  assert.deepEqual(
    buildProvisioningErrors({
      password: 'short',
      firstName: '',
      lastName: '',
      phone: '',
    }),
    {
      password: 'Password must be at least 8 characters.',
      firstName: 'First name is required.',
      lastName: 'Last name is required.',
    },
  )
})

test('buildStatusErrors validates staff selection and reason length', () => {
  assert.deepEqual(
    buildStatusErrors({
      userId: '',
      reason: 'x'.repeat(161),
    }),
    {
      userId: 'Choose a staff account.',
      reason: 'Reason is too long.',
    },
  )
})

test('formatEmailPreviewName creates a safe email preview slug', () => {
  assert.equal(formatEmailPreviewName('Maria Santos'), 'mariasantos')
  assert.equal(formatEmailPreviewName(''), 'firstname')
})

test('summarizeManagedAccounts returns the directory counters', () => {
  assert.deepEqual(
    summarizeManagedAccounts([
      { isActive: true, role: 'service_adviser' },
      { isActive: false, role: 'technician' },
      { isActive: true, role: 'head_technician' },
      { isActive: true, role: 'super_admin' },
    ]),
    {
      total: 4,
      activeCount: 3,
      inactiveCount: 1,
      adminCount: 1,
      headTechnicianCount: 1,
      activeHeadTechnicianCount: 1,
    },
  )
})
