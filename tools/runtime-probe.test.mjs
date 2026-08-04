import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getRuntimeStatus } from './runtime-manager.mjs';
import {
  formatRuntimeLogs,
  formatStatus,
} from './runtime-manager-output.mjs';
import { probeHealthWithRetries } from './runtime-probe.mjs';

test('recovers from one transient health failure', async () => {
  const results = [false, true];
  const waits = [];
  const result = await probeHealthWithRetries('http://runtime.test/health', {
    attempts: 2,
    retryDelayMs: 25,
    probe: async () => results.shift(),
    wait: async (milliseconds) => waits.push(milliseconds),
  });

  assert.deepEqual(result, { healthy: true, attemptsUsed: 2 });
  assert.deepEqual(waits, [25]);
});

test('reports a persistent health failure after the bounded attempts', async () => {
  let probes = 0;
  const result = await probeHealthWithRetries('http://runtime.test/health', {
    attempts: 2,
    retryDelayMs: 0,
    probe: async () => {
      probes += 1;
      return false;
    },
  });

  assert.deepEqual(result, { healthy: false, attemptsUsed: 2 });
  assert.equal(probes, 2);
});

test('does not retry a successful first health probe', async () => {
  let probes = 0;
  const result = await probeHealthWithRetries('http://runtime.test/health', {
    attempts: 2,
    probe: async () => {
      probes += 1;
      return true;
    },
  });

  assert.deepEqual(result, { healthy: true, attemptsUsed: 1 });
  assert.equal(probes, 1);
});

test('rejects unbounded retry settings', async () => {
  await assert.rejects(
    () => probeHealthWithRetries('http://runtime.test/health', { attempts: 6 }),
    /attempts must be an integer from 1 to 5/,
  );
  await assert.rejects(
    () =>
      probeHealthWithRetries('http://runtime.test/health', {
        retryDelayMs: 10_001,
      }),
    /retry delay must be an integer from 0 to 10000ms/,
  );
});

test('runtime status recovers from a transient first readiness response', async () => {
  const rootDirectory = mkdtempSync(path.join(os.tmpdir(), 'runtime-probe-status-'));
  let requests = 0;
  const server = http.createServer((_request, response) => {
    requests += 1;
    response.statusCode = requests === 1 ? 503 : 200;
    response.end(requests === 1 ? 'warming' : 'ready');
  });

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');

    const status = await getRuntimeStatus(
      {
        name: 'transient-probe-fixture',
        port: address.port,
        runtimeDirectory: '.runtime',
        healthUrl: `http://127.0.0.1:${address.port}/health`,
      },
      {
        rootDirectory,
        healthProbeAttempts: 2,
        healthProbeRetryDelayMs: 0,
      },
    );

    assert.equal(status.state, 'external-healthy');
    assert.equal(status.healthy, true);
    assert.equal(status.healthProbeAttempts, 2);
    assert.equal(requests, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test('status output discloses when a retry was required', () => {
  const output = formatStatus({
    name: 'backend-main',
    state: 'managed-healthy',
    port: 3000,
    listenerPid: 123,
    healthProbeAttempts: 2,
  });

  assert.match(output, /managed-healthy/);
  assert.match(output, /health probes: 2/);
});

test('runtime logs distinguish retained lifecycle history from current output', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'runtime-log-output-'));
  try {
    const paths = {
      managerLog: path.join(directory, 'manager.log'),
      stderrLog: path.join(directory, 'stderr.log'),
      stdoutLog: path.join(directory, 'stdout.log'),
    };
    writeFileSync(paths.managerLog, 'old start');
    writeFileSync(paths.stderrLog, 'current error');
    writeFileSync(paths.stdoutLog, 'current output');

    const output = formatRuntimeLogs(paths, 10);
    assert.match(output, /=== Lifecycle history ===\nold start/);
    assert.match(output, /=== Current instance stderr ===\ncurrent error/);
    assert.match(output, /=== Current instance stdout ===\ncurrent output/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
