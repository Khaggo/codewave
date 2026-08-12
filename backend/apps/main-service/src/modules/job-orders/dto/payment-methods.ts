export const JOB_ORDER_INVOICE_PAYMENT_METHODS = [
  'cash',
  'bank_transfer',
  'check',
  'other',
] as const;

export type JobOrderInvoicePaymentMethod = (typeof JOB_ORDER_INVOICE_PAYMENT_METHODS)[number];

const jobOrderInvoicePaymentMethodAliases: Record<string, JobOrderInvoicePaymentMethod> = {
  cash: 'cash',
  bank_transfer: 'bank_transfer',
  banktransfer: 'bank_transfer',
  check: 'check',
  cheque: 'check',
  other: 'other',
};

export const normalizeJobOrderInvoicePaymentMethod = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const token = value
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return jobOrderInvoicePaymentMethodAliases[token] ?? value;
};
