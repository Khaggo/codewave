#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  getRuntimeDefinition,
  getRuntimeStartTimeoutMs,
  listRuntimeDefinitions,
  normalizeSpawnEnvironment,
} from './runtime-definitions.mjs';
import { launchDetachedWatchdog } from './runtime-detached-launcher.mjs';
import { writeJsonAtomic } from './runtime-file-utils.mjs';
import {
  formatFailureLogs,
  formatRuntimeLogs,
  formatStatus,
  printUsage,
} from './runtime-manager-output.mjs';
import {
  getOwnedPids,
  isPidAlive,
  terminateOwnedTree,
} from './runtime-process-tree.mjs';
import { getListeningPid } from './runtime-port-listener.mjs';
import { probeRuntimeHealth } from './runtime-probe.mjs';

export { getListeningPid } from './runtime-port-listener.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const WATCHDOG_PATH = path.join(TOOLS_DIR, 'runtime-watchdog.mjs');
const DEFAULT_STOP_TIMEOUT_MS = 15_000;
const DEFAULT_OS_COMMAND_TIMEOUT_MS = 3_000;
const DEFAULT_CLI_TIMEOUT_MS = 30_000;
const DEFAULT_CLI_WAIT_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 200;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function runtimePaths(rootDirectory, definition) {
  const runtimeDirectory = path.resolve(
    rootDirectory,
    definition.runtimeDirectory ?? '.runtime',
  );
  const lockDirectory = path.join(runtimeDirectory, 'watchdogs');
  const managedDirectory = path.join(runtimeDirectory, 'managed', definition.name);
  return {
    runtimeDirectory,
    lockDirectory,
    managedDirectory,
    lock: path.join(lockDirectory, `${definition.name}.json`),
    managerLog: path.join(managedDirectory, 'manager.log'),
    stdoutLog: path.join(managedDirectory, 'stdout.log'),
    stderrLog: path.join(managedDirectory, 'stderr.log'),
  };
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function removeFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function isOwnedLock(lock, definition) {
  return Boolean(
    lock?.instanceId
      && lock.name === definition.name
      && lock.port === definition.port
      && isPidAlive(Number(lock.watchdogPid)),
  );
}

function isActiveLaunchReservation(lock, definition) {
  return Boolean(
    lock?.instanceId
      && lock.name === definition.name
      && lock.port === definition.port
      && lock.status === 'launching'
      && Date.parse(lock.reservedUntil || '') > Date.now(),
  );
}

export async function getRuntimeStatus(definition, options = {}) {
  const rootDirectory = path.resolve(options.rootDirectory ?? process.cwd());
  const paths = runtimePaths(rootDirectory, definition);
  const lock = readJson(paths.lock);
  const listenerPid = getListeningPid(definition.port);
  const shouldProbeHealth = options.probeHealth !== false;
  const { healthy, attemptsUsed: healthProbeAttempts } =
    await probeRuntimeHealth(definition, {
      listenerPid,
      enabled: shouldProbeHealth,
      readiness: options.probeReadiness === true,
      attempts: options.healthProbeAttempts ?? 1,
      retryDelayMs: options.healthProbeRetryDelayMs ?? 150,
    });
  const lockOwned = isOwnedLock(lock, definition);
  const launchReserved = isActiveLaunchReservation(lock, definition);
  const listenerMatches = Boolean(
    lockOwned
      && listenerPid
      && (!lock.listenerPid || Number(lock.listenerPid) === listenerPid),
  );

  let state = 'stopped';
  if (listenerPid && listenerMatches) {
    state = shouldProbeHealth
      ? healthy ? 'managed-healthy' : 'managed-unhealthy'
      : 'managed-running';
  } else if (listenerPid) {
    state = shouldProbeHealth
      ? healthy ? 'external-healthy' : 'external-unhealthy'
      : 'external-running';
  }
  else if (lockOwned || launchReserved) state = 'managed-starting';
  else if (lock) state = 'stale-lock';

  return {
    name: definition.name,
    port: definition.port,
    healthUrl: definition.healthUrl || null,
    readinessUrl: definition.readinessUrl || null,
    state,
    healthy,
    healthProbeAttempts,
    listenerPid,
    lock,
    paths,
  };
}

export async function startRuntime(definition, options = {}) {
  const rootDirectory = path.resolve(options.rootDirectory ?? process.cwd());
  const paths = runtimePaths(rootDirectory, definition);
  ensureDirectory(paths.runtimeDirectory);
  ensureDirectory(paths.lockDirectory);
  ensureDirectory(paths.managedDirectory);

  const initialStatus = await getRuntimeStatus(definition, {
    rootDirectory,
    probeHealth: false,
  });
  if (initialStatus.listenerPid) {
    return { ...initialStatus, reused: true };
  }
  if (initialStatus.state === 'managed-starting') {
    return { ...initialStatus, reused: true };
  }
  if (initialStatus.state === 'stale-lock') {
    removeFile(paths.lock);
  }

  const instanceId = randomUUID();
  const startedAt = new Date();
  const startupTimeoutMs = getRuntimeStartTimeoutMs(definition);
  const launchReservation = {
    version: 1,
    instanceId,
    name: definition.name,
    port: definition.port,
    cwd: path.resolve(rootDirectory, definition.cwd),
    healthUrl: definition.healthUrl || null,
    managerPid: process.pid,
    watchdogPid: null,
    childPid: null,
    listenerPid: null,
    startedAt: startedAt.toISOString(),
    reservedUntil: new Date(startedAt.getTime() + startupTimeoutMs).toISOString(),
    command: definition.command,
    status: 'launching',
    startupTimeoutMs,
  };
  writeJsonAtomic(paths.lock, launchReservation);

  const watchdogArguments = [
    WATCHDOG_PATH,
    '--name', definition.name,
    '--port', String(definition.port),
    '--cwd', definition.cwd,
    '--runtime-dir', definition.runtimeDirectory ?? '.runtime',
    '--instance-id', instanceId,
    '--listener-timeout-ms', String(startupTimeoutMs),
  ];
  if (definition.healthUrl) {
    watchdogArguments.push('--health-url', definition.healthUrl);
  }
  watchdogArguments.push('--', ...definition.command);

  let watchdogPid;
  try {
    watchdogPid = launchDetachedWatchdog(watchdogArguments, {
      cwd: rootDirectory,
      managedDirectory: paths.managedDirectory,
      environment: normalizeSpawnEnvironment({
        ...(options.environment ?? process.env),
        ...(definition.environment ?? {}),
        CODEWAVE_RUNTIME_DETACHED: '1',
      }),
    });
  } catch (error) {
    const currentLock = readJson(paths.lock);
    if (currentLock?.instanceId === instanceId) removeFile(paths.lock);
    throw error;
  }

  return {
    name: definition.name,
    port: definition.port,
    healthUrl: definition.healthUrl || null,
    state: 'managed-starting',
    healthy: false,
    listenerPid: null,
    lock: { ...launchReservation, watchdogPid },
    paths,
    instanceId,
    watchdogPid,
    reused: false,
  };
}

export async function waitForRuntime(definition, options = {}) {
  const rootDirectory = path.resolve(options.rootDirectory ?? process.cwd());
  const paths = runtimePaths(rootDirectory, definition);
  const timeoutMs = getRuntimeStartTimeoutMs(definition, options.timeoutMs);
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;
  while (Date.now() < deadline) {
    lastStatus = await getRuntimeStatus(definition, {
      rootDirectory,
      probeReadiness: true,
    });
    if (lastStatus.state === 'managed-healthy') {
      return lastStatus;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  lastStatus = await getRuntimeStatus(definition, {
    rootDirectory,
    probeReadiness: true,
  });
  const ownedLock = isOwnedLock(lastStatus.lock, definition);
  const activeReservation = isActiveLaunchReservation(
    lastStatus.lock,
    definition,
  );
  const startupDeadline = getStartupDeadline(lastStatus.lock);
  const ownedProcessAlive = Boolean(
    ownedLock && isPidAlive(Number(lastStatus.lock?.childPid)),
  );
  const stillWithinStartupWindow = Boolean(
    startupDeadline && Date.now() < startupDeadline,
  );

  if (
    (ownedProcessAlive || activeReservation)
      && stillWithinStartupWindow
      && (
        lastStatus.state === 'managed-starting'
          || lastStatus.state === 'managed-unhealthy'
      )
  ) {
    return {
      ...lastStatus,
      pending: true,
      startupDeadline: new Date(startupDeadline).toISOString(),
    };
  }

  if (ownedLock) {
    terminateOwnedTree(lastStatus.lock);
    const stopDeadline = Date.now() + DEFAULT_STOP_TIMEOUT_MS;
    while (Date.now() < stopDeadline && getListeningPid(definition.port)) {
      await sleep(POLL_INTERVAL_MS);
    }
    removeFile(paths.lock);
  }
  const logs = formatFailureLogs(paths);
  throw new Error(
    `${definition.name} did not become healthy within ${timeoutMs}ms.${logs ? `\n${logs}` : ''}`,
  );
}

export async function stopRuntime(definition, options = {}) {
  const rootDirectory = path.resolve(options.rootDirectory ?? process.cwd());
  const status = await getRuntimeStatus(definition, { rootDirectory });
  if (status.state === 'stopped') return { ...status, stopped: true };
  if (status.state === 'stale-lock' && !status.listenerPid) {
    removeFile(status.paths.lock);
    return { ...status, state: 'stopped', stopped: true };
  }
  if (!isOwnedLock(status.lock, definition)) {
    throw new Error(
      `${definition.name} is ${status.state} on port ${definition.port}. Refusing to stop a process that is not owned by the runtime manager.`,
    );
  }
  if (
    status.listenerPid
      && status.lock.listenerPid
      && Number(status.lock.listenerPid) !== status.listenerPid
  ) {
    throw new Error(
      `${definition.name} listener PID ${status.listenerPid} does not match owned PID ${status.lock.listenerPid}. Refusing to stop it.`,
    );
  }

  const ownedPids = terminateOwnedTree(status.lock);
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_STOP_TIMEOUT_MS);
  let listenerPid = getListeningPid(definition.port);
  let activeOwnedPids = ownedPids.filter(isPidAlive);
  while (Date.now() < deadline && (listenerPid || activeOwnedPids.length > 0)) {
    await sleep(POLL_INTERVAL_MS);
    listenerPid = getListeningPid(definition.port);
    activeOwnedPids = ownedPids.filter(isPidAlive);
  }
  if (listenerPid) {
    throw new Error(`${definition.name} did not release port ${definition.port} after stop.`);
  }
  if (activeOwnedPids.length > 0) {
    throw new Error(
      `${definition.name} did not stop owned PID(s) ${activeOwnedPids.join(', ')} after stop.`,
    );
  }
  const currentLock = readJson(status.paths.lock);
  if (!currentLock || currentLock.instanceId === status.lock.instanceId) {
    removeFile(status.paths.lock);
  }
  return {
    ...(await getRuntimeStatus(definition, { rootDirectory })),
    stopped: true,
  };
}

export async function restartRuntime(definition, options = {}) {
  options.onProgress?.('stopping');
  await stopRuntime(definition, options);
  options.onProgress?.('starting');
  return startRuntime(definition, options);
}

export function getCliTimeoutMs(command, definition, explicitTimeoutMs) {
  if (command === 'wait') {
    return getCliWaitTimeoutMs(definition, explicitTimeoutMs) + 10_000;
  }
  if (command === 'stop' || command === 'restart') {
    return DEFAULT_STOP_TIMEOUT_MS + DEFAULT_OS_COMMAND_TIMEOUT_MS + 10_000;
  }
  return DEFAULT_CLI_TIMEOUT_MS;
}

export function getCliWaitTimeoutMs(definition, explicitTimeoutMs) {
  return Math.min(
    getRuntimeStartTimeoutMs(definition, explicitTimeoutMs),
    DEFAULT_CLI_WAIT_TIMEOUT_MS,
  );
}

function getStartupDeadline(lock) {
  const reservedUntil = Date.parse(lock?.reservedUntil || '');
  if (Number.isFinite(reservedUntil)) return reservedUntil;

  const startedAt = Date.parse(lock?.startedAt || '');
  const startupTimeoutMs = Number(lock?.startupTimeoutMs);
  if (
    Number.isFinite(startedAt)
      && Number.isFinite(startupTimeoutMs)
      && startupTimeoutMs > 0
  ) {
    return startedAt + startupTimeoutMs;
  }

  return null;
}

function installCliDeadline(command, definition, explicitTimeoutMs) {
  const timeoutMs = getCliTimeoutMs(command, definition, explicitTimeoutMs);
  fs.writeSync(
    1,
    `[runtime-manager] ${command} ${definition?.name ?? 'all'} (hard deadline ${timeoutMs}ms)\n`,
  );
  const timer = setTimeout(() => {
    fs.writeSync(
      2,
      `[runtime-manager] ${command} exceeded its ${timeoutMs}ms hard deadline; terminating the manager command.\n`,
    );
    process.exit(124);
  }, timeoutMs);
  timer.unref();
  return timer;
}

function selectDefinitions(name, { allowAll = true } = {}) {
  if (!name && allowAll) return listRuntimeDefinitions();
  const definition = getRuntimeDefinition(name);
  if (!definition) throw new Error(`Unknown runtime: ${name || '(missing)'}`);
  return [definition];
}

async function main() {
  const [command, name, extra] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    printUsage(listRuntimeDefinitions().map((entry) => entry.name));
    return;
  }

  const selectedDefinition =
    name && name !== 'all' ? getRuntimeDefinition(name) : undefined;
  const explicitTimeoutMs =
    extra === undefined ? undefined : Number.parseInt(extra, 10);
  const deadline = installCliDeadline(
    command,
    selectedDefinition,
    explicitTimeoutMs,
  );

  try {
    if (command === 'status') {
      const definitions = selectDefinitions(name);
      const statuses = await Promise.all(
        definitions.map((definition) =>
          getRuntimeStatus(definition, { healthProbeAttempts: 2 })),
      );
      statuses.forEach((status) => console.log(formatStatus(status)));
      return;
    }

    if (command === 'logs') {
      const [definition] = selectDefinitions(name, { allowAll: false });
      const paths = runtimePaths(process.cwd(), definition);
      const lineCount = Number.parseInt(extra ?? '40', 10);
      console.log(formatRuntimeLogs(paths, Number.isInteger(lineCount) ? lineCount : 40));
      return;
    }

    const definitions = selectDefinitions(name, {
      allowAll: command !== 'restart' && command !== 'wait',
    });
    for (const definition of definitions) {
      if (command === 'start') {
        const result = await startRuntime(definition);
        console.log(`${formatStatus(result)}${result.reused ? ' (reused)' : ' (launch requested)'}`);
        if (!result.healthy) {
          console.log(`Verify with: npm run runtime:wait -- ${definition.name} (bounded to ${getCliWaitTimeoutMs(definition)}ms)`);
        }
        continue;
      }
      if (command === 'wait') {
        const timeoutMs = getCliWaitTimeoutMs(
          definition,
          explicitTimeoutMs,
        );
        const result = await waitForRuntime(definition, {
          timeoutMs,
        });
        if (result.pending) {
          console.log(
            `${formatStatus(result)} (still starting; retry npm run runtime:wait -- ${definition.name})`,
          );
        } else {
          console.log(`${formatStatus(result)} (ready)`);
        }
        continue;
      }
      if (command === 'stop') {
        const result = await stopRuntime(definition);
        console.log(formatStatus(result));
        continue;
      }
      if (command === 'restart') {
        const result = await restartRuntime(definition, {
          onProgress: (phase) => {
            const message =
              phase === 'stopping'
                ? 'stopping the owned process'
                : 'starting a detached replacement';
            console.log(`${definition.name}: ${message}...`);
          },
        });
        console.log(`${formatStatus(result)} (restart requested)`);
        console.log(`Verify with: npm run runtime:wait -- ${definition.name} (bounded to ${getCliWaitTimeoutMs(definition)}ms)`);
        continue;
      }
      throw new Error(`Unknown runtime command: ${command}`);
    }
  } finally {
    clearTimeout(deadline);
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      fs.writeSync(2, `[runtime-manager] ${error.message}\n`);
      process.exit(1);
    });
}
