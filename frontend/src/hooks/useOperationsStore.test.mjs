import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  addInventoryAdjustment,
  resetOperationsState,
  updateInventoryProductThreshold,
} from '../shared/autocare/services/operationsStore.js'
import {
  useInventoryAdjustmentHistory,
  useInventoryProduct,
  useInventoryProducts,
  useLowStockProducts,
} from './useOperationsStore.js'

test.beforeEach(() => {
  resetOperationsState()
})

test('operations store hooks can be imported and read from their public surface', () => {
  function HookConsumer() {
    const products = useInventoryProducts()
    const lowStockProducts = useLowStockProducts()

    return React.createElement(
      'output',
      {
        'data-products': String(products.length),
        'data-low-stock': lowStockProducts.map((product) => product.id).join(','),
      },
      'ready',
    )
  }

  const markup = renderToStaticMarkup(React.createElement(HookConsumer))

  assert.match(markup, /data-products="8"/)
  assert.match(markup, /data-low-stock="p8"/)
})

test('inventory detail hooks expose product and adjustment history state', () => {
  updateInventoryProductThreshold('p2', 10)
  addInventoryAdjustment('p2', {
    actor: 'Inventory Lead',
    actionType: 'subtract',
    quantity: 3,
    reason: 'Cycle count variance',
  })

  function HookConsumer() {
    const product = useInventoryProduct('p2')
    const history = useInventoryAdjustmentHistory('p2')
    const allHistory = useInventoryAdjustmentHistory()

    return React.createElement(
      'output',
      {
        'data-product-id': product?.id ?? '',
        'data-product-stock-state': product?.stockState ?? '',
        'data-product-threshold': String(product?.lowStockThreshold ?? ''),
        'data-history-count': String(history.length),
        'data-history-delta': String(history[0]?.delta ?? ''),
        'data-all-history-count': String(allHistory.length),
      },
      'ready',
    )
  }

  const markup = renderToStaticMarkup(React.createElement(HookConsumer))

  assert.match(markup, /data-product-id="p2"/)
  assert.match(markup, /data-product-stock-state="low_stock"/)
  assert.match(markup, /data-product-threshold="10"/)
  assert.match(markup, /data-history-count="1"/)
  assert.match(markup, /data-history-delta="-3"/)
  assert.match(markup, /data-all-history-count="1"/)
})
