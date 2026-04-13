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

  const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;
  const hasAnySmtpValue = smtpKeys.some((key) => Boolean(config[key]));
  const missingSmtpKeys = smtpKeys.filter((key) => !config[key]);
  if (hasAnySmtpValue && missingSmtpKeys.length > 0) {
    throw new Error(
      `Missing required SMTP environment variables: ${missingSmtpKeys.join(', ')}`,
    );
  }

  return config;
};
