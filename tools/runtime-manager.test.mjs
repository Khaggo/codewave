import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  getRuntimeStatus,
  restartRuntime,
  startRuntime,
  stopRuntime,
  waitForRuntime,
} from './runtime-manager.mjs';
import { normalizeSpawnEnvironment } from './runtime-definitions.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_SERVER = path.join(TOOLS_DIR, 'fixtures', 'runtime-http-server.mjs');

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitFor(predicate, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

test('Windows spawn environment removes case-insensitive duplicate keys', () => {
  const normalized = normalizeSpawnEnvironment({
    Path: 'preferred-path',
    PATH: 'duplicate-path',
    TEMP: 'one',
    temp: 'two',
  }, 'win32');

  assert.deepEqual(
    Object.keys(normalized).filter((key) => key.toLowerCase() === 'path'),
    ['Path'],
  );
  assert.equal(normalized.Path, 'preferred-path');
  assert.equal(
    Object.keys(normalized).filter((key) => key.toLowerCase() === 'temp').length,
    1,
  );
});

test('detached runtime lifecycle is bounded, single-instance, and ownership-safe', {
  timeout: 60_000,
}, async () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codewave-runtime-manager-'));
  const port = await reservePort();
  const definition = {
    name: `fixture-${process.pid}`,
    port,
    cwd: '.',
    runtimeDirectory: '.runtime',
    healthUrl: `http://127.0.0.1:${port}/health`,
    command: [process.execPath, FIXTURE_SERVER, String(port)],
  };

  try {
    const startedAt = Date.now();
    const first = await startRuntime(definition, {
      rootDirectory,
      environment: {
        ...process.env,
        Path: process.env.Path ?? process.env.PATH,
        PATH: process.env.PATH ?? process.env.Path,
      },
    });
    assert.equal(first.state, 'managed-starting');
    assert.equal(first.reused, false);
    assert.ok(Date.now() - startedAt < 2_000);
    const duplicateLaunch = await startRuntime(definition, { rootDirectory });
    assert.ok(
      duplicateLaunch.reused || duplicateLaunch.state === 'managed-starting',
    );
    const readyFirst = await waitForRuntime(definition, {
      rootDirectory,
      timeoutMs: 3_000,
    });
    assert.equal(readyFirst.state, 'managed-healthy');
    const firstPid = readyFirst.listenerPid;

    const second = await startRuntime(definition, { rootDirectory, timeoutMs: 5_000 });
    assert.equal(second.reused, true);
    assert.equal(second.listenerPid, firstPid);

    const restarted = await restartRuntime(definition, {
      rootDirectory,
      timeoutMs: 10_000,
    });
    assert.equal(restarted.state, 'managed-starting');
    const readyRestarted = await waitForRuntime(definition, {
      rootDirectory,
      timeoutMs: 10_000,
    });
    assert.equal(readyRestarted.state, 'managed-healthy');
    assert.notEqual(readyRestarted.listenerPid, firstPid);

    await stopRuntime(definition, { rootDirectory, timeoutMs: 10_000 });
    const stopped = await getRuntimeStatus(definition, { rootDirectory });
    assert.equal(stopped.state, 'stopped');

    const external = spawn(process.execPath, [FIXTURE_SERVER, String(port)], {
      windowsHide: true,
      stdio: 'ignore',
    });
    await waitFor(async () => (await getRuntimeStatus(definition, { rootDirectory })).healthy);

    const externalStatus = await getRuntimeStatus(definition, { rootDirectory });
    assert.equal(externalStatus.state, 'external-healthy');
    const reusedExternal = await startRuntime(definition, { rootDirectory });
    assert.equal(reusedExternal.reused, true);
    await assert.rejects(
      () => stopRuntime(definition, { rootDirectory }),
      /not owned by the runtime manager/i,
    );
    external.kill('SIGTERM');
    await waitFor(async () => !(await getRuntimeStatus(definition, { rootDirectory })).listenerPid);

    const lockDirectory = path.join(rootDirectory, '.runtime', 'watchdogs');
    fs.mkdirSync(lockDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(lockDirectory, `${definition.name}.json`),
      JSON.stringify({
        version: 1,
        instanceId: 'stale-instance',
        name: definition.name,
        port,
        watchdogPid: 999_999,
      }),
      'utf8',
    );
    const stale = await getRuntimeStatus(definition, { rootDirectory });
    assert.equal(stale.state, 'stale-lock');

    const recovered = await startRuntime(definition, {
      rootDirectory,
    });
    assert.equal(recovered.state, 'managed-starting');
    const readyRecovered = await waitForRuntime(definition, {
      rootDirectory,
      timeoutMs: 10_000,
    });
    assert.equal(readyRecovered.state, 'managed-healthy');
    await stopRuntime(definition, { rootDirectory, timeoutMs: 10_000 });
  } finally {
    const status = await getRuntimeStatus(definition, { rootDirectory }).catch(() => null);
    if (status?.state?.startsWith('managed')) {
      await stopRuntime(definition, { rootDirectory, timeoutMs: 5_000 }).catch(() => {});
    }
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test('failed detached startup returns immediately and wait fails with bounded logs', {
  timeout: 15_000,
}, async () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codewave-runtime-failure-'));
  const port = await reservePort();
  const definition = {
    name: `failing-fixture-${process.pid}`,
    port,
    cwd: '.',
    runtimeDirectory: '.runtime',
    healthUrl: `http://127.0.0.1:${port}/health`,
    command: [process.execPath, '-e', 'process.exit(3)'],
  };

  try {
    const startedAt = Date.now();
    const launch = await startRuntime(definition, { rootDirectory });
    assert.equal(launch.state, 'managed-starting');
    assert.ok(Date.now() - startedAt < 2_000);
    await assert.rejects(
      () => waitForRuntime(definition, { rootDirectory, timeoutMs: 1_500 }),
      /did not become healthy within 1500ms/i,
    );
  } finally {
    const status = await getRuntimeStatus(definition, { rootDirectory }).catch(() => null);
    if (status?.state?.startsWith('managed')) {
      await stopRuntime(definition, { rootDirectory, timeoutMs: 5_000 }).catch(() => {});
    }
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  }
});
