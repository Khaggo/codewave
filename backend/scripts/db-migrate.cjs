'use strict';

const { resolve } = require('node:path');

const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');

const DEFAULT_DATABASE_URL =
  'postgresql://admin:root@localhost:5433/codewave';
const DEFAULT_MIGRATIONS_FOLDER = resolve(__dirname, '../drizzle');
const MIGRATION_CONTEXT = 'committed drizzle migrations';
const MIGRATION_TIMEOUT_MILLIS = 5_000;
const MAX_DIAGNOSTIC_LENGTH = 240;
const MAX_ERROR_CHAIN_DEPTH = 4;
const REDACTED_SQL_DIAGNOSTIC = '[redacted-sql]';

const SQL_DIAGNOSTIC_PATTERNS = [
  /\b(?:select\s+.+\s+from|insert\s+into|update\s+(?:"[^"]+"|[A-Za-z_][\w$.]*)\s+set|delete\s+from|merge\s+into)\b/i,
  /\b(?:alter|create|drop)\s+(?:table|index|schema|type|extension|function|procedure|trigger|view)\b/i,
  /\b(?:truncate(?:\s+table)?|grant\s+.+\s+on|revoke\s+.+\s+on|copy\s+.+\s+(?:from|to))\b/i,
  /\b(?:call|execute|prepare|explain|vacuum|analyze|comment\s+on)\b/i,
  /\bset\s+(?:local\s+)?[A-Za-z_][\w.]*\s*(?:=|to)\b/i,
  /\bwith\s+(?:recursive\s+)?[A-Za-z_][\w$]*\s+as\s*\(/i,
  /\b(?:from|join)\s+(?:"[^"]+"|[A-Za-z_][\w$.]*)\s+(?:where|join|on|group\s+by|order\s+by|returning)\b/i,
  /\b(?:values|returning)\s*\(/i,
  /\bdo\s+\$\$|\b(?:begin|commit|rollback)\s*;/i,
  /\$\d+\b|(?:^|[\s,(=]):[A-Za-z_][\w$]*/,
  /--[^\r\n]*|\/\*[\s\S]*?\*\//,
];

const SAFE_SEVERITIES = new Set([
  'DEBUG',
  'INFO',
  'NOTICE',
  'WARNING',
  'ERROR',
  'LOG',
  'FATAL',
  'PANIC',
]);

function readErrorField(error, field) {
  if (!error || typeof error !== 'object') return undefined;

  try {
    return error[field];
  } catch {
    return undefined;
  }
}

function sanitizeToken(value, pattern) {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim();
  return pattern.test(normalized) ? normalized : undefined;
}

function sanitizeIdentifier(value) {
  return sanitizeToken(value, /^[A-Za-z_][A-Za-z0-9_$]{0,127}$/);
}

function containsSqlStructure(value) {
  return SQL_DIAGNOSTIC_PATTERNS.some((pattern) => pattern.test(value));
}

function sanitizeDiagnosticText(value) {
  if (typeof value !== 'string') return undefined;

  let sanitized = value.replace(/\s+/g, ' ').trim();
  if (!sanitized) return undefined;
  if (containsSqlStructure(sanitized)) return REDACTED_SQL_DIAGNOSTIC;

  sanitized = sanitized
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi, '[redacted-url]')
    .replace(
      /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
      '[redacted-email]',
    )
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      '[redacted-id]',
    )
    .replace(
      /\b(?:password|passwd|secret|token|api[_-]?key|authorization|cookie|database[_-]?url|url|email|phone|customer|user(?:name)?)\s*[:=]\s*(?:"[^"]*"|'[^']*'|\S+)/gi,
      '$1=[redacted]',
    )
    .replace(
      /\([^()\r\n]{1,120}\)=\([^()\r\n]{0,240}\)/g,
      '([redacted-value])',
    )
    .replace(
      /\b(?:parameters?|values?)\s*[:=]\s*(?:\[[^\]]*\]|\([^)]*\)|\S+)/gi,
      '$1=[redacted]',
    )
    .replace(/'(?:''|[^'])*'/g, '[redacted-literal]')
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[redacted-number]');

  sanitized = sanitized.slice(0, MAX_DIAGNOSTIC_LENGTH).trim();
  return sanitized || undefined;
}

