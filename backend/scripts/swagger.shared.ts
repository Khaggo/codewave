import { openSync, closeSync, existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { Socket } from 'net';
import path from 'path';

export const backendRoot = path.resolve(__dirname, '..');
const runtimeDir = path.join(backendRoot, '.runtime');
const pidFile = path.join(runtimeDir, 'main-service.pid');
const logFile = path.join(runtimeDir, 'main-service.log');

type EnvMap = Record<string, string>;

const parseEnvFile = (filePath: string): EnvMap => {
  if (!existsSync(filePath)) {
    return {};
  }

  const output: EnvMap = {};
  const contents = readFileSync(filePath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    output[key] = value;
  }

  return output;
};

export const loadLocalEnv = (): NodeJS.ProcessEnv => {
  const exampleEnv = parseEnvFile(path.join(backendRoot, '.env.example'));
  const localEnv = parseEnvFile(path.join(backendRoot, '.env'));

  return {
    ...exampleEnv,
    ...localEnv,
    ...process.env,
  };
};

export const getMainServicePort = (env: NodeJS.ProcessEnv) => Number(env.MAIN_SERVICE_PORT ?? '3000');

export const getHealthUrl = (env: NodeJS.ProcessEnv) =>
  `http://127.0.0.1:${getMainServicePort(env)}/api/health`;

export const getDocsJsonUrl = (env: NodeJS.ProcessEnv) =>
  `http://127.0.0.1:${getMainServicePort(env)}/docs-json`;

const runCommand = (command: string, args: string[], env: NodeJS.ProcessEnv) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: backendRoot,
      env,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForPort = async (
  host: string,
  port: number,
  timeoutMs = 60_000,
  intervalMs = 1_000,
) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const isOpen = await new Promise<boolean>((resolve) => {
      const socket = new Socket();

      socket.setTimeout(1_500);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });

    if (isOpen) {
      return;
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${host}:${port}`);
};

export const waitForHttp = async (url: string, timeoutMs = 60_000, intervalMs = 1_000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch {
      // retry until timeout
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${url}`);
};

const ensureRuntimeDir = () => {
  mkdirSync(runtimeDir, { recursive: true });
};

export const readLogTail = (maxChars = 4_000) => {
  if (!existsSync(logFile)) {
    return '';
  }

  const contents = readFileSync(logFile, 'utf8');
  return contents.slice(Math.max(0, contents.length - maxChars));
};

const isPidRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitForProcessExit = async (pid: number, timeoutMs = 10_000, intervalMs = 250) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!isPidRunning(pid)) {
      return true;
    }

    await sleep(intervalMs);
  }

  return !isPidRunning(pid);
};

const killPid = async (pid: number) => {
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('ESRCH')) {
      throw error;
    }

    return;
  }

  if (await waitForProcessExit(pid)) {
    return;
  }

  if (process.platform === 'win32') {
    await runCommand('taskkill', ['/PID', String(pid), '/T', '/F'], process.env);
    return;
  }

  process.kill(-pid, 'SIGKILL');
};

export const stopMainService = async () => {
  if (!existsSync(pidFile)) {
    return false;
  }

  const pid = Number(readFileSync(pidFile, 'utf8').trim());
  if (!Number.isFinite(pid)) {
    unlinkSync(pidFile);
    return false;
  }

  if (!isPidRunning(pid)) {
    unlinkSync(pidFile);
    return false;
  }

  try {
    await killPid(pid);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('not found')) {
      // ignore missing process but surface other taskkill errors
      if (!message.includes('There is no running instance')) {
        throw error;
      }
    }
  }

  unlinkSync(pidFile);
  return true;
};

export const startMainService = async (env: NodeJS.ProcessEnv) => {
  ensureRuntimeDir();
  rmSync(logFile, { force: true });

  const logFd = openSync(logFile, 'a');
  const child = spawn(
    process.execPath,
    ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'apps/main-service/src/main.ts'],
    {
      cwd: backendRoot,
      env,
      detached: true,
      stdio: ['ignore', logFd, logFd],
    },
  );

  closeSync(logFd);
  child.unref();
  writeFileSync(pidFile, String(child.pid));

  return child.pid;
};

export const startInfra = async (env: NodeJS.ProcessEnv) => {
  await runCommand('docker', ['compose', 'up', '-d'], env);
};
