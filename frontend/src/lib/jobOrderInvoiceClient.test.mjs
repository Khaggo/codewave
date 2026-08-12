import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  exportJobOrderInvoicePdf,
  getJobOrderInvoiceLookup,
  normalizeJobOrderInvoicePaymentMethod,
  reconcileJobOrderInvoicePaymongoCheckout,
  recordJobOrderInvoicePayment,
  startJobOrderInvoicePaymongoCheckout,
} from './jobOrderInvoiceClient.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

test('invoice lookup falls back to the Job Order detail route on a missing snapshot route', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) {
      return jsonResponse({ message: 'Not found' }, 404);
    }
    return jsonResponse({
      id: 'jo-1',
      invoice_record: {
        status: 'unpaid',
      },
    });
  };

  const result = await getJobOrderInvoiceLookup({
    jobOrderId: 'jo-1',
    accessToken: 'token-1',
  });

  assert.deepEqual(
    calls.map(({ url }) => url),
    [
      'http://127.0.0.1:3000/api/job-orders/jo-1/invoice-record',
      'http://127.0.0.1:3000/api/job-orders/jo-1',
    ],
  );
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-1');
  assert.deepEqual(result.invoiceRecord, {
    status: 'unpaid',
  });
});

test('recording invoice payment sends normalized cents and optional metadata', async () => {
  let request = null;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return jsonResponse({
      id: 'jo-2',
      status: 'finalized',
    });
  };

  const result = await recordJobOrderInvoicePayment({
    jobOrderId: 'jo-2',
    amountPaid: '1250',
    paymentMethod: 'cash',
    reference: '  OR-101  ',
    receivedAt: '2026-08-02T00:00:00+08:00',
    expectedUpdatedAt: ' 2026-08-01T10:00:00.000Z ',
    accessToken: 'token-2',
  });

  assert.equal(
    request.url,
    'http://127.0.0.1:3000/api/job-orders/jo-2/invoice/payments',
  );
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer token-2');
  assert.deepEqual(JSON.parse(request.options.body), {
    amountPaidCents: 125000,
    paymentMethod: 'cash',
    reference: 'OR-101',
    receivedAt: '2026-08-01T16:00:00.000Z',
    expectedUpdatedAt: '2026-08-01T10:00:00.000Z',
  });
  assert.equal(result.id, 'jo-2');
});

test('invoice payment aliases normalize before submission and loading', async () => {
  assert.equal(normalizeJobOrderInvoicePaymentMethod('bank-transfer'), 'bank_transfer');
  assert.equal(normalizeJobOrderInvoicePaymentMethod('cheque'), 'check');

  let request = null;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return jsonResponse({ id: 'jo-alias', status: 'finalized' });
  };

  await recordJobOrderInvoicePayment({
    jobOrderId: 'jo-alias',
    amountPaid: '1250',
    paymentMethod: 'bank-transfer',
    accessToken: 'token-alias',
  });

  assert.equal(JSON.parse(request.options.body).paymentMethod, 'bank_transfer');
});

test('invoice PDF export returns a blob and validates missing Job Order context', async () => {
  await assert.rejects(
    exportJobOrderInvoicePdf({
      jobOrderId: '',
      accessToken: 'token-3',
    }),
    (error) =>
      error?.status === 400 &&
      error?.details?.path === '/api/job-orders/:id/invoice/pdf',
  );

  globalThis.fetch = async () =>
    new Response('invoice-pdf', {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
      },
    });

  const blob = await exportJobOrderInvoicePdf({
    jobOrderId: 'jo-3',
    accessToken: 'token-3',
  });

  assert.equal(await blob.text(), 'invoice-pdf');
});

test('PayMongo start and reconcile use their distinct Job Order routes', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({
      id: 'jo-4',
      status: 'finalized',
    });
  };

  await startJobOrderInvoicePaymongoCheckout({
    jobOrderId: 'jo-4',
    accessToken: 'token-4',
  });
  await reconcileJobOrderInvoicePaymongoCheckout({
    jobOrderId: 'jo-4',
    accessToken: 'token-4',
  });

  assert.deepEqual(
    calls.map(({ url, options }) => ({
      method: options.method,
      url,
    })),
    [
      {
        method: 'POST',
        url: 'http://127.0.0.1:3000/api/job-orders/jo-4/invoice/paymongo/checkout',
      },
      {
        method: 'POST',
        url: 'http://127.0.0.1:3000/api/job-orders/jo-4/invoice/paymongo/reconcile',
      },
    ],
  );
});
