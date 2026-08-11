import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  canClearStaleRuntimeMetadata,
  getCliTimeoutMs,
  getCliWaitTimeoutMs,
  getListeningPid,
  getRuntimeStatus,
  restartRuntime,
  startRuntime,
  stopRuntime,
  waitForRuntime,
} from './runtime-manager.mjs';
import { normalizeSpawnEnvironment } from './runtime-definitions.mjs';
import { getRuntimeProbe, probeHealth } from './runtime-probe.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_SERVER = path.join(TOOLS_DIR, 'fixtures', 'runtime-http-server.mjs');
const FIXTURE_SERVER_WRAPPER = path.join(
  TOOLS_DIR,
  'fixtures',
  'runtime-server-wrapper.mjs',
);

test('listener discovery applies a bounded OS command timeout', () => {
  let invocation;
  const pid = getListeningPid(6006, 'win32', (executable, args, options) => {
    invocation = { executable, args, options };
    return 'TCP    127.0.0.1:6006    0.0.0.0:0    LISTENING    4321\r\n';
  });

  assert.equal(pid, 4321);
  assert.equal(invocation.executable, 'netstat');
  assert.deepEqual(invocation.args, ['-ano', '-p', 'tcp']);
  assert.equal(invocation.options.timeout, 3_000);
  assert.equal(invocation.options.windowsHide, true);
});

test('CLI commands have explicit hard deadlines', () => {
  assert.equal(getCliTimeoutMs('status'), 30_000);
  assert.equal(getCliTimeoutMs('restart'), 28_000);
  assert.equal(getCliTimeoutMs('stop'), 28_000);
  assert.equal(getCliTimeoutMs('wait', { startupTimeoutMs: 12_000 }), 22_000);
  assert.equal(
    getCliTimeoutMs('wait', { startupTimeoutMs: 12_000 }, 4_000),
    14_000,
  );
  assert.equal(getCliWaitTimeoutMs({ startupTimeoutMs: 90_000 }), 20_000);
  assert.equal(getCliTimeoutMs('wait', { startupTimeoutMs: 90_000 }), 30_000);
});

test('stale metadata cleanup requires every recorded PID to be absent or not owned', () => {
  const startedAt = '2026-08-11T12:00:00.000Z';
  const lock = {
    watchdogPid: 101,
    watchdogIdentity: { pid: 101, startedAt, executablePath: 'node.exe' },
    childPid: 102,
    childIdentity: { pid: 102, startedAt, executablePath: 'node.exe' },
  };

  assert.equal(
    canClearStaleRuntimeMetadata(lock, { getProcessIdentity: () => null }),
    true,
  );
  assert.equal(
    canClearStaleRuntimeMetadata(lock, {
      getProcessIdentity: (pid) => ({
        pid,
        startedAt: '2026-08-11T13:00:00.000Z',
        executablePath: 'other.exe',
      }),
    }),
    true,
  );
  assert.equal(
    canClearStaleRuntimeMetadata(lock, {
      getProcessIdentity: (pid) => ({
        pid,
        startedAt,
        executablePath: 'node.exe',
      }),
    }),
    false,
  );
  assert.equal(
    canClearStaleRuntimeMetadata(
      { watchdogPid: 101 },
      { getProcessIdentity: () => ({ pid: 101, startedAt }) },
    ),
    false,
  );
});

