#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync, spawn } from 'node:child_process';
import { format } from 'node:util';

import { normalizeSpawnEnvironment } from './runtime-definitions.mjs';
import {
  getRuntimeLogPolicy,
  removeFileSafely,
  rotateLogFile,
  writeJsonAtomic,
} from './runtime-file-utils.mjs';
import { getListeningPid } from './runtime-port-listener.mjs';
import {
  getProcessIdentity,
  inspectRecordedProcessOwnership,
  isSameProcessIdentity,
} from './runtime-process-tree.mjs';
import { probeHealth } from './runtime-probe.mjs';

let runtimeDirectory = path.join(process.cwd(), '.runtime');
let watchdogDirectory = path.join(runtimeDirectory, 'watchdogs');
const RESTART_DELAY_MS = 1500;
const DEFAULT_LISTENER_TIMEOUT_MS = 30_000;
const OS_COMMAND_TIMEOUT_MS = 3_000;

function printUsage() {
  console.log(`Usage:
  node tools/runtime-watchdog.mjs --name <runtime-name> --port <port> --cwd <dir> [--health-url <url>] [--listener-timeout-ms <ms>] -- <command> [args...]

Example:
  node tools/runtime-watchdog.mjs --name staff-web --port 3002 --cwd frontend --health-url http://127.0.0.1:3002/bookings -- npm run dev -- --port 3002
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const separatorIndex = argv.indexOf('--');
  if (separatorIndex === -1) {
    throw new Error('Missing `--` separator before the child command.');
  }

  const flags = argv.slice(0, separatorIndex);
  const command = argv.slice(separatorIndex + 1);
  const options = {
    name: '',
    port: 0,
    cwd: '',
    healthUrl: '',
    instanceId: '',
    runtimeDir: '.runtime',
    listenerTimeoutMs: DEFAULT_LISTENER_TIMEOUT_MS,
  };

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    const value = flags[index + 1];
    if (flag === '--name') {
      options.name = value ?? '';
      index += 1;
      continue;
    }
    if (flag === '--port') {
      options.port = Number.parseInt(value ?? '', 10);
      index += 1;
      continue;
    }
    if (flag === '--cwd') {
      options.cwd = value ?? '';
      index += 1;
      continue;
    }
    if (flag === '--health-url') {
      options.healthUrl = value ?? '';
      index += 1;
      continue;
    }
    if (flag === '--instance-id') {
      options.instanceId = value ?? '';
      index += 1;
      continue;
    }
    if (flag === '--runtime-dir') {
      options.runtimeDir = value ?? '.runtime';
      index += 1;
      continue;
    }
    if (flag === '--listener-timeout-ms') {
      options.listenerTimeoutMs = Number.parseInt(value ?? '', 10);
      index += 1;
      continue;
    }
    throw new Error(`Unknown flag: ${flag}`);
  }

  if (!options.name) {
    throw new Error('Missing required --name value.');
  }
  if (!Number.isInteger(options.port) || options.port <= 0) {
    throw new Error('Missing valid --port value.');
  }
  if (!options.cwd) {
    throw new Error('Missing required --cwd value.');
  }
  if (
    !Number.isInteger(options.listenerTimeoutMs) ||
    options.listenerTimeoutMs <= 0
  ) {
    throw new Error('Missing valid --listener-timeout-ms value.');
  }
  if (command.length === 0) {
    throw new Error('Missing child command after `--`.');
  }

  return { options, command };
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function installDetachedLogger(name) {
  if (process.env.CODEWAVE_RUNTIME_DETACHED !== '1') return;
  const baseDirectory = path.join(runtimeDirectory, 'managed', name);
  ensureDirectory(baseDirectory);
  const managerLog = path.join(baseDirectory, 'manager.log');
  rotateLogFile(managerLog, getRuntimeLogPolicy());
  const append = (level, args) => {
    const message = format(...args);
    fs.appendFileSync(
      managerLog,
      `${new Date().toISOString()} ${level} ${message}\n`,
      'utf8',
    );
  };
  console.log = (...args) => append('INFO', args);
  console.error = (...args) => append('ERROR', args);
}

function lockFilePath(name) {
  return path.join(watchdogDirectory, `${name}.json`);
}

function isPidAlive(pid) {
  if (!pid || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'EPERM') return true;
    return false;
  }
}

function readLock(name) {
  const filePath = lockFilePath(name);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeLock(name, data) {
  ensureDirectory(watchdogDirectory);
  writeJsonAtomic(lockFilePath(name), data);
}

function removeLock(name) {
  const filePath = lockFilePath(name);
  return removeFileSafely(filePath);
}

function removeOwnedLock(name, instanceId) {
  const current = readLock(name);
  if (!current || !instanceId || current.instanceId === instanceId) {
    removeLock(name);
  }
}

function getProcessName(pid) {
  if (!pid) {
    return 'unknown';
  }

  try {
    const output = execFileSync(
      'tasklist',
      ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: OS_COMMAND_TIMEOUT_MS,
        windowsHide: true,
      },
    ).trim();

    if (!output || output.startsWith('INFO:')) {
      return 'unknown';
    }

    const [imageName] = output.replace(/^"|"$/g, '').split('","');
    return imageName || 'unknown';
  } catch {
    return 'unknown';
  }
}

function createLogPaths(name) {
  const baseDir = path.join(runtimeDirectory, 'managed', name);
  ensureDirectory(baseDir);
  return {
    stdout: path.join(baseDir, 'stdout.log'),
    stderr: path.join(baseDir, 'stderr.log'),
  };
}

function openLogStream(filePath, forceRotate = false) {
  rotateLogFile(filePath, getRuntimeLogPolicy(), { force: forceRotate });
  return fs.createWriteStream(filePath, { flags: 'a' });
}

function resolveChildCommand(command) {
  const executable = command[0];
  const args = command.slice(1);
  if (process.platform !== 'win32' || !/^npm(?:\.cmd)?$/i.test(executable)) {
    return { executable, args };
  }

  const npmCliPath = process.env.npm_execpath
    || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (!fs.existsSync(npmCliPath)) {
    throw new Error(`Unable to resolve npm CLI at ${npmCliPath}`);
  }
  return {
    executable: process.execPath,
    args: [npmCliPath, ...args],
  };
}

async function main() {
  const { options, command } = parseArgs(process.argv.slice(2));
  runtimeDirectory = path.resolve(process.cwd(), options.runtimeDir);
  watchdogDirectory = path.join(runtimeDirectory, 'watchdogs');
  installDetachedLogger(options.name);
  const instanceId = options.instanceId || `${process.pid}-${Date.now()}`;
  const workingDirectory = path.resolve(process.cwd(), options.cwd);
  const existingLock = readLock(options.name);
  const watchdogIdentity = getProcessIdentity(process.pid) ?? {
    pid: process.pid,
    startedAt: new Date(Date.now() - (process.uptime() * 1_000)).toISOString(),
    executablePath: process.execPath,
    commandLine: process.argv.join(' '),
  };

  if (
    existingLock?.watchdogPid
      && isSameProcessIdentity(
        existingLock.watchdogIdentity,
        getProcessIdentity(Number(existingLock.watchdogPid)),
      )
      && existingLock.instanceId !== instanceId
  ) {
    console.log(
      `[watchdog:${options.name}] already running (watchdog PID ${existingLock.watchdogPid}) for port ${existingLock.port}. No new process started.`,
    );
    return;
  }

  if (existingLock && existingLock.instanceId !== instanceId) {
    const ownership = inspectRecordedProcessOwnership(existingLock);
    if (!ownership.safeToClear) {
      console.error(
        `[watchdog:${options.name}] existing metadata ownership is still active or unknown. No new process started.`,
      );
      return;
    }
    if (!removeLock(options.name)) {
      console.error(
        `[watchdog:${options.name}] stale metadata is still locked. No new process started.`,
      );
      return;
    }
  }

  const currentPid = getListeningPid(options.port);
  const currentProcessName = getProcessName(currentPid);
  const portIsHealthy = await probeHealth(options.healthUrl);

  if (currentPid) {
    console.log(
      `[watchdog:${options.name}] port ${options.port} is already owned by PID ${currentPid} (${currentProcessName}). ` +
        `${portIsHealthy ? 'Health-check passed' : 'Health-check failed or timed out'}. Not spawning another instance.`,
    );
    return;
  }

  let shuttingDown = false;
  let child = null;
  let childGeneration = 0;
  let firstChildStart = true;

  const shutdown = (signalName) => {
    shuttingDown = true;
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
    removeOwnedLock(options.name, instanceId);
    console.log(`[watchdog:${options.name}] stopped (${signalName}).`);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('exit', () => removeOwnedLock(options.name, instanceId));

  const logs = createLogPaths(options.name);

  const startChild = () => {
    if (shuttingDown) {
      return;
    }

    const stdoutStream = openLogStream(logs.stdout, firstChildStart);
    const stderrStream = openLogStream(logs.stderr, firstChildStart);
    firstChildStart = false;

    console.log(`[watchdog:${options.name}] starting child command on port ${options.port}: ${command.join(' ')}`);

    const resolvedCommand = resolveChildCommand(command);
    child = spawn(resolvedCommand.executable, resolvedCommand.args, {
      cwd: workingDirectory,
      shell: false,
      windowsHide: true,
      env: {
        ...normalizeSpawnEnvironment(process.env),
        CODEWAVE_WATCHDOG_NAME: options.name,
        CODEWAVE_WATCHDOG_PORT: String(options.port),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const childIdentity = getProcessIdentity(child.pid);
    const generation = ++childGeneration;

    writeLock(options.name, {
      version: 1,
      instanceId,
      name: options.name,
      port: options.port,
      cwd: workingDirectory,
      healthUrl: options.healthUrl || null,
      watchdogPid: process.pid,
      watchdogIdentity,
      childPid: child.pid,
      childIdentity,
      listenerPid: null,
      listenerIdentity: null,
      startedAt: new Date().toISOString(),
      command,
      status: 'starting',
      startupTimeoutMs: options.listenerTimeoutMs,
    });

    const listenerDeadline = Date.now() + options.listenerTimeoutMs;
    const recordListener = () => {
      if (shuttingDown || child?.killed || generation !== childGeneration) return;
      const listenerPid = getListeningPid(options.port);
      if (listenerPid) {
        const current = readLock(options.name);
        if (current?.instanceId === instanceId) {
          writeLock(options.name, {
            ...current,
            listenerPid,
            listenerIdentity: getProcessIdentity(listenerPid),
            status: 'healthy',
            readyAt: new Date().toISOString(),
          });
        }
        return;
      }
      const retryDelay = Date.now() < listenerDeadline ? 200 : 2_000;
      setTimeout(recordListener, retryDelay);
    };
    setTimeout(recordListener, 100);

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.stdout.pipe(stdoutStream);
    child.stderr.pipe(stderrStream);

    child.on('exit', (code, signal) => {
      stdoutStream.end();
      stderrStream.end();

      if (shuttingDown) {
        return;
      }

      console.log(
        `[watchdog:${options.name}] child exited (code=${code ?? 'null'}, signal=${signal ?? 'null'}). Restarting in ${RESTART_DELAY_MS}ms...`,
      );

      setTimeout(() => {
        const portOwner = getListeningPid(options.port);
        if (portOwner) {
          console.log(
            `[watchdog:${options.name}] port ${options.port} became occupied by PID ${portOwner}. Watchdog will not spawn a duplicate.`,
          );
          removeOwnedLock(options.name, instanceId);
          process.exit(0);
        }

        startChild();
      }, RESTART_DELAY_MS);
    });
  };

  writeLock(options.name, {
    version: 1,
    instanceId,
    name: options.name,
    port: options.port,
    cwd: workingDirectory,
    healthUrl: options.healthUrl || null,
    watchdogPid: process.pid,
    watchdogIdentity,
    childPid: null,
    childIdentity: null,
    listenerPid: null,
    listenerIdentity: null,
    startedAt: new Date().toISOString(),
    command,
    status: 'starting',
    startupTimeoutMs: options.listenerTimeoutMs,
  });

  startChild();
}

main().catch((error) => {
  console.error(`[watchdog] ${error.message}`);
  printUsage();
  process.exit(1);
});
