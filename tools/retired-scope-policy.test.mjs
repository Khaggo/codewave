import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectRetiredScopeSource } from './retired-scope-policy.mjs';

test('allows current service-management terminology', () => {
  const violations = inspectRetiredScopeSource({
    relativePath: 'mobile/src/screens/bookingAvailabilityModel.mjs',
    source: [
      "const closed = 'Shop closed for this date'",
      "const catalog = 'Service catalog'",
      "const route = '/api/job-orders/:id/invoice-record'",
    ].join('\n'),
  });

  assert.deepEqual(violations, []);
});

test('allows the bounded accessories namespace and naming', () => {
  const violations = inspectRetiredScopeSource({
    relativePath:
      'backend/apps/main-service/src/modules/accessories/catalog/accessories-catalog.controller.ts',
    source: [
      "const catalogRoute = '/api/accessories/catalog'",
      "const inventoryRoute = '/api/accessories/inventory'",
      'const client = accessoriesCatalogClient',
    ].join('\n'),
  });

  assert.deepEqual(violations, []);
});

test('rejects retired ecommerce routes and mobile shop UI keys', () => {
  const violations = inspectRetiredScopeSource({
    relativePath: 'mobile/src/screens/dashboard/styles.js',
    source: [
      "const route = '/api/orders/:id/invoice'",
      'const shopScrollContent = {}',
    ].join('\n'),
  });

  assert.deepEqual(
    violations.map(({ line, rule }) => ({ line, rule })),
    [
      { line: 1, rule: 'retired ecommerce API route' },
      { line: 2, rule: 'retired mobile shop UI' },
    ],
  );
});

test('rejects retired checkout, invoice, category, and customer-order routes', () => {
  const violations = inspectRetiredScopeSource({
    relativePath: 'frontend/src/lib/retired-commerce-routes.js',
    source: [
      "const categoryRoute = '/api/product-categories'",
      "const checkoutRoute = '/api/checkout/invoice'",
      "const invoiceRoute = '/api/invoices/:id'",
      "const customerOrdersRoute = '/api/users/:id/orders'",
    ].join('\n'),
  });

  assert.deepEqual(
    violations.map(({ line, rule }) => ({ line, rule })),
    [
      { line: 1, rule: 'retired ecommerce API route' },
      { line: 2, rule: 'retired ecommerce API route' },
      { line: 3, rule: 'retired ecommerce API route' },
      { line: 4, rule: 'retired ecommerce API route' },
    ],
  );
});

test('rejects known retired ecommerce file paths', () => {
  const violations = inspectRetiredScopeSource({
    relativePath: 'frontend/src/screens/shopProductAdmin/ShopProductAdmin.js',
    source: 'export default function RemovedScreen() {}',
  });

  assert.deepEqual(
    violations.map(({ file, rule }) => ({ file, rule })),
    [
      {
        file: 'frontend/src/screens/shopProductAdmin/ShopProductAdmin.js',
        rule: 'retired ecommerce file',
      },
    ],
  );
});
