import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_DIR = dirname(fileURLToPath(import.meta.url))
const read = (relativePath) => readFileSync(resolve(TEST_DIR, relativePath), 'utf8')

test('mobile loyalty activity prefers readable invoice or reward references over raw loyalty source IDs', () => {
  const loyaltyClientSource = read('../lib/loyaltyClient.js')
  const dashboardSource = read('./Dashboard.js')

  const requiredFragments = [
    'const getReadableLoyaltySourceReference = (transaction) => {',
    'const invoiceReference = trimOrNull(pointsInput.invoiceReference);',
    "return rewardNameSnapshot ?? 'Reward redemption';",
    'sourceReferenceLabel: getReadableLoyaltySourceReference(transaction),',
    "item.sourceReferenceLabel ? ` - ${item.sourceReferenceLabel}` : ''",
  ]

  for (const fragment of requiredFragments) {
    assert.ok(loyaltyClientSource.includes(fragment) || dashboardSource.includes(fragment), `Expected readable-reference fragment: ${fragment}`)
  }

  assert.doesNotMatch(dashboardSource, /item\.sourceReference \? ` - \$\{item\.sourceReference\}` : ''/)
})

test('mobile ecommerce runtime errors stay customer-safe and do not echo UUID-bearing request URLs', () => {
  const ecommerceClientSource = read('../lib/ecommerceCheckoutClient.js')
  const proxySource = read('../../../qa/playwright/helpers/api.mjs')

  assert.match(
    ecommerceClientSource,
    /The ecommerce service is unavailable right now\. Start ecommerce-service on port 3001 or set EXPO_PUBLIC_ECOMMERCE_API_BASE_URL\./,
  )
  assert.doesNotMatch(ecommerceClientSource, /Unable to reach \$\{ecommerceApiBaseUrl\}\$\{path\}/)
  assert.doesNotMatch(ecommerceClientSource, /Timed out reaching \$\{ecommerceApiBaseUrl\}\$\{path\}/)

  assert.match(proxySource, /Mobile ecommerce proxy could not reach the ecommerce service\./)
  assert.doesNotMatch(proxySource, /Mobile API proxy failed for \$\{targetUrl\}/)
})
