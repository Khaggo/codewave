type EnvRecord = Record<string, string | undefined>;

const requiredKeys = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'RABBITMQ_URL',
  'RABBITMQ_QUEUE',
] as const;

export const validateEnv = (config: EnvRecord): EnvRecord => {
  for (const key of requiredKeys) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return config;
};
