import type { ApiErrorResponse } from '../shared';

export const invoicePaymentErrorCases: Record<string, ApiErrorResponse[]> = {
  getInvoiceById: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Invoice not found.',
      source: 'swagger',
    },
  ],
  getOrderInvoice: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Invoice not found.',
      source: 'swagger',
    },
  ],
  createInvoicePaymentEntry: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Invoice not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Payment entry exceeds balance or the invoice can no longer accept manual entries.',
      source: 'swagger',
    },
  ],
  updateInvoiceStatus: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Invoice not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'The requested manual invoice status is not allowed.',
      source: 'swagger',
    },
  ],
};
