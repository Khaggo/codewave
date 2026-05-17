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

  const resendKeys = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'] as const;
  const hasAnyResendValue = resendKeys.some((key) => Boolean(config[key]));
  const missingResendKeys = resendKeys.filter((key) => !config[key]);
  if (hasAnyResendValue && missingResendKeys.length > 0) {
    throw new Error(
      `Missing required Resend environment variables: ${missingResendKeys.join(', ')}`,
    );
  }

  const paymongoKeys = [
    'PAYMONGO_PUBLIC_KEY',
    'PAYMONGO_SECRET_KEY',
    'PAYMONGO_WEBHOOK_SECRET',
    'PAYMONGO_BOOKING_WEBHOOK_SECRET',
    'PAYMONGO_SERVICE_INVOICE_WEBHOOK_SECRET',
    'PAYMONGO_ECOMMERCE_WEBHOOK_SECRET',
    'PAYMONGO_CHECKOUT_SUCCESS_URL',
    'PAYMONGO_CHECKOUT_CANCEL_URL',
  ] as const;
  const hasAnyPaymongoValue = paymongoKeys.some((key) => Boolean(config[key]));
  if (hasAnyPaymongoValue) {
    if (!config.PAYMONGO_SECRET_KEY) {
      throw new Error('Missing required PayMongo environment variable: PAYMONGO_SECRET_KEY');
    }

    if (!config.PAYMONGO_CHECKOUT_SUCCESS_URL || !config.PAYMONGO_CHECKOUT_CANCEL_URL) {
      throw new Error(
        'Missing required PayMongo environment variables: PAYMONGO_CHECKOUT_SUCCESS_URL, PAYMONGO_CHECKOUT_CANCEL_URL',
      );
    }
  }

  if (config.PAYMONGO_WEBHOOK_SECRET && !config.PAYMONGO_SECRET_KEY) {
    throw new Error('PAYMONGO_WEBHOOK_SECRET requires PAYMONGO_SECRET_KEY to be configured');
  }

  const paymongoWebhookKeys = [
    'PAYMONGO_WEBHOOK_SECRET',
    'PAYMONGO_BOOKING_WEBHOOK_SECRET',
    'PAYMONGO_SERVICE_INVOICE_WEBHOOK_SECRET',
    'PAYMONGO_ECOMMERCE_WEBHOOK_SECRET',
  ] as const;

  const hasAnyPaymongoWebhookSecret = paymongoWebhookKeys.some((key) => Boolean(config[key]));
  if (hasAnyPaymongoValue && !hasAnyPaymongoWebhookSecret) {
    throw new Error(
      'Missing required PayMongo webhook secret. Configure PAYMONGO_WEBHOOK_SECRET or the domain-specific PAYMONGO_*_WEBHOOK_SECRET values.',
    );
  }

  return config;
};
