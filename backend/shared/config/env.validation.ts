type EnvRecord = Record<string, string | undefined>;

const requiredKeys = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

const productionSecretKeys = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;
const insecureSecretValues = new Set([
  'change-me-access',
  'change-me-refresh',
  'secret',
  'password',
]);
const accessoryCommerceModes = new Set([
  'off',
  'staff_preview',
  'catalog',
  'ordering',
]);

export const validateEnv = (config: EnvRecord): EnvRecord => {
  for (const key of requiredKeys) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const isProduction = config.NODE_ENV?.trim().toLowerCase() === 'production';
  const accessoryCommerceMode = config.ACCESSORY_COMMERCE_MODE?.trim().toLowerCase();
  if (!accessoryCommerceMode) {
    if (isProduction) {
      throw new Error(
        'Missing required environment variable: ACCESSORY_COMMERCE_MODE',
      );
    }
    config.ACCESSORY_COMMERCE_MODE = 'off';
  } else if (!accessoryCommerceModes.has(accessoryCommerceMode)) {
    throw new Error(
      'ACCESSORY_COMMERCE_MODE must be off, staff_preview, catalog, or ordering',
    );
  } else {
    config.ACCESSORY_COMMERCE_MODE = accessoryCommerceMode;
  }

  const accessoryMediaDriver =
    config.ACCESSORY_MEDIA_DRIVER?.trim().toLowerCase() || 'local';
  if (!['local', 's3'].includes(accessoryMediaDriver)) {
    throw new Error('ACCESSORY_MEDIA_DRIVER must be local or s3');
  }
  config.ACCESSORY_MEDIA_DRIVER = accessoryMediaDriver;

  if (
    isProduction &&
    ['catalog', 'ordering'].includes(config.ACCESSORY_COMMERCE_MODE) &&
    accessoryMediaDriver !== 's3'
  ) {
    throw new Error(
      'Production Accessories catalog or ordering mode requires ACCESSORY_MEDIA_DRIVER=s3',
    );
  }

  if (isProduction && accessoryMediaDriver === 's3') {
    for (const key of [
      'ACCESSORY_MEDIA_S3_ENDPOINT',
      'ACCESSORY_MEDIA_S3_REGION',
      'ACCESSORY_MEDIA_S3_BUCKET',
      'ACCESSORY_MEDIA_S3_ACCESS_KEY_ID',
      'ACCESSORY_MEDIA_S3_SECRET_ACCESS_KEY',
    ] as const) {
      if (!config[key]?.trim()) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
  }

  if (isProduction && config.ACCESSORY_COMMERCE_MODE === 'ordering') {
    for (const key of [
      'ACCESSORY_PAYMONGO_WEBHOOK_SECRET',
      'ACCESSORY_PAYMONGO_CHECKOUT_SUCCESS_URL',
      'ACCESSORY_PAYMONGO_CHECKOUT_CANCEL_URL',
      'ACCESSORY_PAYMONGO_LIVEMODE',
    ] as const) {
      if (!config[key]?.trim()) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
    if (!['true', 'false'].includes(config.ACCESSORY_PAYMONGO_LIVEMODE!.trim().toLowerCase())) {
      throw new Error('ACCESSORY_PAYMONGO_LIVEMODE must be true or false');
    }
  }

  for (const key of ['STAFF_WORK_JOB_ORDER_CAPACITY', 'STAFF_WORK_QA_CAPACITY'] as const) {
    const rawValue = config[key]?.trim();
    if (!rawValue) continue;
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      throw new Error(`${key} must be an integer between 1 and 100`);
    }
  }

  if (isProduction) {
    const claimEnforcementMode = config.STAFF_WORK_CLAIM_ENFORCEMENT?.trim().toLowerCase();
    if (!claimEnforcementMode) {
      throw new Error(
        'Missing required environment variable: STAFF_WORK_CLAIM_ENFORCEMENT',
      );
    }
    if (!['observe', 'strict'].includes(claimEnforcementMode)) {
      throw new Error(
        'STAFF_WORK_CLAIM_ENFORCEMENT must be observe or strict in production',
      );
    }

    for (const key of productionSecretKeys) {
      const value = config[key]?.trim() ?? '';
      if (value.length < 32 || insecureSecretValues.has(value.toLowerCase())) {
        throw new Error(`${key} must be a non-placeholder secret of at least 32 characters in production`);
      }
    }

    if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
      throw new Error('JWT access and refresh secrets must be different in production');
    }

    if (config.AUTH_BYPASS_CUSTOMER_REGISTRATION_OTP?.trim().toLowerCase() === 'true') {
      throw new Error('Customer registration OTP bypass cannot be enabled in production');
    }

    const databaseUrl = new URL(config.DATABASE_URL as string);
    if (['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname.toLowerCase())) {
      throw new Error('DATABASE_URL cannot target localhost in production');
    }

    const corsOrigins = config.CORS_ORIGINS?.split(',').map((entry) => entry.trim()).filter(Boolean);
    if (!corsOrigins?.length || corsOrigins.includes('*')) {
      throw new Error('CORS_ORIGINS must contain explicit trusted origins in production');
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
  ] as const;

  const hasAnyPaymongoWebhookSecret = paymongoWebhookKeys.some((key) => Boolean(config[key]));
  if (hasAnyPaymongoValue && !hasAnyPaymongoWebhookSecret) {
    throw new Error(
      'Missing required PayMongo webhook secret. Configure PAYMONGO_WEBHOOK_SECRET or the domain-specific PAYMONGO_*_WEBHOOK_SECRET values.',
    );
  }

  const openRouterKeys = ['OPENROUTER_API_KEY', 'OPENROUTER_MODEL'] as const;
  const hasAnyOpenRouterValue = openRouterKeys.some((key) => Boolean(config[key]));
  const missingOpenRouterKeys = openRouterKeys.filter((key) => !config[key]);
  if (hasAnyOpenRouterValue && missingOpenRouterKeys.length > 0) {
    throw new Error(
      `Missing required OpenRouter environment variables: ${missingOpenRouterKeys.join(', ')}`,
    );
  }

  return config;
};
