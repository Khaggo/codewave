import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const execute = process.argv.includes('--execute');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');
const databaseUrl = new URL(connectionString);
if (!['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname)) {
  throw new Error('Refusing to adopt the migration baseline on a non-local database.');
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const journal = JSON.parse(
  readFileSync(path.join(root, 'drizzle', 'meta', '_journal.json'), 'utf8'),
);
const baseline = journal.entries?.find((entry) => entry.idx === 0);
if (!baseline || baseline.tag !== '0000_service_baseline') {
  throw new Error('The approved 0000_service_baseline journal entry is missing.');
}
const baselineSql = readFileSync(path.join(root, 'drizzle', '0000_service_baseline.sql'));
const baselineHash = createHash('sha256').update(baselineSql).digest('hex');

const main = async () => {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const { rows: accessoryRows } = await client.query(
      `select to_regclass('public.accessory_products') as table_name`,
    );
    const { rows: tableRows } = await client.query(`
      select count(*)::integer as count
      from information_schema.tables
      where table_schema = 'public'
    `);
    const { rows: existingRows } = await client.query(
      'select id from drizzle.__drizzle_migrations where created_at = $1 limit 1',
      [String(baseline.when)],
    );
    if (accessoryRows[0]?.table_name) {
      throw new Error('Accessories tables already exist; baseline adoption is not applicable.');
    }
    if ((tableRows[0]?.count ?? 0) !== 58) {
      throw new Error('Local database no longer matches the previously verified 58-table baseline.');
    }
    if (existingRows.length) {
      console.log('Local service baseline is already present in migration history.');
    } else if (!execute) {
      console.log(`Dry run: would adopt ${baseline.tag} (${baselineHash}) at ${baseline.when}.`);
    } else {
      await client.query('begin');
      try {
        await client.query(
          'insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)',
          [baselineHash, String(baseline.when)],
        );
        await client.query('commit');
        console.log('Local service baseline adopted safely.');
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
};

await main();
