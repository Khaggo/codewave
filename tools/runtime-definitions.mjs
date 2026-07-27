export const RUNTIME_DEFINITIONS = Object.freeze({
  'backend-main': Object.freeze({
    name: 'backend-main',
    port: 3000,
    cwd: '.',
    runtimeDirectory: 'backend/.runtime',
    healthUrl: 'http://127.0.0.1:3000/api/health',
    command: ['npm', 'run', 'dev:main:raw'],
  }),
  'backend-ecommerce': Object.freeze({
    name: 'backend-ecommerce',
    port: 3001,
    cwd: '.',
    runtimeDirectory: 'backend/.runtime',
    healthUrl: 'http://127.0.0.1:3001/api/health',
    command: ['npm', 'run', 'dev:ecommerce:raw'],
  }),
  'staff-web': Object.freeze({
    name: 'staff-web',
    port: 3002,
    cwd: '.',
    runtimeDirectory: 'frontend/.runtime',
    healthUrl: 'http://127.0.0.1:3002/bookings',
    command: ['npm', 'run', 'dev:web:raw'],
  }),
  'mobile-lan': Object.freeze({
    name: 'mobile-lan',
    port: 8081,
    cwd: '.',
    runtimeDirectory: 'mobile/.runtime',
    healthUrl: '',
    command: ['npm', 'run', 'dev:mobile:raw'],
  }),
  'mobile-web': Object.freeze({
    name: 'mobile-web',
    port: 8090,
    cwd: '.',
    runtimeDirectory: 'mobile/.runtime',
    healthUrl: 'http://127.0.0.1:8090',
    command: ['npm', 'run', 'dev:mobile:web:raw'],
  }),
});

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
