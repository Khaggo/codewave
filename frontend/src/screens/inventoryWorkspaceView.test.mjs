import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildInventorySummary,
  filterInventoryProducts,
  formatInventoryDelta,
  getInventoryStockStateMeta,
} from './inventoryWorkspaceView.mjs'

const sampleProducts = [
  {
    id: 'p1',
    name: 'Brake Pads',
    sku: 'BP-001',
    category: 'Brakes',
    description: 'Ceramic front brake pad set.',
    stock: 14,
    stockState: 'in_stock',
    status: 'published',
  },
  {
    id: 'p2',
    name: 'Oil Filter',
    sku: 'OF-010',
    category: 'Engine',
    description: 'Long-life oil filter cartridge.',
    stock: 3,
    stockState: 'low_stock',
    status: 'archived',
  },
  {
    id: 'p3',
    name: 'Shop Towels',
    sku: 'ST-007',
    category: 'Supplies',
    description: 'Disposable cleanup towels.',
    stock: 0,
    stockState: 'out_of_stock',
    status: 'published',
  },
]

test('filterInventoryProducts matches name, sku, category, and description', () => {
  assert.deepEqual(
    filterInventoryProducts(sampleProducts, 'filter').map((product) => product.id),
    ['p2'],
  )
  assert.deepEqual(
    filterInventoryProducts(sampleProducts, 'BP-001').map((product) => product.id),
    ['p1'],
  )
  assert.deepEqual(
    filterInventoryProducts(sampleProducts, 'supplies').map((product) => product.id),
    ['p3'],
  )
  assert.deepEqual(
    filterInventoryProducts(sampleProducts, 'cleanup').map((product) => product.id),
    ['p3'],
  )
})

test('buildInventorySummary counts stock states separately from publish visibility', () => {
  assert.deepEqual(buildInventorySummary(sampleProducts), {
    totalProducts: 3,
    lowStockProducts: 1,
    outOfStockProducts: 1,
    publishedProducts: 2,
  })
})

test('getInventoryStockStateMeta returns calm labels for each stock state', () => {
  assert.deepEqual(getInventoryStockStateMeta('in_stock'), {
    label: 'In stock',
    badgeClassName: 'badge badge-green',
    fieldClassName: 'surface-tone-success',
  })
  assert.deepEqual(getInventoryStockStateMeta('low_stock'), {
    label: 'Low stock',
    badgeClassName: 'badge badge-orange',
    fieldClassName: 'border-brand-orange/15 bg-brand-orange/10 text-brand-orange',
  })
  assert.deepEqual(getInventoryStockStateMeta('out_of_stock'), {
    label: 'Out of stock',
    badgeClassName: 'badge badge-red',
    fieldClassName: 'surface-tone-danger',
  })
})

test('formatInventoryDelta makes stock movement direction obvious', () => {
  assert.equal(formatInventoryDelta(4), '+4')
  assert.equal(formatInventoryDelta(-3), '-3')
  assert.equal(formatInventoryDelta(0), '0')
})
