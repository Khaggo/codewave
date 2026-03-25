export type AppConfig = {
  env: string;
  ports: {
    mainService: number;
    ecommerceService: number;
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
  };
  rabbitmq: {
    url: string;
    queue: string;
  };
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  ports: {
    mainService: toNumber(process.env.MAIN_SERVICE_PORT, 3000),
    ecommerceService: toNumber(process.env.ECOMMERCE_SERVICE_PORT, 3001),
  },
  database: {
    url: process.env.DATABASE_URL ?? 'postgresql://admin:root@localhost:5432/codewave',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: toNumber(process.env.REDIS_PORT, 6379),
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    queue: process.env.RABBITMQ_QUEUE ?? 'autocare_events',
  },
});
