import { validateEnv } from './env.validation';

const productionConfig = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://autocare:strong-password@db.internal:5432/autocare',
  JWT_ACCESS_SECRET: 'access-secret-that-is-longer-than-thirty-two-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-that-is-longer-than-thirty-two-characters',
  CORS_ORIGINS: 'https://staff.autocare.example',
  STAFF_WORK_CLAIM_ENFORCEMENT: 'observe',
};

describe('validateEnv production security', () => {
  it('accepts explicit non-placeholder production configuration', () => {
    expect(validateEnv({ ...productionConfig })).toEqual(productionConfig);
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
});
