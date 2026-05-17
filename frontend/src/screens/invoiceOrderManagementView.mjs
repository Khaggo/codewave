export const shortId = (value) => {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue ? normalizedValue.slice(0, 8).toUpperCase() : 'NONE'
}

export const getInvoicePdfStateLabel = (serviceInvoice) => {
  if (!serviceInvoice) {
    return 'Awaiting invoice'
  }

  if (serviceInvoice.pdfEmailError) {
    return 'Email retry needed'
  }

  if (serviceInvoice.pdfEmailSentAt) {
    return 'PDF emailed'
  }

  if (serviceInvoice.pdfGeneratedAt) {
    return 'PDF generated'
  }

  return 'Generation pending'
}

export const getLoadMessageTone = (status) => {
  if (status === 'invoice_order_loaded') {
    return 'success'
  }

  if (
    status === 'invoice_order_failed' ||
    status === 'invoice_order_runtime_unavailable' ||
    status === 'invoice_order_forbidden_role' ||
    status === 'invoice_order_unauthorized'
  ) {
    return 'danger'
  }

  return 'warning'
}
