'use strict';

const { resolve } = require('node:path');

const DEFAULT_MIGRATIONS_FOLDER = resolve(__dirname, '../drizzle');
const MIGRATION_CONTEXT = 'committed drizzle migrations';
const STARTUP_MARKER = JSON.stringify({
  event: 'database_migration_runner_started',
});
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

const CONNECTION_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'ETIMEDOUT',
  '28P01',
  '28000',
  '3D000',
  '53300',
  '57P03',
]);

function toDefinedString(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function isProductionRuntime(environment) {
  return (
    toDefinedString(environment.NODE_ENV)?.toLowerCase() === 'production' ||
    toDefinedString(environment.npm_config_production)?.toLowerCase() ===
      'true' ||
    Boolean(toDefinedString(environment.RAILWAY_ENVIRONMENT_ID))
  );
}

function createRunnerError(runnerCode) {
  const error = new Error();
  error.name = 'MigrationRunnerError';
  error.runnerCode = runnerCode;
  return error;
}

function resolveDatabaseUrl(explicitDatabaseUrl, environment) {
  const databaseUrl =
    toDefinedString(explicitDatabaseUrl) ??
    toDefinedString(environment.DATABASE_URL);
  const production = isProductionRuntime(environment);

  if (!databaseUrl) {
    throw createRunnerError('MIGRATION_CONFIG_MISSING');
  }

  try {
    const parsed = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      throw createRunnerError('MIGRATION_CONFIG_INVALID');
    }
    if (
      production &&
      ['localhost', '127.0.0.1', '::1'].includes(
        parsed.hostname.toLowerCase(),
      )
    ) {
      throw createRunnerError('MIGRATION_CONFIG_INVALID');
    }
  } catch (error) {
    if (readErrorField(error, 'runnerCode')) throw error;
    throw createRunnerError('MIGRATION_CONFIG_INVALID');
  }

  return databaseUrl;
}

function loadRuntimeModules() {
  const { drizzle } = require('drizzle-orm/node-postgres');
  const { migrate } = require('drizzle-orm/node-postgres/migrator');
  const { Pool } = require('pg');
  return { drizzle, migrate, Pool };
}

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

function classifyFailure(error, stage) {
  const sanitized = sanitizeMigrationError(error);
  const explicitRunnerCode = sanitizeToken(
    readErrorField(error, 'runnerCode'),
    /^[A-Z0-9_]{1,64}$/,
  );

  if (explicitRunnerCode) {
    return { ...sanitized, runner_code: explicitRunnerCode, stage };
  }
  if (stage === 'module-load') {
    return {
      ...sanitized,
      runner_code: 'MIGRATION_MODULE_LOAD_FAILED',
      stage,
    };
  }
  if (
    stage === 'connection' ||
    CONNECTION_ERROR_CODES.has(sanitized.code) ||
    sanitized.code?.startsWith('08')
  ) {
    return {
      ...sanitized,
      runner_code: 'MIGRATION_CONNECTION_FAILED',
      stage: 'connection',
    };
  }
  if (stage === 'cleanup') {
    return {
      ...sanitized,
      runner_code: 'MIGRATION_CLEANUP_FAILED',
      stage,
    };
  }
  return {
    ...sanitized,
    runner_code: 'MIGRATION_APPLY_FAILED',
    stage: 'migration',
  };
}

async function runMigrations(dependencies = {}) {
  const logger = dependencies.logger ?? console;
  const environment = dependencies.environment ?? process.env;
  const migrationsFolder =
    dependencies.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER;

  let pool;
  let failure;
  let stage = 'configuration';

  try {
    const databaseUrl = resolveDatabaseUrl(
      dependencies.databaseUrl,
      environment,
    );
    stage = 'module-load';
    const runtime =
      dependencies.createPool &&
      dependencies.createDatabase &&
      dependencies.applyMigrations
        ? {}
        : (dependencies.loadRuntimeModules ?? loadRuntimeModules)();
    const createPool =
      dependencies.createPool ??
      ((config) => new runtime.Pool(config));
    const createDatabase =
      dependencies.createDatabase ??
      ((createdPool) => runtime.drizzle(createdPool));
    const applyMigrations =
      dependencies.applyMigrations ??
      ((database, config) => runtime.migrate(database, config));

    stage = 'connection';
    pool = createPool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: MIGRATION_TIMEOUT_MILLIS,
    });
    const database = createDatabase(pool);
    stage = 'migration';
    await applyMigrations(database, { migrationsFolder });
  } catch (error) {
    failure = { error, stage };
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (error) {
        failure ??= { error, stage: 'cleanup' };
      }
    }
  }

  if (failure) {
    const sanitizedFailure = classifyFailure(failure.error, failure.stage);
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
  classifyFailure,
  formatMigrationFailure,
  loadRuntimeModules,
  main,
  resolveDatabaseUrl,
  runMigrations,
  sanitizeMigrationError,
};

if (require.main === module) {
  console.log(STARTUP_MARKER);
  void main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(
        formatMigrationFailure({
          ...sanitizeMigrationError(error),
          runner_code: 'MIGRATION_UNHANDLED_FAILURE',
          stage: 'runtime',
        }),
      );
      process.exitCode = 1;
    });
}
