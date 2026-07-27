#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import { format } from 'node:util';

import { normalizeSpawnEnvironment } from './runtime-definitions.mjs';

let runtimeDirectory = path.join(process.cwd(), '.runtime');
let watchdogDirectory = path.join(runtimeDirectory, 'watchdogs');
const RESTART_DELAY_MS = 1500;
const HEALTH_TIMEOUT_MS = 2500;

function printUsage() {
  console.log(`Usage:
  node tools/runtime-watchdog.mjs --name <runtime-name> --port <port> --cwd <dir> [--health-url <url>] -- <command> [args...]

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
  const filePath = lockFilePath(name);
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

function removeLock(name) {
  const filePath = lockFilePath(name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function removeOwnedLock(name, instanceId) {
  const current = readLock(name);
  if (!current || !instanceId || current.instanceId === instanceId) {
    removeLock(name);
  }
}

function getPortListeners(port) {
  try {
    const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\s+/);
        if (parts.length < 5) {
          return null;
        }
        return {
          protocol: parts[0],
          localAddress: parts[1],
          foreignAddress: parts[2],
          state: parts[3],
          pid: Number.parseInt(parts[4], 10),
        };
      })
      .filter(Boolean)
      .filter((entry) => entry.localAddress.endsWith(`:${port}`));
  } catch {
    return [];
  }
}

function getListeningPid(port) {
  const listeningEntry = getPortListeners(port).find((entry) => entry.state === 'LISTENING');
  return listeningEntry?.pid ?? null;
}

function getProcessName(pid) {
  if (!pid) {
    return 'unknown';
  }

  try {
    const output = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!output || output.startsWith('INFO:')) {
      return 'unknown';
    }

    const [imageName] = output.replace(/^"|"$/g, '').split('","');
    return imageName || 'unknown';
  } catch {
    return 'unknown';
  }
}

function probeHealth(url) {
  if (!url) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const client = url.startsWith('https://') ? https : http;
    const request = client.get(url, { timeout: HEALTH_TIMEOUT_MS }, (response) => {
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

function createLogPaths(name) {
  const baseDir = path.join(runtimeDirectory, 'managed', name);
  ensureDirectory(baseDir);
  return {
    stdout: path.join(baseDir, 'stdout.log'),
    stderr: path.join(baseDir, 'stderr.log'),
  };
}

function openLogStream(filePath) {
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

  if (
    existingLock?.watchdogPid
      && isPidAlive(existingLock.watchdogPid)
      && existingLock.instanceId !== instanceId
  ) {
    console.log(
      `[watchdog:${options.name}] already running (watchdog PID ${existingLock.watchdogPid}) for port ${existingLock.port}. No new process started.`,
    );
    return;
  }

  if (existingLock && existingLock.instanceId !== instanceId) {
    removeLock(options.name);
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

    const stdoutStream = openLogStream(logs.stdout);
    const stderrStream = openLogStream(logs.stderr);

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

    writeLock(options.name, {
      version: 1,
      instanceId,
      name: options.name,
      port: options.port,
      cwd: workingDirectory,
      healthUrl: options.healthUrl || null,
      watchdogPid: process.pid,
      childPid: child.pid,
      listenerPid: null,
      startedAt: new Date().toISOString(),
      command,
      status: 'starting',
    });

    const listenerDeadline = Date.now() + 30_000;
    const recordListener = () => {
      if (shuttingDown || child?.killed) return;
      const listenerPid = getListeningPid(options.port);
      if (listenerPid) {
        const current = readLock(options.name);
        if (current?.instanceId === instanceId) {
          writeLock(options.name, {
            ...current,
            listenerPid,
            status: 'healthy',
            readyAt: new Date().toISOString(),
          });
        }
        return;
      }
      if (Date.now() < listenerDeadline) {
        setTimeout(recordListener, 200);
      }
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
    childPid: null,
    startedAt: new Date().toISOString(),
    command,
    status: 'starting',
  });

  startChild();
}

main().catch((error) => {
  console.error(`[watchdog] ${error.message}`);
  printUsage();
  process.exit(1);
});
