import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { resetOperationsState } from '../shared/autocare/services/operationsStore.js'
import { useInventoryProducts, useLowStockProducts } from './useOperationsStore.js'

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
