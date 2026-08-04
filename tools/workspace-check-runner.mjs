#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { normalizeSpawnEnvironment } from './runtime-definitions.mjs';

export const WORKSPACE_CHECK_STAGES = Object.freeze([
  Object.freeze([
    Object.freeze({ script: 'check:policy', timeoutMs: 60_000 }),
    Object.freeze({ script: 'check:agents', timeoutMs: 60_000 }),
    Object.freeze({ script: 'check:docs', timeoutMs: 60_000 }),
  ]),
  Object.freeze([
    Object.freeze({ script: 'check:backend', timeoutMs: 180_000 }),
    Object.freeze({ script: 'check:web', timeoutMs: 240_000 }),
  ]),
  Object.freeze([
    Object.freeze({ script: 'check:mobile', timeoutMs: 240_000 }),
  ]),
]);

function stopOwnedProcessTree(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        timeout: 10_000,
        windowsHide: true,
      });
      return;
    } catch {
      // Fall through to the direct child signal.
    }
  }
  child.kill('SIGTERM');
}

export function runNpmScript({ script, timeoutMs }) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    return Promise.reject(new Error('npm_execpath is missing; run this check through npm.'));
  }

  console.log(`[workspace-check] starting ${script} (timeout ${timeoutMs}ms)`);
  const child = spawn(process.execPath, [npmCli, 'run', script], {
    cwd: process.cwd(),
    env: normalizeSpawnEnvironment(process.env),
    shell: false,
    stdio: 'inherit',
    windowsHide: true,
  });

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      stopOwnedProcessTree(child);
      reject(new Error(`${script} exceeded its ${timeoutMs}ms timeout.`));
    }, timeoutMs);

    child.once('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timeoutId);
      if (code === 0) {
        console.log(`[workspace-check] passed ${script}`);
        resolve();
        return;
      }
      reject(
        new Error(
          `${script} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`,
        ),
      );
    });
  });
}

export async function runCheckStages({
  stages = WORKSPACE_CHECK_STAGES,
  runScript = runNpmScript,
} = {}) {
  for (const stage of stages) {
    const results = await Promise.allSettled(stage.map(runScript));
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) {
      throw new AggregateError(
        failures.map((failure) => failure.reason),
        'Workspace checks failed.',
      );
    }
  }
}

async function main() {
  await runCheckStages();
  console.log('[workspace-check] all stages passed');
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch((error) => {
    console.error(`[workspace-check] ${error.message}`);
    for (const nestedError of error.errors ?? []) {
      console.error(`- ${nestedError.message}`);
    }
    process.exitCode = 1;
  });
}
