import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getJobOrderFinalizationActionState,
  getPaymentSettlementChannelLabel,
} from './jobOrderFinalizationView.mjs'

test('finalization requires an owned claim and backend-ready work without an invoice', () => {
  const readyJobOrder = {
    id: 'job-order-1',
    finalizationReadiness: { canFinalize: true },
    invoiceRecord: null,
  }

  assert.equal(
    getJobOrderFinalizationActionState({
      jobOrder: readyJobOrder,
      canFinalizeClaimedWork: true,
    }).canFinalize,
    true,
  )
  assert.equal(
    getJobOrderFinalizationActionState({
      jobOrder: readyJobOrder,
      canFinalizeClaimedWork: false,
    }).canFinalize,
    false,
  )
  assert.equal(
    getJobOrderFinalizationActionState({
      jobOrder: {
        ...readyJobOrder,
        finalizationReadiness: { canFinalize: false },
      },
      canFinalizeClaimedWork: true,
    }).canFinalize,
    false,
  )
})

test('an existing invoice disables duplicate finalization and enables settlement actions', () => {
  const actionState = getJobOrderFinalizationActionState({
    jobOrder: {
      id: 'job-order-1',
      invoiceRecord: {
        paymentStatus: 'pending',
        onlinePaymentSessionId: 'checkout-session-1',
      },
    },
    canFinalizeClaimedWork: true,
  })

  assert.deepEqual(actionState, {
    canFinalize: false,
    canRecordManualPayment: true,
    canStartOnlineCheckout: true,
    canRefreshOnlineCheckout: true,
    canExportInvoice: true,
  })
})

test('paid or submitting invoices prevent duplicate payment actions', () => {
  const paidState = getJobOrderFinalizationActionState({
    jobOrder: {
      invoiceRecord: {
        paymentStatus: 'paid',
        onlinePaymentSessionId: 'checkout-session-1',
      },
    },
  })
  const submittingState = getJobOrderFinalizationActionState({
    jobOrder: {
      invoiceRecord: {
        paymentStatus: 'pending',
        onlinePaymentSessionId: 'checkout-session-1',
      },
    },
    paymentStatus: 'payment_submitting',
  })

  assert.equal(paidState.canRecordManualPayment, false)
  assert.equal(submittingState.canRecordManualPayment, false)
  assert.equal(submittingState.canStartOnlineCheckout, false)
  assert.equal(submittingState.canRefreshOnlineCheckout, false)
})

test('settlement labels distinguish online, manual, and unselected channels', () => {
  assert.equal(
    getPaymentSettlementChannelLabel({ paymentChannel: 'online_provider' }),
    'PayMongo hosted checkout',
  )
  assert.equal(
    getPaymentSettlementChannelLabel({ paymentChannel: 'manual' }),
    'Manual settlement',
  )
  assert.equal(getPaymentSettlementChannelLabel(null), 'Not selected yet')
})
