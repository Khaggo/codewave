import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_RUNTIME_START_TIMEOUT_MS,
  getRuntimeDefinition,
  getRuntimeStartTimeoutMs,
} from './runtime-definitions.mjs';

const ROOT_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

test('managed Expo runtimes avoid network-dependent startup checks', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIRECTORY, 'package.json'), 'utf8'),
  );

  assert.doesNotMatch(packageJson.scripts['dev:mobile:raw'], /--offline/);
  assert.doesNotMatch(packageJson.scripts['dev:mobile:web:raw'], /--offline/);
  assert.equal(getRuntimeDefinition('mobile-lan').environment.EXPO_OFFLINE, '1');
  assert.equal(getRuntimeDefinition('mobile-web').environment.EXPO_OFFLINE, '1');
  assert.equal(
    getRuntimeDefinition('mobile-lan').environment.EXPO_NO_TYPESCRIPT_SETUP,
    '1',
  );
  assert.equal(
    getRuntimeDefinition('mobile-web').environment.EXPO_NO_TYPESCRIPT_SETUP,
    '1',
  );
});

test('mobile LAN readiness uses the Metro health endpoint', () => {
  assert.equal(
    getRuntimeDefinition('mobile-lan').healthUrl,
    'http://127.0.0.1:8081/status',
  );
});

test('mobile web health stays fast while readiness warms the real application bundle', () => {
  const definition = getRuntimeDefinition('mobile-web');

  assert.equal(definition.healthUrl, 'http://127.0.0.1:8090/status');
  assert.match(definition.readinessUrl, /\/mobile\/index\.bundle\?/);
  assert.equal(definition.readinessTimeoutMs, 120_000);
  assert.equal(getRuntimeStartTimeoutMs(definition), 150_000);
});

test('managed main backend requires database-aware readiness', () => {
  const definition = getRuntimeDefinition('backend-main');

  assert.equal(
    definition.healthUrl,
    'http://127.0.0.1:3000/api/health/ready',
  );
  assert.equal(getRuntimeStartTimeoutMs(definition), 60_000);
});

test('managed staff web keeps development output separate from production builds', () => {
  const definition = getRuntimeDefinition('staff-web');

  assert.equal(definition.environment.NEXT_DIST_DIR, '.next-dev');
  assert.equal(definition.healthUrl, 'http://127.0.0.1:3002/health');
});

test('managed Storybook uses its isolated port and bounded startup', () => {
  const definition = getRuntimeDefinition('storybook-web');

  assert.equal(definition.port, 6006);
  assert.equal(definition.healthUrl, 'http://127.0.0.1:6006/');
  assert.deepEqual(definition.command, ['npm', 'run', 'dev:storybook:raw']);
  assert.equal(getRuntimeStartTimeoutMs(definition), 90_000);
});

test('managed mobile Storybook is isolated from production Expo bundles', () => {
  const definition = getRuntimeDefinition('storybook-mobile');

  assert.equal(definition.port, 8085);
  assert.equal(definition.healthUrl, 'http://127.0.0.1:8085/status');
  assert.equal(definition.environment.STORYBOOK_ENABLED, 'true');
  assert.equal(definition.environment.EXPO_PUBLIC_STORYBOOK_ENABLED, 'true');
  assert.equal(definition.environment.STORYBOOK_DISABLE_TELEMETRY, '1');
  assert.deepEqual(definition.command, ['npm', 'run', 'dev:storybook:mobile:raw']);
  assert.equal(getRuntimeStartTimeoutMs(definition), 90_000);
});

test('runtime startup bounds are service-aware and retain a safe default', () => {
  assert.equal(getRuntimeStartTimeoutMs(getRuntimeDefinition('backend-main')), 60_000);
  assert.equal(getRuntimeStartTimeoutMs({}), DEFAULT_RUNTIME_START_TIMEOUT_MS);
  assert.equal(getRuntimeStartTimeoutMs({}, 1_500), 1_500);
  assert.equal(
    getRuntimeStartTimeoutMs({}, Number.NaN),
    DEFAULT_RUNTIME_START_TIMEOUT_MS,
  );
});
