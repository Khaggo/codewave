import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  buildProvisioningErrors,
  buildStatusErrors,
  formatEmailPreviewName,
  summarizeManagedAccounts,
} from './staffProvisioningView.mjs'

test('buildProvisioningErrors validates the required fields', () => {
  assert.deepEqual(
    buildProvisioningErrors({
      firstName: '',
      lastName: '',
      phone: '',
    }),
    {
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

test('staff account source keeps the directory first and provisioning in a closed drawer', () => {
  const source = readFileSync(new URL('./StaffProvisioningPanel.js', import.meta.url), 'utf8')
  const topbarSource = readFileSync(new URL('./layout/Topbar.js', import.meta.url), 'utf8')
  const titleIndex = source.indexOf('<header className=')
  const directoryIndex = source.indexOf('title="Managed Account Directory"')
  const summaryIndex = source.indexOf('aria-label="Staff account summary"')

  assert.doesNotMatch(source, /temporaryPassword|passwordHash|type="password"|min-w-\[760px\]/)
  assert.ok(titleIndex >= 0 && directoryIndex > titleIndex && summaryIndex > directoryIndex)
  assert.match(source, /useState\(false\)/)
  assert.match(source, /aria-haspopup="dialog"/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /Close add account drawer/)
  assert.match(source, /staff-account-drawer min-h-full/)
  assert.match(source, /className="order-1 min-w-0"/)
  assert.match(source, /data-table w-full table-fixed/)
  assert.match(source, /Retry credential email/)
  assert.match(source, /temporary sign-in credential was emailed/)
  assert.match(source, /Creating\.\.\.|Retrying delivery\.\.\.|Unable to provision/)
  assert.match(topbarSource, /flex h-\[72px\] min-w-0 items-center/)
  assert.match(topbarSource, /mr-auto min-w-0 flex-1/)
  assert.match(topbarSource, /max-w-\[168px\] shrink-0 lg:max-w-\[150px\] xl:max-w-\[230px\]/)
  assert.match(topbarSource, /flex w-full min-w-0 items-center/)
  assert.match(topbarSource, /hover:bg-emerald-500\/15 xl:flex/)
  assert.match(topbarSource, /hidden min-w-0 flex-1 text-left md:block/)
  assert.match(topbarSource, /truncate whitespace-nowrap text-xs font-semibold/)
  assert.match(topbarSource, /truncate whitespace-nowrap text-\[11px\]/)
  assert.match(topbarSource, /hidden shrink-0 text-ink-dim md:block/)
  assert.match(topbarSource, /aria-label={`Open account menu/)
})
