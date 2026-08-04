const MOBILE_WEB_READINESS_URL =
  'http://127.0.0.1:8090/mobile/index.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable';

export const RUNTIME_DEFINITIONS = Object.freeze({
  'backend-main': Object.freeze({
    name: 'backend-main',
    port: 3000,
    cwd: '.',
    runtimeDirectory: '.managed-runtime',
    healthUrl: 'http://127.0.0.1:3000/api/health/ready',
    command: ['npm', 'run', 'dev:main:raw'],
    startupTimeoutMs: 120_000,
  }),
  'staff-web': Object.freeze({
    name: 'staff-web',
    port: 3002,
    cwd: '.',
    runtimeDirectory: '.managed-runtime',
    healthUrl: 'http://127.0.0.1:3002/health',
    command: ['npm', 'run', 'dev:web:raw'],
    environment: Object.freeze({ NEXT_DIST_DIR: '.next-dev' }),
    startupTimeoutMs: 60_000,
  }),
  'storybook-web': Object.freeze({
    name: 'storybook-web',
    port: 6006,
    cwd: '.',
    runtimeDirectory: '.managed-runtime',
    healthUrl: 'http://127.0.0.1:6006/',
    command: ['npm', 'run', 'dev:storybook:raw'],
    startupTimeoutMs: 90_000,
  }),
  'storybook-mobile': Object.freeze({
    name: 'storybook-mobile',
    port: 8085,
    cwd: '.',
    runtimeDirectory: '.managed-runtime',
    healthUrl: 'http://127.0.0.1:8085/status',
    command: ['npm', 'run', 'dev:storybook:mobile:raw'],
    environment: Object.freeze({
      STORYBOOK_ENABLED: 'true',
      EXPO_PUBLIC_STORYBOOK_ENABLED: 'true',
      EXPO_OFFLINE: '1',
      EXPO_NO_TYPESCRIPT_SETUP: '1',
      STORYBOOK_DISABLE_TELEMETRY: '1',
    }),
    startupTimeoutMs: 90_000,
  }),
  'mobile-lan': Object.freeze({
    name: 'mobile-lan',
    port: 8081,
    cwd: '.',
    runtimeDirectory: '.managed-runtime',
    healthUrl: 'http://127.0.0.1:8081/status',
    command: ['npm', 'run', 'dev:mobile:raw'],
    environment: Object.freeze({
      EXPO_OFFLINE: '1',
      EXPO_NO_TYPESCRIPT_SETUP: '1',
    }),
    startupTimeoutMs: 60_000,
  }),
  'mobile-web': Object.freeze({
    name: 'mobile-web',
    port: 8090,
    cwd: '.',
    runtimeDirectory: '.managed-runtime',
    healthUrl: 'http://127.0.0.1:8090/status',
    readinessUrl: MOBILE_WEB_READINESS_URL,
    readinessTimeoutMs: 120_000,
    command: ['npm', 'run', 'dev:mobile:web:raw'],
    environment: Object.freeze({
      EXPO_OFFLINE: '1',
      EXPO_NO_TYPESCRIPT_SETUP: '1',
    }),
    startupTimeoutMs: 150_000,
  }),
});

export const DEFAULT_RUNTIME_START_TIMEOUT_MS = 30_000;

export function getRuntimeStartTimeoutMs(definition, override) {
  const candidate = Number(
    override ?? definition?.startupTimeoutMs ?? DEFAULT_RUNTIME_START_TIMEOUT_MS,
  );
  return Number.isInteger(candidate) && candidate > 0
    ? candidate
    : DEFAULT_RUNTIME_START_TIMEOUT_MS;
}

export function getRuntimeDefinition(name) {
  return RUNTIME_DEFINITIONS[name] ?? null;
}

export function listRuntimeDefinitions() {
  return Object.values(RUNTIME_DEFINITIONS);
}

export function normalizeSpawnEnvironment(environment = process.env, platform = process.platform) {
  if (platform !== 'win32') {
    return { ...environment };
  }

  const normalized = {};
  const keysByLowercaseName = new Map();

  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) continue;
    const lowerKey = key.toLowerCase();
    const existingKey = keysByLowercaseName.get(lowerKey);
    if (!existingKey) {
      const canonicalKey = lowerKey === 'path' ? 'Path' : key;
      keysByLowercaseName.set(lowerKey, canonicalKey);
      normalized[canonicalKey] = value;
      continue;
    }

    if (key === 'Path' || existingKey !== 'Path') {
      normalized[existingKey] = value;
    }
  }

  return normalized;
}