test('managed launch paths never inherit terminal handles and CLI operations stay bounded', () => {
  const detachedSource = fs.readFileSync(
    path.join(TOOLS_DIR, 'runtime-detached-launcher.mjs'),
    'utf8',
  );
  const bootstrapSource = fs.readFileSync(
    path.join(TOOLS_DIR, 'runtime-windows-bootstrap.mjs'),
    'utf8',
  );
  const watchdogSource = fs.readFileSync(
    path.join(TOOLS_DIR, 'runtime-watchdog.mjs'),
    'utf8',
  );

  assert.match(detachedSource, /stdio: 'ignore'/);
  assert.match(bootstrapSource, /stdio: 'ignore'/);
  assert.match(watchdogSource, /stdio: \['ignore', 'pipe', 'pipe'\]/);
  assert.doesNotMatch(
    `${detachedSource}\n${bootstrapSource}\n${watchdogSource}`,
    /stdio:\s*['"]inherit['"]/,
  );
  for (const command of ['start', 'stop', 'restart', 'status', 'logs']) {
    assert.ok(getCliTimeoutMs(command) <= 30_000, command);
  }
});

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

function removeFixtureDirectory(rootDirectory) {
  fs.rmSync(rootDirectory, {
    recursive: true,
    force: true,
    maxRetries: 20,
    retryDelay: 150,
  });
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

test('runtime probes reject client errors and select readiness independently', async () => {
  const port = await reservePort();
  const child = spawn(process.execPath, [FIXTURE_SERVER, String(port)], {
    stdio: 'ignore',
    windowsHide: true,
  });

  try {
    const listening = await waitFor(
      () => probeHealth(`http://127.0.0.1:${port}/health`),
      5_000,
    );
    assert.equal(listening, true);
    assert.equal(
      await probeHealth(`http://127.0.0.1:${port}/missing`),
      false,
    );

    const definition = {
      healthUrl: `http://127.0.0.1:${port}/health`,
      readinessUrl: `http://127.0.0.1:${port}/bundle`,
      healthTimeoutMs: 500,
      readinessTimeoutMs: 5_000,
    };
    assert.deepEqual(getRuntimeProbe(definition), {
      url: definition.healthUrl,
      timeoutMs: 500,
    });
    assert.deepEqual(getRuntimeProbe(definition, { readiness: true }), {
      url: definition.readinessUrl,
      timeoutMs: 5_000,
    });
  } finally {
    child.kill('SIGTERM');
  }
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
    startupTimeoutMs: 10_000,
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
    assert.equal(first.lock.startupTimeoutMs, 10_000);
    assert.ok(Date.now() - startedAt < 5_000);
    const duplicateLaunch = await startRuntime(definition, { rootDirectory });
    assert.ok(
      duplicateLaunch.reused || duplicateLaunch.state === 'managed-starting',
    );
    const readyFirst = await waitForRuntime(definition, {
      rootDirectory,
      timeoutMs: definition.startupTimeoutMs + 2_000,
    });
    assert.equal(readyFirst.state, 'managed-healthy');
    assert.equal(readyFirst.lock.startupTimeoutMs, 10_000);
    const firstPid = readyFirst.listenerPid;

    const second = await startRuntime(definition, { rootDirectory, timeoutMs: 5_000 });
    assert.equal(second.reused, true);
    assert.equal(second.listenerPid, firstPid);

    const previousInstanceMarker = 'previous-runtime-instance-error';
    fs.appendFileSync(readyFirst.paths.stderrLog, previousInstanceMarker);

    const restartProgress = [];
    const restarted = await restartRuntime(definition, {
      rootDirectory,
      timeoutMs: 10_000,
      onProgress: (phase) => restartProgress.push(phase),
    });
    assert.deepEqual(restartProgress, ['stopping', 'starting']);
    assert.equal(restarted.state, 'managed-starting');
    const readyRestarted = await waitForRuntime(definition, {
      rootDirectory,
      timeoutMs: 10_000,
    });
    assert.equal(readyRestarted.state, 'managed-healthy');
    assert.notEqual(readyRestarted.listenerPid, firstPid);
    assert.doesNotMatch(
      fs.readFileSync(readyRestarted.paths.stderrLog, 'utf8'),
      new RegExp(previousInstanceMarker),
    );
    assert.match(
      fs.readFileSync(`${readyRestarted.paths.stderrLog}.1`, 'utf8'),
      new RegExp(previousInstanceMarker),
    );

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
      await stopRuntime(definition, { rootDirectory, timeoutMs: 5_000 });
    }
    removeFixtureDirectory(rootDirectory);
  }
});

