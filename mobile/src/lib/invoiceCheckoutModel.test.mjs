import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildInvoiceCheckoutPayload,
  createInitialInvoiceCheckoutForm,
  validateInvoiceCheckoutForm,
} from './invoiceCheckoutModel.mjs'

test('checkout form is initialized from the signed-in customer', () => {
  assert.deepEqual(
    createInitialInvoiceCheckoutForm({
      firstName: 'Alex',
      lastName: 'Cruz',
      email: 'alex@example.com',
      defaultAddress: { city: 'Quezon City' },
    }),
    {
      recipientName: 'Alex Cruz',
      email: 'alex@example.com',
      contactPhone: '',
      addressLine1: '',
      addressLine2: '',
      city: 'Quezon City',
      province: '',
      postalCode: '',
      notes: '',
    },
  )
})

test('checkout validation and payload normalization share the same rules', () => {
  const form = {
    recipientName: '  Alex Cruz ',
    email: ' ALEX@EXAMPLE.COM ',
    contactPhone: '0917 123 4567',
    addressLine1: '  12 Main Street ',
    addressLine2: '',
    city: ' Quezon City ',
    province: ' Metro Manila ',
    postalCode: '1101',
  }

  assert.deepEqual(validateInvoiceCheckoutForm(form), {})
  assert.deepEqual(buildInvoiceCheckoutPayload(form), {
    recipientName: 'Alex Cruz',
    email: 'alex@example.com',
    contactPhone: '09171234567',
    addressLine1: '12 Main Street',
    addressLine2: undefined,
    city: 'Quezon City',
    province: 'Metro Manila',
    postalCode: '1101',
  })
})
