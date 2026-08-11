import type { Pool } from 'pg';

import {
  formatMigrationFailure,
  main,
  runMigrations,
  sanitizeMigrationError,
} from './db-migrate';

function createPoolDouble() {
  return {
    end: jest.fn().mockResolvedValue(undefined),
  } as unknown as Pool;
}

function createLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
  };
}

describe('database migration runner', () => {
  it('applies committed migrations and reports success', async () => {
    const pool = createPoolDouble();
    const database = {} as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>;
    const logger = createLogger();
    const applyMigrations = jest.fn().mockResolvedValue(undefined);

    await expect(
      runMigrations({
        databaseUrl: 'postgresql://admin:secret@localhost:5433/codewave',
        migrationsFolder: 'drizzle',
        logger,
        createPool: jest.fn(() => pool),
        createDatabase: jest.fn(() => database),
        applyMigrations,
      }),
    ).resolves.toEqual({ ok: true });

    expect(applyMigrations).toHaveBeenCalledWith(database, {
      migrationsFolder: 'drizzle',
    });
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.log.mock.calls[0][0]).not.toContain('secret');
  });

  it('returns a nonzero result and sanitized diagnostics on migration failure', async () => {
    const pool = createPoolDouble();
    const logger = createLogger();
    const migrationError = Object.assign(new Error('raw SQL and secret=hidden'), {
      name: 'PostgresError',
      code: '23505',
      severity: 'ERROR',
      schema: 'public',
      table: 'customers',
      column: 'email',
      constraint: 'customers_email_key',
      detail: 'Key (email)=(customer@example.com) already exists.',
      hint: 'See https://admin:secret@example.test/docs for details.',
    });

    const result = await runMigrations({
      logger,
      createPool: jest.fn(() => pool),
      createDatabase: jest.fn(() => ({} as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>)),
      applyMigrations: jest.fn().mockRejectedValue(migrationError),
    });

    expect(result.ok).toBe(false);
    expect(await main({
      logger: createLogger(),
      createPool: jest.fn(() => createPoolDouble()),
      createDatabase: jest.fn(() => ({} as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>)),
      applyMigrations: jest.fn().mockRejectedValue(migrationError),
    })).toBe(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);

    const logLine = logger.error.mock.calls[0][0] as string;
    expect(logLine).toContain('23505');
    expect(logLine).toContain('customers_email_key');
    expect(logLine).not.toContain('customer@example.com');
    expect(logLine).not.toContain('admin:secret');
    expect(logLine).not.toContain('raw SQL');
  });

  it('keeps only safe PostgreSQL fields and redacts sensitive diagnostic values', () => {
    const failure = sanitizeMigrationError({
      name: 'PostgresError',
      code: '23505',
      severity: 'ERROR',
      schema: 'public',
      table: 'customers',
      detail: 'Key (email)=(customer@example.com) password=secret',
      hint: 'Use postgresql://admin:secret@example.test/db or token=abc123',
      message: 'INSERT INTO customers VALUES ($1, secret)',
    });

    const serialized = formatMigrationFailure(failure);
    expect(failure).toMatchObject({
      name: 'PostgresError',
      code: '23505',
      severity: 'ERROR',
      schema: 'public',
      table: 'customers',
      migration: 'committed drizzle migrations',
    });
    expect(serialized).not.toContain('customer@example.com');
    expect(serialized).not.toContain('postgresql://');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('INSERT INTO');
    expect(serialized).not.toContain('message');
  });

  it.each([
    'Query failed: SELECT email, password FROM customers WHERE email = $1',
    'Migration hint: ALTER TABLE customers DROP COLUMN password;',
    'WITH exposed AS (SELECT * FROM customers) SELECT * FROM exposed',
    'Retry with VALUES (:customer_email)',
  ])('suppresses SQL-shaped diagnostic text: %s', (diagnostic) => {
    const failure = sanitizeMigrationError({
      code: '23505',
      severity: 'ERROR',
      table: 'customers',
      detail: diagnostic,
      hint: `Do not execute ${diagnostic}`,
    });

    expect(failure).toMatchObject({
      code: '23505',
      severity: 'ERROR',
      table: 'customers',
      detail: '[redacted-sql]',
      hint: '[redacted-sql]',
    });

    const serialized = formatMigrationFailure(failure);
    expect(serialized).not.toContain('SELECT');
    expect(serialized).not.toContain('ALTER TABLE');
    expect(serialized).not.toContain('$1');
    expect(serialized).not.toContain(':customer_email');
    expect(serialized).not.toContain('password');
  });

  it('uses only allowlisted sanitized fields from nested PostgreSQL causes', () => {
    const postgresCause = {
      name: 'DatabaseError',
      code: '42P01',
      severity: 'ERROR',
      schema: 'public',
      table: 'missing_relation',
      detail: 'Relation missing_relation does not exist.',
      query: 'SELECT * FROM private_customer_data WHERE email = $1',
      parameters: ['customer@example.com'],
      message: 'postgresql://admin:secret@example.test/database',
    };
    const wrapper = Object.assign(new Error('unsafe wrapper message'), {
      cause: postgresCause,
      hint: 'Review the committed migration ordering.',
    });

    const failure = sanitizeMigrationError(wrapper);
    expect(failure).toMatchObject({
      name: 'DatabaseError',
      code: '42P01',
      severity: 'ERROR',
      schema: 'public',
      table: 'missing_relation',
      detail: 'Relation missing_relation does not exist.',
      hint: 'Review the committed migration ordering.',
    });

    const serialized = formatMigrationFailure(failure);
    expect(serialized).not.toContain('private_customer_data');
    expect(serialized).not.toContain('customer@example.com');
    expect(serialized).not.toContain('admin:secret');
    expect(serialized).not.toContain('query');
    expect(serialized).not.toContain('parameters');
    expect(serialized).not.toContain('message');
  });

  it('bounds cause traversal and tolerates cycles and throwing accessors', () => {
    const cyclic: { code: string; cause?: unknown } = { code: '42P01' };
    cyclic.cause = cyclic;
    expect(sanitizeMigrationError(cyclic)).toMatchObject({ code: '42P01' });

    let tooDeep: unknown = { code: '23505', table: 'beyond_depth_limit' };
    for (let depth = 0; depth < 8; depth += 1) {
      tooDeep = { cause: tooDeep };
    }
    expect(sanitizeMigrationError(tooDeep)).toEqual({
      migration: 'committed drizzle migrations',
    });

    const hostileCause = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(hostileCause, 'cause', {
      get() {
        throw new Error('secret cause getter');
      },
    });
    expect(sanitizeMigrationError(hostileCause)).toEqual({
      migration: 'committed drizzle migrations',
    });
  });

  it('closes the pool when cleanup itself fails after a migration failure', async () => {
    const pool = createPoolDouble();
    const logger = createLogger();
    const migrationError = Object.assign(new Error('migration failed'), {
      code: '42P01',
      severity: 'ERROR',
    });
    (pool.end as jest.Mock).mockRejectedValueOnce(new Error('cleanup secret=hidden'));

    const result = await runMigrations({
      logger,
      createPool: jest.fn(() => pool),
      createDatabase: jest.fn(() => ({} as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>)),
      applyMigrations: jest.fn().mockRejectedValue(migrationError),
    });

    expect(result).toMatchObject({ ok: false });
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).not.toContain('cleanup secret');
  });
});
