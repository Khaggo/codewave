import {
  CUSTOMER_API_CORS_ALLOWED_HEADERS,
  createCorsOriginCallback,
  isAllowedCorsOrigin,
  STAFF_API_CORS_ALLOWED_HEADERS,
} from './cors';

describe('CUSTOMER_API_CORS_ALLOWED_HEADERS', () => {
  it('allows the mobile checkout return URL headers used by customer flows', () => {
    expect(CUSTOMER_API_CORS_ALLOWED_HEADERS).toEqual(
      expect.arrayContaining([
        'Idempotency-Key',
        'If-Match',
        'X-Mobile-Success-Url',
        'X-Mobile-Cancel-Url',
      ]),
    );
  });
});

describe('STAFF_API_CORS_ALLOWED_HEADERS', () => {
  it('allows the work claim and optimistic-concurrency headers used by staff workflows', () => {
    expect(STAFF_API_CORS_ALLOWED_HEADERS).toEqual(
      expect.arrayContaining([
        'X-Mobile-Success-Url',
        'X-Mobile-Cancel-Url',
        'X-Work-Claim-Id',
        'If-Match',
      ]),
    );
  });
});

describe('isAllowedCorsOrigin', () => {
  it('allows localhost and private LAN staff web origins during development', () => {
    expect(
      isAllowedCorsOrigin({
        origin: 'http://localhost:3002',
        allowedOrigins: ['http://localhost:3002', 'http://127.0.0.1:3002'],
        env: 'development',
      }),
    ).toBe(true);

    expect(
      isAllowedCorsOrigin({
        origin: 'http://192.168.100.119:3002',
        allowedOrigins: ['http://localhost:3002', 'http://127.0.0.1:3002'],
        env: 'development',
      }),
    ).toBe(true);
  });

  it('rejects private LAN origins in production unless they are explicitly configured', () => {
    expect(
      isAllowedCorsOrigin({
        origin: 'http://192.168.100.119:3002',
        allowedOrigins: ['http://localhost:3002', 'http://127.0.0.1:3002'],
        env: 'production',
      }),
    ).toBe(false);
  });

  it('rejects unexpected ports and public origins', () => {
    expect(
      isAllowedCorsOrigin({
        origin: 'http://192.168.100.119:4000',
        allowedOrigins: ['http://localhost:3002', 'http://127.0.0.1:3002'],
        env: 'development',
      }),
    ).toBe(false);

    expect(
      isAllowedCorsOrigin({
        origin: 'https://example.com:3002',
        allowedOrigins: ['http://localhost:3002', 'http://127.0.0.1:3002'],
        env: 'development',
      }),
    ).toBe(false);
  });

  it('rejects an invalid origin without returning a middleware error', () => {
    const callback = createCorsOriginCallback({
      allowedOrigins: ['https://staff.autocare.example'],
      env: 'production',
    });
    let result: { error: Error | null; allow?: boolean } | undefined;

    callback('https://untrusted.example', (error, allow) => {
      result = { error, allow };
    });

    expect(result).toEqual({ error: null, allow: false });
  });

  it('preserves allowed-origin behavior through the callback', () => {
    const callback = createCorsOriginCallback({
      allowedOrigins: ['https://staff.autocare.example'],
      env: 'production',
    });
    let result: { error: Error | null; allow?: boolean } | undefined;

    callback('https://staff.autocare.example', (error, allow) => {
      result = { error, allow };
    });

    expect(result).toEqual({ error: null, allow: true });
  });
});
