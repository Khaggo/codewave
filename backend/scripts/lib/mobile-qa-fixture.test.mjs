import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  assertLocalMobileQaFixtureSafety,
  getStableFixtureIdentifiers,
} = require('./mobile-qa-fixture.cjs');

test('mobile QA fixture refuses production and public database targets', () => {
  assert.throws(
    () => assertLocalMobileQaFixtureSafety({
      nodeEnv: 'production',
      databaseUrl: 'postgres://user:secret@localhost:5432/autocare',
      execute: true,
    }),
    /NODE_ENV=test or NODE_ENV=development/,
  );
  assert.throws(
    () => assertLocalMobileQaFixtureSafety({
      nodeEnv: 'test',
      databaseUrl: 'postgres://user:secret@containers-us-west.railway.app:5432/autocare',
      execute: true,
    }),
    /refuses non-local/,
  );
});

test('mobile QA fixture accepts loopback and known container-local hosts', () => {
  for (const host of ['localhost', '127.0.0.1', 'postgres', 'db']) {
    assert.equal(
      assertLocalMobileQaFixtureSafety({
        nodeEnv: 'development',
        databaseUrl: `postgres://user:secret@${host}:5432/autocare`,
        execute: false,
      }).mode,
      'dry_run',
    );
  }
});

test('mobile QA identifiers are stable, normalized, unique, and visibly QA-only', () => {
  const first = getStableFixtureIdentifiers(' QA.Customer@Example.com ');
  const second = getStableFixtureIdentifiers('qa.customer@example.com');

  assert.deepEqual(first, second);
  assert.equal(first.vehiclePlates.length, 3);
  assert.equal(new Set(first.bookingReferences).size, 12);
  assert.equal(new Set(first.accessoryProducts.map((item) => item.sku)).size, 2);
  assert.ok(first.accessoryProducts.every((item) => item.name.startsWith('QA')));
  assert.ok(first.accessoryProducts.every((item) => item.sku.startsWith('QA-')));
});
