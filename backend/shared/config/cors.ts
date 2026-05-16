type CorsOriginCheck = {
  origin: string | undefined;
  allowedOrigins: string[];
  env?: string;
};

const STAFF_WEB_PORT = '3002';

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
