import { validateEnv } from './env.validation';

const productionConfig = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://autocare:strong-password@db.internal:5432/autocare',
  JWT_ACCESS_SECRET: 'access-secret-that-is-longer-than-thirty-two-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-that-is-longer-than-thirty-two-characters',
  CORS_ORIGINS: 'https://staff.autocare.example',
  STAFF_WORK_CLAIM_ENFORCEMENT: 'observe',
  ACCESSORY_COMMERCE_MODE: 'off',
  ACCESSORY_MEDIA_DRIVER: 'local',
};

describe('validateEnv production security', () => {
  it('accepts explicit non-placeholder production configuration', () => {
    expect(validateEnv({ ...productionConfig })).toEqual(productionConfig);
  });

  it('accepts accessory commerce modes and defaults local/test to off', () => {
    for (const mode of ['off', 'staff_preview', 'catalog', 'ordering']) {
      expect(() =>
        validateEnv({
          ...productionConfig,
          NODE_ENV: 'development',
          ACCESSORY_COMMERCE_MODE: mode,
        }),
      ).not.toThrow();
    }

    expect(
      validateEnv({
        ...productionConfig,
        NODE_ENV: 'development',
        ACCESSORY_COMMERCE_MODE: undefined,
      }).ACCESSORY_COMMERCE_MODE,
    ).toBe('off');
    expect(
      validateEnv({
        ...productionConfig,
        NODE_ENV: 'test',
        ACCESSORY_COMMERCE_MODE: undefined,
      }).ACCESSORY_COMMERCE_MODE,
    ).toBe('off');
  });

  it('rejects invalid accessory commerce modes and missing production mode', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        ACCESSORY_COMMERCE_MODE: 'preview',
      }),
    ).toThrow('ACCESSORY_COMMERCE_MODE must be off, staff_preview, catalog, or ordering');

    expect(() =>
      validateEnv({
        ...productionConfig,
        ACCESSORY_COMMERCE_MODE: undefined,
      }),
    ).toThrow('Missing required environment variable: ACCESSORY_COMMERCE_MODE');
  });

  it('requires durable media for production catalog and payment settings for ordering', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        ACCESSORY_COMMERCE_MODE: 'catalog',
        ACCESSORY_MEDIA_DRIVER: 'local',
      }),
    ).toThrow('requires ACCESSORY_MEDIA_DRIVER=s3');

    expect(() =>
      validateEnv({
        ...productionConfig,
        ACCESSORY_COMMERCE_MODE: 'ordering',
        ACCESSORY_MEDIA_DRIVER: 's3',
        ACCESSORY_MEDIA_S3_ENDPOINT: 'https://objects.example',
        ACCESSORY_MEDIA_S3_REGION: 'auto',
        ACCESSORY_MEDIA_S3_BUCKET: 'autocare-accessories',
        ACCESSORY_MEDIA_S3_ACCESS_KEY_ID: 'key',
        ACCESSORY_MEDIA_S3_SECRET_ACCESS_KEY: 'secret',
      }),
    ).toThrow('ACCESSORY_PAYMONGO_WEBHOOK_SECRET');

    expect(() =>
      validateEnv({
        ...productionConfig,
        ACCESSORY_COMMERCE_MODE: 'ordering',
        ACCESSORY_MEDIA_DRIVER: 's3',
        ACCESSORY_MEDIA_S3_ENDPOINT: 'https://objects.example',
        ACCESSORY_MEDIA_S3_REGION: 'auto',
        ACCESSORY_MEDIA_S3_BUCKET: 'autocare-accessories',
        ACCESSORY_MEDIA_S3_ACCESS_KEY_ID: 'key',
        ACCESSORY_MEDIA_S3_SECRET_ACCESS_KEY: 'secret',
        ACCESSORY_PAYMONGO_WEBHOOK_SECRET: 'whsec_accessories',
        ACCESSORY_PAYMONGO_CHECKOUT_SUCCESS_URL: 'https://mobile.example/accessories/success',
        ACCESSORY_PAYMONGO_CHECKOUT_CANCEL_URL: 'https://mobile.example/accessories/cancel',
        ACCESSORY_PAYMONGO_LIVEMODE: 'false',
      }),
    ).not.toThrow();
  });

  it('rejects placeholder JWT secrets in production', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        JWT_ACCESS_SECRET: 'change-me-access',
      }),
    ).toThrow('JWT_ACCESS_SECRET must be a non-placeholder secret');
  });

  it('rejects registration OTP bypass in production', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        AUTH_BYPASS_CUSTOMER_REGISTRATION_OTP: 'true',
      }),
    ).toThrow('Customer registration OTP bypass cannot be enabled in production');
  });

  it('requires an explicit supported claim-enforcement mode in production', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        STAFF_WORK_CLAIM_ENFORCEMENT: undefined,
      }),
    ).toThrow('Missing required environment variable: STAFF_WORK_CLAIM_ENFORCEMENT');

    expect(() =>
      validateEnv({
        ...productionConfig,
        STAFF_WORK_CLAIM_ENFORCEMENT: 'disabled',
      }),
    ).toThrow('STAFF_WORK_CLAIM_ENFORCEMENT must be observe or strict');
  });

  it('accepts bounded staff-work capacities and rejects unsafe values', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        STAFF_WORK_JOB_ORDER_CAPACITY: '12',
        STAFF_WORK_QA_CAPACITY: '6',
      }),
    ).not.toThrow();

    for (const value of ['0', '1.5', '101', 'many']) {
      expect(() =>
        validateEnv({
          ...productionConfig,
          STAFF_WORK_JOB_ORDER_CAPACITY: value,
        }),
      ).toThrow('STAFF_WORK_JOB_ORDER_CAPACITY must be an integer between 1 and 100');
    }
  });

  it('rejects localhost databases and wildcard CORS in production', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        DATABASE_URL: 'postgresql://admin:root@localhost:5433/codewave',
      }),
    ).toThrow('DATABASE_URL cannot target localhost in production');

    expect(() =>
      validateEnv({
        ...productionConfig,
        CORS_ORIGINS: '*',
      }),
    ).toThrow('CORS_ORIGINS must contain explicit trusted origins in production');
  });

  it('validates the public OpenAPI flag and blocks it in production', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        ENABLE_PUBLIC_OPENAPI: 'true',
      }),
    ).toThrow('ENABLE_PUBLIC_OPENAPI must be false in production');

    expect(() =>
      validateEnv({
        ...productionConfig,
        ENABLE_PUBLIC_OPENAPI: 'invalid',
      }),
    ).toThrow('ENABLE_PUBLIC_OPENAPI must be true or false');

    expect(
      validateEnv({
        ...productionConfig,
        ENABLE_PUBLIC_OPENAPI: 'false',
      }).ENABLE_PUBLIC_OPENAPI,
    ).toBe('false');
  });
});
