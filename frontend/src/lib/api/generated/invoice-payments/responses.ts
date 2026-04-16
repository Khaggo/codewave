export interface InvoiceResponse {
  id: string;
  orderId: string;
  customerUserId: string;
  invoiceNumber: string;
  status: 'pending_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  currencyCode: string;
  totalCents: number;
  amountPaidCents: number;
  amountDueCents: number;
  agingBucket: 'current' | 'overdue_1_7' | 'overdue_8_30' | 'overdue_31_plus' | 'settled' | 'cancelled';
  daysPastDue: number;
  paymentEntries: InvoicePaymentEntryResponse[];
  issuedAt: string;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePaymentEntryResponse {
  id: string;
  invoiceId: string;
  amountCents: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'other';
  reference: string | null;
  notes: string | null;
  receivedAt: string;
  createdAt: string;
}
