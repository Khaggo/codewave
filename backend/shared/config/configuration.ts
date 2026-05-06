export type AppConfig = {
  env: string;
  auth: {
    bypassCustomerRegistrationOtp: boolean;
  };
  ports: {
    mainService: number;
    ecommerceService: number;
  };
  cors: {
    origins: string[];
  };
  database: {
    url: string;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  redis: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  rabbitmq: {
    url?: string;
    queue: string;
  };
  google: {
    clientId?: string;
  };
  mail: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
    connectionTimeoutMs: number;
    greetingTimeoutMs: number;
    socketTimeoutMs: number;
  };
  payments: {
    paymongoPublicKey?: string;
    paymongoSecretKey?: string;
    paymongoWebhookSecret?: string;
    paymongoCheckoutSuccessUrl?: string;
    paymongoCheckoutCancelUrl?: string;
  };
};

const toDefinedString = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const coalesceString = (...values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    const normalized = toDefinedString(value);
    if (normalized !== undefined) {
      return normalized;
    }
  }

  return undefined;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const normalized = toDefinedString(value);
  if (normalized === undefined) {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseUrlOrNull = (value: string | undefined): URL | null => {
  const normalized = toDefinedString(value);
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized);
  } catch {
    return null;
  }
};

const toStringArray = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  const values = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return values.length ? values : fallback;
};

export default (): AppConfig => {
  const env = coalesceString(process.env.NODE_ENV) ?? 'development';
  const redisUrl = parseUrlOrNull(coalesceString(process.env.REDIS_URL));
  const redisPasswordFromUrl = redisUrl?.password ? decodeURIComponent(redisUrl.password) : undefined;
  const redisUsernameFromUrl = redisUrl?.username ? decodeURIComponent(redisUrl.username) : undefined;
  const defaultRegistrationOtpBypass = env.toLowerCase() === 'production' ? 'true' : 'false';

  return {
    env,
    auth: {
      // Temporary production safety valve while SMTP delivery is unavailable.
      bypassCustomerRegistrationOtp:
        (
          coalesceString(process.env.AUTH_BYPASS_CUSTOMER_REGISTRATION_OTP) ??
          defaultRegistrationOtpBypass
        ).toLowerCase() === 'true',
    },
    ports: {
      // Railway injects PORT for each running service, so prefer it when present.
      mainService: toNumber(coalesceString(process.env.PORT, process.env.MAIN_SERVICE_PORT), 3000),
      ecommerceService: toNumber(coalesceString(process.env.PORT, process.env.ECOMMERCE_SERVICE_PORT), 3001),
    },
    cors: {
      origins: toStringArray(process.env.CORS_ORIGINS, [
        'http://localhost:3002',
        'http://127.0.0.1:3002',
      ]),
    },
    database: {
      url: coalesceString(process.env.DATABASE_URL) ?? 'postgresql://admin:root@localhost:5433/codewave',
    },
    jwt: {
      accessSecret: coalesceString(process.env.JWT_ACCESS_SECRET) ?? 'change-me-access',
      refreshSecret: coalesceString(process.env.JWT_REFRESH_SECRET) ?? 'change-me-refresh',
      accessExpiresIn: coalesceString(process.env.JWT_ACCESS_EXPIRES_IN) ?? '15m',
      refreshExpiresIn: coalesceString(process.env.JWT_REFRESH_EXPIRES_IN) ?? '7d',
    },
    redis: {
      host: coalesceString(process.env.REDIS_HOST, process.env.REDISHOST, redisUrl?.hostname) ?? 'localhost',
      port: toNumber(coalesceString(process.env.REDIS_PORT, process.env.REDISPORT, redisUrl?.port), 6379),
      username:
        coalesceString(process.env.REDIS_USERNAME, process.env.REDISUSER) ??
        redisUsernameFromUrl,
      password:
        coalesceString(process.env.REDIS_PASSWORD, process.env.REDISPASSWORD) ??
        redisPasswordFromUrl,
    },
    rabbitmq: {
      url: coalesceString(process.env.RABBITMQ_URL),
      queue: coalesceString(process.env.RABBITMQ_QUEUE) ?? 'autocare_events',
    },
    google: {
      clientId: coalesceString(process.env.GOOGLE_CLIENT_ID),
    },
    mail: {
      host: coalesceString(process.env.SMTP_HOST) ?? 'smtp.gmail.com',
      port: toNumber(coalesceString(process.env.SMTP_PORT), 465),
      secure: (coalesceString(process.env.SMTP_SECURE) ?? 'true').toLowerCase() !== 'false',
      user: coalesceString(process.env.SMTP_USER),
      pass: coalesceString(process.env.SMTP_PASS),
      from: coalesceString(process.env.SMTP_FROM) ?? 'AUTOCARE <no-reply@example.com>',
      connectionTimeoutMs: toNumber(coalesceString(process.env.SMTP_CONNECTION_TIMEOUT_MS), 10000),
      greetingTimeoutMs: toNumber(coalesceString(process.env.SMTP_GREETING_TIMEOUT_MS), 10000),
      socketTimeoutMs: toNumber(coalesceString(process.env.SMTP_SOCKET_TIMEOUT_MS), 15000),
    },
    payments: {
      paymongoPublicKey: coalesceString(process.env.PAYMONGO_PUBLIC_KEY),
      paymongoSecretKey: coalesceString(process.env.PAYMONGO_SECRET_KEY),
      paymongoWebhookSecret: coalesceString(process.env.PAYMONGO_WEBHOOK_SECRET),
      paymongoCheckoutSuccessUrl: coalesceString(process.env.PAYMONGO_CHECKOUT_SUCCESS_URL),
      paymongoCheckoutCancelUrl: coalesceString(process.env.PAYMONGO_CHECKOUT_CANCEL_URL),
    },
  };
};
