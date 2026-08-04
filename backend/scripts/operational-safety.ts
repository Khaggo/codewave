export type OperationalCommandArgs = {
  execute: boolean;
  allowProduction: boolean;
  reason: string | null;
};

const LOCAL_DATABASE_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function parseOperationalArgs(argv: string[]): OperationalCommandArgs {
  const reasonEntry = argv.find((entry) => entry.startsWith('--reason='));
  return {
    execute: argv.includes('--execute'),
    allowProduction: argv.includes('--allow-production'),
    reason: reasonEntry?.slice('--reason='.length).trim() || null,
  };
}

export function databaseFingerprint(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return 'configured-by-application';
  }

  try {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\/+/, '') || 'unknown';
    return `${parsed.protocol}//${parsed.hostname}:${parsed.port || 'default'}/${databaseName}`;
  } catch {
    return 'invalid-database-url';
  }
}

export function isProductionLikeDatabase(databaseUrl: string | undefined) {
  const environment = [
    process.env.NODE_ENV,
    process.env.RAILWAY_ENVIRONMENT_NAME,
    process.env.RAILWAY_ENVIRONMENT,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (environment.includes('prod')) {
    return true;
  }

  if (!databaseUrl) {
    return false;
  }

  try {
    return !LOCAL_DATABASE_HOSTS.has(new URL(databaseUrl).hostname.toLowerCase());
  } catch {
    return true;
  }
}

export function normalizeSpawnEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  platform = process.platform,
) {
  if (platform !== 'win32') {
    return { ...environment };
  }

  const normalized: NodeJS.ProcessEnv = {};
  const keysByLowercaseName = new Map<string, string>();

  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) continue;
    const lowerKey = key.toLowerCase();
    const existingKey = keysByLowercaseName.get(lowerKey);
    if (!existingKey) {
      const canonicalKey = lowerKey === 'path' ? 'Path' : key;
      keysByLowercaseName.set(lowerKey, canonicalKey);
      normalized[canonicalKey] = value;
      continue;
    }

    if (key === 'Path' || existingKey !== 'Path') {
      normalized[existingKey] = value;
    }
  }

  return normalized;
}

export function assertOperationalSafety({
  command,
  args,
  databaseUrl,
}: {
  command: string;
  args: OperationalCommandArgs;
  databaseUrl: string | undefined;
}) {
  const productionLike = isProductionLikeDatabase(databaseUrl);

  if (args.execute && !args.reason) {
    throw new Error(`${command} requires --reason=<audit-reason> when --execute is used.`);
  }

  if (args.execute && productionLike && !args.allowProduction) {
    throw new Error(
      `${command} targets a production-like database. Add --allow-production after review.`,
    );
  }

  return {
    command,
    mode: args.execute ? 'execute' : 'dry_run',
    database: databaseFingerprint(databaseUrl),
    productionLike,
    reason: args.reason,
  };
}