function sanitizeErrorFields(error) {
  const name = sanitizeToken(
    readErrorField(error, 'name'),
    /^[A-Za-z][A-Za-z0-9_. -]{0,63}$/,
  );
  const code = sanitizeToken(
    readErrorField(error, 'code'),
    /^[A-Z0-9_-]{1,16}$/,
  );
  const severityValue = sanitizeToken(
    readErrorField(error, 'severity'),
    /^[A-Za-z]{1,16}$/,
  );
  const severity = severityValue?.toUpperCase();

  return {
    ...(name ? { name } : {}),
    ...(code ? { code } : {}),
    ...(severity && SAFE_SEVERITIES.has(severity) ? { severity } : {}),
    ...(sanitizeIdentifier(readErrorField(error, 'schema'))
      ? { schema: sanitizeIdentifier(readErrorField(error, 'schema')) }
      : {}),
    ...(sanitizeIdentifier(readErrorField(error, 'table'))
      ? { table: sanitizeIdentifier(readErrorField(error, 'table')) }
      : {}),
    ...(sanitizeIdentifier(readErrorField(error, 'column'))
      ? { column: sanitizeIdentifier(readErrorField(error, 'column')) }
      : {}),
    ...(sanitizeIdentifier(readErrorField(error, 'constraint'))
      ? { constraint: sanitizeIdentifier(readErrorField(error, 'constraint')) }
      : {}),
    ...(sanitizeDiagnosticText(readErrorField(error, 'detail'))
      ? { detail: sanitizeDiagnosticText(readErrorField(error, 'detail')) }
      : {}),
    ...(sanitizeDiagnosticText(readErrorField(error, 'hint'))
      ? { hint: sanitizeDiagnosticText(readErrorField(error, 'hint')) }
      : {}),
  };
}

function sanitizeMigrationError(error) {
  const fields = {};
  const visited = new WeakSet();
  let current = error;

  for (let depth = 0; depth < MAX_ERROR_CHAIN_DEPTH; depth += 1) {
    if (!current || typeof current !== 'object') break;
    if (visited.has(current)) break;

    visited.add(current);
    Object.assign(fields, sanitizeErrorFields(current));
    current = readErrorField(current, 'cause');
  }

  return { ...fields, migration: MIGRATION_CONTEXT };
}

function formatMigrationFailure(failure) {
  return JSON.stringify({ event: 'database_migration_failed', ...failure });
}

async function runMigrations(dependencies = {}) {
  const logger = dependencies.logger ?? console;
  const databaseUrl =
    dependencies.databaseUrl ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const migrationsFolder =
    dependencies.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER;
  const createPool =
    dependencies.createPool ?? ((config) => new Pool(config));
  const createDatabase =
    dependencies.createDatabase ?? ((pool) => drizzle(pool));
  const applyMigrations =
    dependencies.applyMigrations ??
    ((database, config) => migrate(database, config));

  let pool;
  let failure;

  try {
    pool = createPool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: MIGRATION_TIMEOUT_MILLIS,
    });
    const database = createDatabase(pool);
    await applyMigrations(database, { migrationsFolder });
  } catch (error) {
    failure = error;
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (error) {
        failure ??= error;
      }
    }
  }

  if (failure) {
    const sanitizedFailure = sanitizeMigrationError(failure);
    logger.error(formatMigrationFailure(sanitizedFailure));
    return { ok: false, failure: sanitizedFailure };
  }

  logger.log(
    JSON.stringify({
      event: 'database_migration_succeeded',
      migration: MIGRATION_CONTEXT,
    }),
  );
  return { ok: true };
}

async function main(dependencies = {}) {
  const result = await runMigrations(dependencies);
  return result.ok ? 0 : 1;
}

module.exports = {
  formatMigrationFailure,
  main,
  runMigrations,
  sanitizeMigrationError,
};

if (require.main === module) {
  void main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
