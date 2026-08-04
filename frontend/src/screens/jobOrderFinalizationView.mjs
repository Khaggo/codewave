export function getJobOrderFinalizationActionState({
  jobOrder,
  canFinalizeClaimedWork = false,
  finalizeStatus = '',
  paymentStatus = '',
} = {}) {
  const invoiceRecord = jobOrder?.invoiceRecord ?? null
  const hasInvoiceRecord = Boolean(invoiceRecord)
  const isPaymentSubmitting = paymentStatus === 'payment_submitting'

  return {
    canFinalize: Boolean(
      jobOrder &&
        canFinalizeClaimedWork &&
        !hasInvoiceRecord &&
        finalizeStatus !== 'finalize_submitting' &&
        jobOrder.finalizationReadiness?.canFinalize !== false,
    ),
    canRecordManualPayment: Boolean(
      hasInvoiceRecord &&
        invoiceRecord.paymentStatus !== 'paid' &&
        !isPaymentSubmitting,
    ),
    canStartOnlineCheckout: Boolean(
      hasInvoiceRecord && !isPaymentSubmitting,
    ),
    canRefreshOnlineCheckout: Boolean(
      invoiceRecord?.onlinePaymentSessionId && !isPaymentSubmitting,
    ),
    canExportInvoice: hasInvoiceRecord,
  }
}

export function getPaymentSettlementChannelLabel(invoiceRecord) {
  if (invoiceRecord?.paymentChannel === 'online_provider') {
    return 'PayMongo hosted checkout'
  }

  if (invoiceRecord?.paymentChannel === 'manual') {
    return 'Manual settlement'
  }

  return 'Not selected yet'
}
