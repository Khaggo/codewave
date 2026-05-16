import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const navigationSourcePath =
  'C:/Vscode/Main/codewave/frontend/src/lib/api/generated/auth/staff-web-session.ts'

function getKeyPositions(source, keys) {
  return keys.map((key) => source.indexOf(`key: '${key}'`))
}

test('staff portal navigation rules follow the real service flow order', () => {
  const source = fs.readFileSync(navigationSourcePath, 'utf8')
  const orderedKeys = [
    'dashboard',
    'bookings',
    'digital-intake-inspections',
    'job-orders-admin',
    'qa-audit',
    'invoice-order-management',
    'customer-directory',
    'vehicle-records',
    'back-jobs',
    'insurance',
    'loyalty-management',
    'catalog-admin',
    'inventory',
    'service-management',
    'user-admin',
    'appointments-admin',
    'summary-review',
    'settings',
  ]

  const positions = getKeyPositions(source, orderedKeys)
  positions.forEach((position, index) => {
    assert.notEqual(position, -1, `Expected to find ${orderedKeys[index]} in navigation rules`)
  })

  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(
      positions[index - 1] < positions[index],
      `${orderedKeys[index - 1]} should appear before ${orderedKeys[index]}`,
    )
  }
})
