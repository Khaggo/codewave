import test from 'node:test'
import assert from 'node:assert/strict'

import {
  LOW_STOCK_THRESHOLD,
  addInventoryAdjustment,
  addInventoryProduct,
  archiveInventoryProduct,
  getInventoryAdjustmentHistorySnapshot,
  getInventoryProductsSnapshot,
  getLowStockProducts,
  resetOperationsState,
  updateInventoryProduct,
  updateInventoryProductThreshold,
} from './operationsStore.js'

test.beforeEach(() => {
  resetOperationsState()
})

test('inventory products derive stock state from quantity and per-product threshold', () => {
  const products = getInventoryProductsSnapshot()
  const inStockProduct = products.find((product) => product.id === 'p1')
  const outOfStockProduct = products.find((product) => product.id === 'p8')

  assert.equal(inStockProduct.lowStockThreshold, LOW_STOCK_THRESHOLD)
  assert.equal(inStockProduct.stockState, 'in_stock')
  assert.equal(outOfStockProduct.lowStockThreshold, LOW_STOCK_THRESHOLD)
  assert.equal(outOfStockProduct.stockState, 'out_of_stock')
})

test('inventory adjustments add and subtract stock while recording history', () => {
  const addedProduct = addInventoryAdjustment('p2', {
    actor: 'Inventory Lead',
    actionType: 'add',
    quantity: 4,
    reason: 'Cycle count correction',
    note: 'Found sealed stock in overflow bin.',
  })

  assert.equal(addedProduct.stock, 12)
  assert.equal(addedProduct.stockState, 'in_stock')

  const subtractedProduct = addInventoryAdjustment('p2', {
    actor: 'Inventory Lead',
    actionType: 'subtract',
    quantity: 7,
    reason: 'Damaged stock write-off',
  })

  assert.equal(subtractedProduct.stock, 5)
  assert.equal(subtractedProduct.stockState, 'low_stock')

  const history = getInventoryAdjustmentHistorySnapshot('p2')

  assert.equal(history.length, 2)
  assert.equal(history[0].productId, 'p2')
  assert.equal(history[0].actor, 'Inventory Lead')
  assert.equal(history[0].actionType, 'subtract')
  assert.equal(history[0].previousQuantity, 12)
  assert.equal(history[0].newQuantity, 5)
  assert.equal(history[0].delta, -7)
  assert.equal(history[0].reason, 'Damaged stock write-off')
  assert.equal(history[0].note, '')
  assert.ok(history[0].timestamp)

  assert.equal(history[1].actionType, 'add')
  assert.equal(history[1].previousQuantity, 8)
  assert.equal(history[1].newQuantity, 12)
  assert.equal(history[1].delta, 4)
  assert.equal(history[1].reason, 'Cycle count correction')
  assert.equal(history[1].note, 'Found sealed stock in overflow bin.')
})

test('subtracting stock cannot drive quantity below zero', () => {
  assert.throws(
    () =>
      addInventoryAdjustment('p3', {
        actor: 'Inventory Lead',
        actionType: 'subtract',
        quantity: 8,
        reason: 'Damaged stock write-off',
      }),
    /cannot go below 0/i,
  )
})

test('inventory adjustments require a valid action reason', () => {
  assert.throws(
    () =>
      addInventoryAdjustment('p3', {
        actor: 'Inventory Lead',
        actionType: 'add',
        quantity: 2,
        reason: '   ',
      }),
    /reason is required/i,
  )
})

test('inventory low-stock lookups use per-product thresholds instead of publish visibility', () => {
  const updatedProduct = updateInventoryProductThreshold('p2', 10)

  assert.equal(updatedProduct.lowStockThreshold, 10)
  assert.equal(updatedProduct.stockState, 'low_stock')

  const lowStockIds = getLowStockProducts().map((product) => product.id)

  assert.deepEqual(lowStockIds.sort(), ['p2', 'p8'].sort())
})

test('adding inventory products rejects invalid low-stock thresholds', () => {
  const [existingProduct] = getInventoryProductsSnapshot()

  assert.throws(
    () =>
      addInventoryProduct({
        name: 'Wheel Cleaner',
        category: existingProduct.category,
        price: 299,
        stock: 12,
        sku: 'WC-001',
        description: 'Concentrated wheel cleaner.',
        images: ['https://example.com/wheel-cleaner.jpg'],
        lowStockThreshold: -1,
      }),
    /low-stock threshold must be zero or greater/i,
  )
})

test('updating inventory products rejects invalid low-stock thresholds', () => {
  const existingProduct = getInventoryProductsSnapshot().find((product) => product.id === 'p2')

  assert.throws(
    () =>
      updateInventoryProduct('p2', {
        category: existingProduct.category,
        lowStockThreshold: Number.NaN,
      }),
    /low-stock threshold must be zero or greater/i,
  )
})

test('stock adjustments stay separate from catalog publish visibility', () => {
  archiveInventoryProduct('p2')

  const adjustedProduct = addInventoryAdjustment('p2', {
    actor: 'Inventory Lead',
    actionType: 'subtract',
    quantity: 3,
    reason: 'Shelf transfer',
  })

  assert.equal(adjustedProduct.status, 'archived')
  assert.equal(adjustedProduct.stock, 5)
  assert.equal(adjustedProduct.stockState, 'low_stock')
})