test('watchdog records and stops a listener spawned below the command wrapper', {
  timeout: 30_000,
}, async () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codewave-runtime-wrapper-'));
  const port = await reservePort();
  const definition = {
    name: `wrapper-fixture-${process.pid}`,
    port,
    cwd: '.',
    runtimeDirectory: '.runtime',
    healthUrl: `http://127.0.0.1:${port}/health`,
    command: [process.execPath, FIXTURE_SERVER_WRAPPER, String(port), '1200'],
    startupTimeoutMs: 500,
  };

  try {
    await startRuntime(definition, { rootDirectory });
    const ready = await waitForRuntime(definition, {
      rootDirectory,
      timeoutMs: 10_000,
    });

    assert.equal(ready.state, 'managed-healthy');
    const recordedListener = await waitFor(async () => {
      const status = await getRuntimeStatus(definition, { rootDirectory });
      return status.lock?.listenerPid ? status : null;
    }, 10_000);
    assert.ok(
      recordedListener?.lock.listenerPid,
      `watchdog lock did not record listener ${ready.listenerPid}: ${JSON.stringify(ready.lock)}`,
    );
    assert.notEqual(recordedListener.lock.listenerPid, recordedListener.lock.childPid);

    await stopRuntime(definition, { rootDirectory, timeoutMs: 10_000 });
    const stopped = await getRuntimeStatus(definition, { rootDirectory });
    assert.equal(stopped.state, 'stopped');
  } finally {
    const status = await getRuntimeStatus(definition, { rootDirectory }).catch(() => null);
    if (status?.state?.startsWith('managed')) {
      await stopRuntime(definition, { rootDirectory, timeoutMs: 5_000 }).catch(() => {});
    } else if (status?.listenerPid) {
      try {
        process.kill(status.listenerPid, 'SIGTERM');
      } catch {
        // The fixture listener may already have exited during cleanup.
      }
    }
    removeFixtureDirectory(rootDirectory);
  }
});

test('a bounded wait leaves an owned startup running until its configured deadline', {
  timeout: 30_000,
}, async () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codewave-runtime-pending-'));
  const port = await reservePort();
  const definition = {
    name: `pending-fixture-${process.pid}`,
    port,
    cwd: '.',
    runtimeDirectory: '.runtime',
    healthUrl: `http://127.0.0.1:${port}/health`,
    command: [process.execPath, FIXTURE_SERVER_WRAPPER, String(port), '1500'],
    startupTimeoutMs: 10_000,
  };

  try {
    await startRuntime(definition, { rootDirectory });
    const pending = await waitForRuntime(definition, {
      rootDirectory,
      timeoutMs: 300,
    });

    assert.equal(pending.state, 'managed-starting');
    assert.equal(pending.pending, true);
    assert.ok(pending.startupDeadline);
    const ready = await waitForRuntime(definition, {
      rootDirectory,
      timeoutMs: 5_000,
    });
    assert.equal(ready.state, 'managed-healthy');
    assert.notEqual(ready.pending, true);
  } finally {
    const status = await getRuntimeStatus(definition, { rootDirectory }).catch(() => null);
    if (status?.state?.startsWith('managed')) {
      await stopRuntime(definition, { rootDirectory, timeoutMs: 5_000 }).catch(() => {});
    }
    removeFixtureDirectory(rootDirectory);
  }
});

test('Windows detached bootstrap keeps a fixture listener alive after launch returns', {
  timeout: 15_000,
  skip: process.platform !== 'win32',
}, async () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codewave-runtime-windows-'));
  const port = await reservePort();
  const definition = {
    name: `windows-fixture-${process.pid}`,
    port,
    cwd: '.',
    runtimeDirectory: '.runtime',
    healthUrl: `http://127.0.0.1:${port}/health`,
    command: [process.execPath, FIXTURE_SERVER, String(port)],
    startupTimeoutMs: 5_000,
  };

  try {
    await startRuntime(definition, { rootDirectory });
    const ready = await waitForRuntime(definition, {
      rootDirectory,
      timeoutMs: 5_000,
    });
    assert.equal(ready.state, 'managed-healthy');

    await new Promise((resolve) => setTimeout(resolve, 500));
    const stable = await getRuntimeStatus(definition, { rootDirectory });
    assert.equal(stable.state, 'managed-healthy');
    assert.ok(stable.listenerPid);
  } finally {
    const status = await getRuntimeStatus(definition, { rootDirectory }).catch(() => null);
    if (status?.state?.startsWith('managed')) {
      await stopRuntime(definition, { rootDirectory, timeoutMs: 5_000 }).catch(() => {});
    }
    removeFixtureDirectory(rootDirectory);
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
    assert.ok(Date.now() - startedAt < 5_000);
    await assert.rejects(
      () => waitForRuntime(definition, { rootDirectory, timeoutMs: 1_500 }),
      /did not become healthy within 1500ms/i,
    );
  } finally {
    const status = await getRuntimeStatus(definition, { rootDirectory }).catch(() => null);
    if (status?.state?.startsWith('managed')) {
      await stopRuntime(definition, { rootDirectory, timeoutMs: 5_000 }).catch(() => {});
    }
    removeFixtureDirectory(rootDirectory);
  }
});
