import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canRetryAccessoryPayment,
  getUnacknowledgedFitments,
  isAccessoryOrderCancellable,
  isAccessoryOrderingEnabled,
  normalizeAccessoryCart,
  normalizeAccessoryOrderDetail,
  normalizeAccessoryPage,
  normalizeAccessoryProductDetail,
  normalizeCheckoutFitments,
  validateAccessoryCheckoutContact,
} from './accessoriesViewModel.mjs';

test('ordering is enabled only by the authoritative capability flag', () => {
  assert.equal(isAccessoryOrderingEnabled({ orderingEnabled: true }), true);
  assert.equal(isAccessoryOrderingEnabled({ orderingEnabled: false }), false);
  assert.equal(isAccessoryOrderingEnabled({ catalogVisible: true }), false);
  assert.equal(isAccessoryOrderingEnabled(null), false);
});

test('accessory pages remain bounded even when a server returns 500 records', () => {
  const page = normalizeAccessoryPage({
    items: Array.from({ length: 500 }, (_, id) => ({ id })),
    nextCursor: 'v1.next',
  });

  assert.equal(page.items.length, 20);
  assert.equal(page.nextCursor, 'v1.next');
  assert.equal(
    normalizeAccessoryPage({ items: Array.from({ length: 500 }, (_, id) => ({ id })) }, 100).items.length,
    25,
  );
});

test('missing vehicle and failed fitment reads require explicit acknowledgement', () => {
  const cart = {
    selectedVehicleId: null,
    items: [
      { item: { variantId: 'variant-1' } },
      { item: { variantId: 'variant-2' } },
    ],
  };
  const fitments = normalizeCheckoutFitments(cart, [
    { variantId: 'variant-1', status: 'universal' },
  ]);

  assert.deepEqual(fitments, [
    { variantId: 'variant-1', status: 'universal' },
    { variantId: 'variant-2', status: 'unverified' },
  ]);
  assert.deepEqual(
    getUnacknowledgedFitments(fitments, []).map((entry) => entry.variantId),
    ['variant-2'],
  );
  assert.equal(getUnacknowledgedFitments(fitments, ['variant-2']).length, 0);
});

test('null and partial transport records cannot reach accessory renderers', () => {
  const page = normalizeAccessoryPage(
    { items: [null, { product: null }, { product: { id: 'p-1', slug: 'lights' } }] },
    20,
    (row) => Boolean(row?.product?.id && row.product.slug),
  );
  assert.deepEqual(page.items, [{ product: { id: 'p-1', slug: 'lights' } }]);
  assert.equal(normalizeAccessoryCart({ version: 1, items: [null] }), null);
  assert.equal(normalizeAccessoryProductDetail({ product: null, variants: [] }), null);
  assert.equal(normalizeAccessoryOrderDetail({ order: null }), null);
});

test('PayMongo retry is offered only for an actionable pending-payment order', () => {
  assert.equal(canRetryAccessoryPayment({ paymentMethod: 'paymongo', status: 'pending_payment', paymentStatus: 'failed' }), true);
  for (const status of ['payment_exception', 'refund_pending', 'refunded', 'cancelled']) {
    assert.equal(canRetryAccessoryPayment({ paymentMethod: 'paymongo', status, paymentStatus: 'failed' }), false, status);
  }
});

test('checkout contact validation mirrors the required API boundary', () => {
  assert.deepEqual(Object.keys(validateAccessoryCheckoutContact({ name: '', phone: null, email: 'bad' })).sort(), ['email', 'name', 'phone']);
  assert.deepEqual(validateAccessoryCheckoutContact({ name: 'Queue Customer', phone: '09171234567', email: 'queue@example.com' }), {});
});

test('customers can cancel only before preparation or terminal processing', () => {
  assert.equal(isAccessoryOrderCancellable('pending_payment'), true);
  assert.equal(isAccessoryOrderCancellable('reserved'), true);
  assert.equal(isAccessoryOrderCancellable('paid'), true);
  for (const status of [
    'preparing',
    'ready_for_pickup',
    'collected',
    'cancelled',
    'expired',
    'payment_exception',
    'refund_pending',
    'refunded',
  ]) {
    assert.equal(isAccessoryOrderCancellable(status), false, status);
  }
});
