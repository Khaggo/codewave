import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const createJiti = require('../../../node_modules/jiti')
const jiti = createJiti(import.meta.url)

test.beforeEach(() => {
  return jiti.import('./index.js').then(({ resetOperationsState }) => {
    resetOperationsState()
  })
})

test('operations store APIs are available from the shared public export surface', async () => {
  const {
    addInventoryAdjustment,
    getInventoryAdjustmentHistorySnapshot,
    getInventoryProductsSnapshot,
    updateInventoryProductThreshold,
  } = await jiti.import('./index.js')
  const updatedProduct = updateInventoryProductThreshold('p2', 9)
  const adjustedProduct = addInventoryAdjustment('p2', {
    actor: 'Inventory Lead',
    actionType: 'subtract',
    quantity: 1,
    reason: 'Smoke coverage',
  })
  const products = getInventoryProductsSnapshot()
  const history = getInventoryAdjustmentHistorySnapshot('p2')

  assert.equal(updatedProduct.lowStockThreshold, 9)
  assert.equal(adjustedProduct.stock, 7)
  assert.equal(products.find((product) => product.id === 'p2')?.lowStockThreshold, 9)
  assert.equal(history.length, 1)
  assert.equal(history[0].productId, 'p2')
})
