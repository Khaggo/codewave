const normalized = (value: string | undefined) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const resolveRedisUrlFromProcessEnv = () =>
  normalized(process.env.REDIS_URL) ??
  normalized(process.env.REDIS_PRIVATE_URL) ??
  normalized(process.env.REDIS_PUBLIC_URL) ??
  normalized(process.env.REDIS_TLS_URL);

export const hasRedisRuntimeConfig = () =>
  Boolean(
    resolveRedisUrlFromProcessEnv() ??
      normalized(process.env.REDIS_HOST) ??
      normalized(process.env.REDISHOST),
  );
