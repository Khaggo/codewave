type CorsOriginCheck = {
  origin: string | undefined;
  allowedOrigins: string[];
  env?: string;
};

const STAFF_WEB_PORT = '3002';

export const CUSTOMER_API_CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Idempotency-Key',
  'If-Match',
  'X-Mobile-Success-Url',
  'X-Mobile-Cancel-Url',
];

export const STAFF_API_CORS_ALLOWED_HEADERS = [
  ...CUSTOMER_API_CORS_ALLOWED_HEADERS,
  'X-Work-Claim-Id',
];

const isPrivateIpv4Host = (hostname: string): boolean => {
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  const match = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!match) {
    return false;
  }

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
};

export const isAllowedCorsOrigin = ({
  origin,
  allowedOrigins,
  env = 'development',
}: CorsOriginCheck): boolean => {
  if (!origin || allowedOrigins.includes(origin)) {
    return true;
  }

  if (env.toLowerCase() === 'production') {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);

    return (
      parsedOrigin.protocol === 'http:' &&
      parsedOrigin.port === STAFF_WEB_PORT &&
      isPrivateIpv4Host(parsedOrigin.hostname)
    );
  } catch {
    return false;
  }
};

export const createCorsOriginCallback = ({
  allowedOrigins,
  env = 'development',
}: Pick<CorsOriginCheck, 'allowedOrigins' | 'env'>) => {
  return (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    callback(
      null,
      isAllowedCorsOrigin({
        origin,
        allowedOrigins,
        env,
      }),
    );
  };
};
