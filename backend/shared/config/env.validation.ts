type EnvRecord = Record<string, string | undefined>;

const requiredKeys = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

export const validateEnv = (config: EnvRecord): EnvRecord => {
  for (const key of requiredKeys) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (config.RABBITMQ_QUEUE && !config.RABBITMQ_URL) {
    throw new Error('Missing required environment variable: RABBITMQ_URL');
  }

  const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;
  const hasAnySmtpValue = smtpKeys.some((key) => Boolean(config[key]));
  const missingSmtpKeys = smtpKeys.filter((key) => !config[key]);
  if (hasAnySmtpValue && missingSmtpKeys.length > 0) {
    throw new Error(
      `Missing required SMTP environment variables: ${missingSmtpKeys.join(', ')}`,
    );
  }

  const paymongoKeys = [
    'PAYMONGO_PUBLIC_KEY',
    'PAYMONGO_SECRET_KEY',
    'PAYMONGO_WEBHOOK_SECRET',
    'PAYMONGO_CHECKOUT_SUCCESS_URL',
    'PAYMONGO_CHECKOUT_CANCEL_URL',
  ] as const;
  const hasAnyPaymongoValue = paymongoKeys.some((key) => Boolean(config[key]));
  if (hasAnyPaymongoValue && !config.PAYMONGO_SECRET_KEY) {
    throw new Error('Missing required PayMongo environment variable: PAYMONGO_SECRET_KEY');
  }

  if (config.PAYMONGO_WEBHOOK_SECRET && !config.PAYMONGO_SECRET_KEY) {
    throw new Error('PAYMONGO_WEBHOOK_SECRET requires PAYMONGO_SECRET_KEY to be configured');
  }

  return config;
};
