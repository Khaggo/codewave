import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testTimeout: 30000,
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@main-modules/(.*)$': '<rootDir>/apps/main-service/src/modules/$1',
    '^@ecommerce-modules/(.*)$': '<rootDir>/apps/ecommerce-service/src/modules/$1',
  },
};

export default config;
