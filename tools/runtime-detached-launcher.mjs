import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { writeJsonAtomic } from './runtime-file-utils.mjs';

const TOOLS_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WINDOWS_BOOTSTRAP_PATH = path.join(
  TOOLS_DIRECTORY,
  'runtime-windows-bootstrap.mjs',
);
const WINDOWS_LAUNCH_TIMEOUT_MS = 10_000;

function quotePowerShellLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function launchWindowsWatchdog(watchdogArguments, options) {
  const descriptorPath = path.join(
    options.managedDirectory,
    `launch-${randomUUID()}.json`,
  );
  writeJsonAtomic(descriptorPath, {
    version: 1,
    cwd: options.cwd,
    watchdogArguments,
  });

  const bootstrapArgument = path.relative(options.cwd, WINDOWS_BOOTSTRAP_PATH);
  const descriptorArgument = path.relative(options.cwd, descriptorPath);
  const powershellPath = path.join(
    options.environment.SystemRoot ?? process.env.SystemRoot ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  );
  const startCommand = [
    `$process = Start-Process -FilePath ${quotePowerShellLiteral(process.execPath)}`,
    `-ArgumentList @(${quotePowerShellLiteral(bootstrapArgument)}, ${quotePowerShellLiteral(descriptorArgument)})`,
    `-WorkingDirectory ${quotePowerShellLiteral(options.cwd)}`,
    '-WindowStyle Hidden -PassThru',
  ].join(' ');
  const script = `${startCommand}; [Console]::Out.Write($process.Id)`;

  try {
    const output = execFileSync(
      powershellPath,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        script,
      ],
      {
        cwd: options.cwd,
        encoding: 'utf8',
        env: options.environment,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: WINDOWS_LAUNCH_TIMEOUT_MS,
        windowsHide: true,
      },
    ).trim();
    const bootstrapPid = Number.parseInt(output, 10);
    if (!Number.isInteger(bootstrapPid) || bootstrapPid <= 0) {
      throw new Error(`Start-Process returned an invalid PID: ${output || '(empty)'}`);
    }
    return bootstrapPid;
  } catch (error) {
    try {
      fs.unlinkSync(descriptorPath);
    } catch {
      // The bootstrap may already have consumed the descriptor.
    }
    throw error;
  }
}

export function launchDetachedWatchdog(watchdogArguments, options) {
  if ((options.platform ?? process.platform) === 'win32') {
    return launchWindowsWatchdog(watchdogArguments, options);
  }

  const watchdog = spawn(process.execPath, watchdogArguments, {
    cwd: options.cwd,
    detached: true,
    windowsHide: true,
    env: options.environment,
    stdio: 'ignore',
  });
  if (!Number.isInteger(watchdog.pid)) {
    throw new Error('Detached watchdog launch failed: no process ID was returned');
  }
  watchdog.unref();
  return watchdog.pid;
}
