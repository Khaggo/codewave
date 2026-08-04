import { readFileSync } from 'node:fs';
import pg from 'pg';

import {
  actualPublicSchemaFromRows,
  comparePublicSchemas,
  expectedPublicSchemaFromSnapshot,
  formatSchemaDrift,
  hasSchemaDrift,
} from './migration-schema-drift.mjs';
import { resolveLatestMigrationSnapshot } from './migration-snapshot.mjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required for the migration smoke check.');
  process.exit(2);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const snapshot = JSON.parse(
    readFileSync(resolveLatestMigrationSnapshot(process.cwd()), 'utf8'),
  );
  const [{ rows: columnRows }, { rows: migrationRows }] = await Promise.all([
    client.query(`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `),
    client.query(`
      select count(*)::integer as count
      from drizzle.__drizzle_migrations
    `),
  ]);

  const expected = expectedPublicSchemaFromSnapshot(snapshot);
  const actual = actualPublicSchemaFromRows(columnRows);
  const drift = comparePublicSchemas(expected, actual);
  const migrationCount = migrationRows[0]?.count ?? 0;
  if (hasSchemaDrift(drift)) {
    throw new Error(
      `Migration smoke check found schema drift: ${formatSchemaDrift(drift)}.`,
    );
  }
  if (migrationCount < 1) {
    throw new Error('Migration smoke check expected at least one journal row.');
  }
  console.log(
    `Migration smoke check passed: ${actual.size} exact tables, ${migrationCount} migration(s).`,
  );
} finally {
  await client.end();
}
