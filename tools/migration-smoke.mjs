import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required for the migration smoke check.');
  process.exit(2);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const [{ rows: tableRows }, { rows: migrationRows }] = await Promise.all([
    client.query(`
      select count(*)::integer as count
      from information_schema.tables
      where table_schema = 'public'
    `),
    client.query(`
      select count(*)::integer as count
      from drizzle.__drizzle_migrations
    `),
  ]);

  const tableCount = tableRows[0]?.count ?? 0;
  const migrationCount = migrationRows[0]?.count ?? 0;
  if (tableCount < 50 || migrationCount < 1) {
    throw new Error(
      `Migration smoke check expected at least 50 tables and one journal row; got ${tableCount} and ${migrationCount}.`,
    );
  }
  console.log(`Migration smoke check passed: ${tableCount} tables, ${migrationCount} migration(s).`);
} finally {
  await client.end();
}
