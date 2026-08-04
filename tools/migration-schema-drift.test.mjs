import assert from 'node:assert/strict';
import test from 'node:test';

import {
  actualPublicSchemaFromRows,
  comparePublicSchemas,
  expectedPublicSchemaFromSnapshot,
  formatSchemaDrift,
  hasSchemaDrift,
} from './migration-schema-drift.mjs';

const snapshot = {
  tables: {
    'public.users': {
      name: 'users',
      schema: 'public',
      columns: { id: {}, email: {} },
    },
    'public.vehicles': {
      name: 'vehicles',
      schema: 'public',
      columns: { id: {}, owner_id: {} },
    },
    'internal.audit': {
      name: 'audit',
      schema: 'internal',
      columns: { id: {} },
    },
  },
};

test('accepts an exact public table and column match', () => {
  const expected = expectedPublicSchemaFromSnapshot(snapshot);
  const actual = actualPublicSchemaFromRows([
    { table_name: 'users', column_name: 'id' },
    { table_name: 'users', column_name: 'email' },
    { table_name: 'vehicles', column_name: 'id' },
    { table_name: 'vehicles', column_name: 'owner_id' },
  ]);

  const drift = comparePublicSchemas(expected, actual);

  assert.equal(hasSchemaDrift(drift), false);
  assert.equal(formatSchemaDrift(drift), '');
});

test('reports missing and extra tables', () => {
  const expected = expectedPublicSchemaFromSnapshot(snapshot);
  const actual = actualPublicSchemaFromRows([
    { table_name: 'users', column_name: 'id' },
    { table_name: 'users', column_name: 'email' },
    { table_name: 'retired_orders', column_name: 'id' },
  ]);

  const drift = comparePublicSchemas(expected, actual);

  assert.deepEqual(drift.missingTables, ['vehicles']);
  assert.deepEqual(drift.extraTables, ['retired_orders']);
  assert.equal(hasSchemaDrift(drift), true);
});

test('reports missing and extra columns on known tables', () => {
  const expected = expectedPublicSchemaFromSnapshot(snapshot);
  const actual = actualPublicSchemaFromRows([
    { table_name: 'users', column_name: 'id' },
    { table_name: 'users', column_name: 'legacy_role' },
    { table_name: 'vehicles', column_name: 'id' },
    { table_name: 'vehicles', column_name: 'owner_id' },
  ]);

  const drift = comparePublicSchemas(expected, actual);

  assert.deepEqual(drift.missingColumns, ['users.email']);
  assert.deepEqual(drift.extraColumns, ['users.legacy_role']);
  assert.match(formatSchemaDrift(drift), /missingColumns: users\.email/);
  assert.match(formatSchemaDrift(drift), /extraColumns: users\.legacy_role/);
});
