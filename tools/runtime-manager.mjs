#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

import {
  getRuntimeDefinition,
  listRuntimeDefinitions,
  normalizeSpawnEnvironment,
} from './runtime-definitions.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const WATCHDOG_PATH = path.join(TOOLS_DIR, 'runtime-watchdog.mjs');
const DEFAULT_START_TIMEOUT_MS = 30_000;
const DEFAULT_STOP_TIMEOUT_MS = 15_000;
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

function writeJsonAtomic(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

function removeFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'EPERM') return true;
    return false;
  }
}

function parseWindowsListeners(output, port) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 5)
    .filter((parts) => parts[3] === 'LISTENING' && parts[1].endsWith(`:${port}`))
    .map((parts) => Number.parseInt(parts[4], 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

export function getListeningPid(port, platform = process.platform) {
  try {
    if (platform === 'win32') {
      const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return parseWindowsListeners(output, port)[0] ?? null;
    }

    const output = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const pid = Number.parseInt(output.split(/\r?\n/)[0] ?? '', 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export function probeHealth(url, timeoutMs = 2_500) {
  if (!url) return Promise.resolve(false);
  return new Promise((resolve) => {
    const client = url.startsWith('https://') ? https : http;
    const request = client.get(url, { timeout: timeoutMs }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

function isOwnedLock(lock, definition) {
  return Boolean(
    lock?.instanceId
      && lock.name === definition.name
      && lock.port === definition.port
      && isPidAlive(Number(lock.watchdogPid)),
  );
}

export async function getRuntimeStatus(definition, options = {}) {
  const rootDirectory = path.resolve(options.rootDirectory ?? process.cwd());
  const paths = runtimePaths(rootDirectory, definition);
  const lock = readJson(paths.lock);
  const listenerPid = getListeningPid(definition.port);
  const shouldProbeHealth = options.probeHealth !== false;
  const healthy = listenerPid
    ? definition.healthUrl
      ? shouldProbeHealth
        ? await probeHealth(definition.healthUrl)
        : null
      : true
    : false;
  const lockOwned = isOwnedLock(lock, definition);
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
  else if (lockOwned) state = 'managed-starting';
  else if (lock) state = 'stale-lock';

  return {
    name: definition.name,
    port: definition.port,
    healthUrl: definition.healthUrl || null,
    state,
    healthy,
    listenerPid,
    lock,
    paths,
  };
}

function tailFile(filePath, lineCount = 30) {
  if (!fs.existsSync(filePath)) return '';
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - lineCount - 1)).join('\n').trim();
}

function formatFailureLogs(paths) {
  return [
    tailFile(paths.managerLog, 20),
    tailFile(paths.stderrLog, 30),
  ].filter(Boolean).join('\n');
}

function terminateOwnedTree(lock) {
  if (process.platform === 'win32') {
    const ownedPids = [
      Number(lock?.watchdogPid),
      Number(lock?.listenerPid),
      Number(lock?.childPid),
    ].filter((pid, index, values) => (
      Number.isInteger(pid)
        && pid > 0
        && values.indexOf(pid) === index
    ));
    for (const pid of ownedPids) {
      if (!isPidAlive(pid)) continue;
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // The bounded stop check below reports any listener that survives.
      }
    }
    return;
  }

  const watchdogPid = Number(lock?.watchdogPid);
  if (!isPidAlive(watchdogPid)) return;
  try {
    process.kill(-watchdogPid, 'SIGTERM');
  } catch {
    process.kill(watchdogPid, 'SIGTERM');
  }
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
  const watchdogArguments = [
    WATCHDOG_PATH,
    '--name', definition.name,
    '--port', String(definition.port),
    '--cwd', definition.cwd,
    '--runtime-dir', definition.runtimeDirectory ?? '.runtime',
    '--instance-id', instanceId,
  ];
  if (definition.healthUrl) {
    watchdogArguments.push('--health-url', definition.healthUrl);
  }
  watchdogArguments.push('--', ...definition.command);

  const watchdog = spawn(process.execPath, watchdogArguments, {
    cwd: rootDirectory,
    detached: true,
    windowsHide: true,
    env: normalizeSpawnEnvironment({
      ...(options.environment ?? process.env),
      CODEWAVE_RUNTIME_DETACHED: '1',
    }),
    stdio: 'ignore',
  });
  watchdog.unref();

  const launchReservation = {
    version: 1,
    instanceId,
    name: definition.name,
    port: definition.port,
    cwd: path.resolve(rootDirectory, definition.cwd),
    healthUrl: definition.healthUrl || null,
    watchdogPid: watchdog.pid,
    childPid: null,
    listenerPid: null,
    startedAt: new Date().toISOString(),
    command: definition.command,
    status: 'launching',
  };
  const currentLock = readJson(paths.lock);
  if (
    !currentLock
      || currentLock.instanceId === instanceId
      || !isPidAlive(Number(currentLock.watchdogPid))
  ) {
    writeJsonAtomic(paths.lock, launchReservation);
  }

  return {
    name: definition.name,
    port: definition.port,
    healthUrl: definition.healthUrl || null,
    state: 'managed-starting',
    healthy: false,
    listenerPid: null,
    lock: launchReservation,
    paths,
    instanceId,
    watchdogPid: watchdog.pid,
    reused: false,
  };
}

export async function waitForRuntime(definition, options = {}) {
  const rootDirectory = path.resolve(options.rootDirectory ?? process.cwd());
  const paths = runtimePaths(rootDirectory, definition);
  const timeoutMs = options.timeoutMs ?? DEFAULT_START_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;
  while (Date.now() < deadline) {
    lastStatus = await getRuntimeStatus(definition, { rootDirectory });
    if (lastStatus.healthy) {
      return lastStatus;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  lastStatus = await getRuntimeStatus(definition, { rootDirectory });
  if (isOwnedLock(lastStatus.lock, definition)) {
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

  terminateOwnedTree(status.lock);
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_STOP_TIMEOUT_MS);
  while (Date.now() < deadline && getListeningPid(definition.port)) {
    await sleep(POLL_INTERVAL_MS);
  }
  if (getListeningPid(definition.port)) {
    throw new Error(`${definition.name} did not release port ${definition.port} after stop.`);
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
  await stopRuntime(definition, options);
  return startRuntime(definition, options);
}

function formatStatus(status) {
  const pid = status.listenerPid ? ` PID ${status.listenerPid}` : '';
  return `${status.name.padEnd(20)} ${status.state.padEnd(18)} port ${status.port}${pid}`;
}

function printUsage() {
  console.log(`Usage:
  node tools/runtime-manager.mjs start [runtime-name]
  node tools/runtime-manager.mjs wait <runtime-name> [timeout-ms]
  node tools/runtime-manager.mjs stop [runtime-name]
  node tools/runtime-manager.mjs restart <runtime-name>
  node tools/runtime-manager.mjs status [runtime-name]
  node tools/runtime-manager.mjs logs <runtime-name> [line-count]

Runtime names: ${listRuntimeDefinitions().map((entry) => entry.name).join(', ')}
`);
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
    printUsage();
    return;
  }

  if (command === 'status') {
    for (const definition of selectDefinitions(name)) {
      console.log(formatStatus(await getRuntimeStatus(definition)));
    }
    return;
  }

  if (command === 'logs') {
    const [definition] = selectDefinitions(name, { allowAll: false });
    const paths = runtimePaths(process.cwd(), definition);
    const lineCount = Number.parseInt(extra ?? '40', 10);
    console.log(tailFile(paths.managerLog, Number.isInteger(lineCount) ? lineCount : 40));
    console.log(tailFile(paths.stderrLog, Number.isInteger(lineCount) ? lineCount : 40));
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
        console.log(`Verify with: npm run runtime:wait -- ${definition.name}`);
      }
      continue;
    }
    if (command === 'wait') {
      const timeoutMs = Number.parseInt(extra ?? String(DEFAULT_START_TIMEOUT_MS), 10);
      const result = await waitForRuntime(definition, {
        timeoutMs: Number.isInteger(timeoutMs) && timeoutMs > 0
          ? timeoutMs
          : DEFAULT_START_TIMEOUT_MS,
      });
      console.log(`${formatStatus(result)} (ready)`);
      continue;
    }
    if (command === 'stop') {
      const result = await stopRuntime(definition);
      console.log(formatStatus(result));
      continue;
    }
    if (command === 'restart') {
      const result = await restartRuntime(definition);
      console.log(`${formatStatus(result)} (restart requested)`);
      console.log(`Verify with: npm run runtime:wait -- ${definition.name}`);
      continue;
    }
    throw new Error(`Unknown runtime command: ${command}`);
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main()
    .then(() => {
      process.stdout.write('', () => process.exit(0));
    })
    .catch((error) => {
      console.error(`[runtime-manager] ${error.message}`);
      process.stderr.write('', () => process.exit(1));
    });
}
