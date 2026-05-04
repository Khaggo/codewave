export type AppConfig = {
  env: string;
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
  };
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseUrlOrNull = (value: string | undefined): URL | null => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
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
  const redisUrl = parseUrlOrNull(process.env.REDIS_URL);
  const redisPasswordFromUrl = redisUrl?.password ? decodeURIComponent(redisUrl.password) : undefined;
  const redisUsernameFromUrl = redisUrl?.username ? decodeURIComponent(redisUrl.username) : undefined;

  return {
    env: process.env.NODE_ENV ?? 'development',
    ports: {
      // Railway injects PORT for each running service, so prefer it when present.
      mainService: toNumber(process.env.PORT ?? process.env.MAIN_SERVICE_PORT, 3000),
      ecommerceService: toNumber(process.env.PORT ?? process.env.ECOMMERCE_SERVICE_PORT, 3001),
    },
    cors: {
      origins: toStringArray(process.env.CORS_ORIGINS, [
        'http://localhost:3002',
        'http://127.0.0.1:3002',
      ]),
    },
    database: {
      url: process.env.DATABASE_URL ?? 'postgresql://admin:root@localhost:5433/codewave',
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    redis: {
      host: process.env.REDIS_HOST ?? process.env.REDISHOST ?? redisUrl?.hostname ?? 'localhost',
      port: toNumber(process.env.REDIS_PORT ?? process.env.REDISPORT ?? redisUrl?.port, 6379),
      username:
        process.env.REDIS_USERNAME ??
        process.env.REDISUSER ??
        redisUsernameFromUrl,
      password:
        process.env.REDIS_PASSWORD ??
        process.env.REDISPASSWORD ??
        redisPasswordFromUrl,
    },
    rabbitmq: {
      url: process.env.RABBITMQ_URL?.trim() || undefined,
      queue: process.env.RABBITMQ_QUEUE ?? 'autocare_events',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
    },
    mail: {
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: toNumber(process.env.SMTP_PORT, 465),
      secure: (process.env.SMTP_SECURE ?? 'true').toLowerCase() !== 'false',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM ?? 'AUTOCARE <no-reply@example.com>',
    },
  };
};
