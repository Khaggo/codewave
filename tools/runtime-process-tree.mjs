import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_PROCESS_COMMAND_TIMEOUT_MS = 5_000;

const RECORDED_PROCESS_FIELDS = [
  ['watchdogPid', 'watchdogIdentity'],
  ['childPid', 'childIdentity'],
  ['listenerPid', 'listenerIdentity'],
];

function normalizeIdentityText(value, platform = process.platform) {
  const normalized = String(value ?? '').trim();
  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function getProcessIdentity(pid, options = {}) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const platform = options.platform ?? process.platform;
  const execute = options.execute ?? execFileSync;
  const timeout = options.timeoutMs ?? DEFAULT_PROCESS_COMMAND_TIMEOUT_MS;

  try {
    if (platform === 'win32') {
      const powershellPath = path.join(
        options.systemRoot ?? process.env.SystemRoot ?? 'C:\\Windows',
        'System32',
        'WindowsPowerShell',
        'v1.0',
        'powershell.exe',
      );
      const script = [
        `$target = Get-Process -Id ${pid} -ErrorAction SilentlyContinue;`,
        'if ($null -ne $target) {',
        'Write-Output ([int]$target.Id);',
        "if ($target.StartTime) { Write-Output $target.StartTime.ToUniversalTime().ToString('o') } else { Write-Output '' };",
        "if ($target.Path) { Write-Output $target.Path } else { Write-Output '' }",
        '}',
      ].join(' ');
      const output = execute(
        powershellPath,
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout,
          windowsHide: true,
        },
      ).trim();
      if (!output) return null;
      const [identityPid, startedAt = '', executablePath = ''] = output.split(/\r?\n/);
      return {
        pid: Number(identityPid),
        startedAt: startedAt || null,
        executablePath: executablePath || null,
        commandLine: null,
      };
    }

    const output = execute(
      'ps',
      ['-p', String(pid), '-o', 'lstart=', '-o', 'command='],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout,
      },
    ).trim();
    if (!output) return null;
    const startedAtText = output.slice(0, 24).trim();
    const startedAtValue = Date.parse(startedAtText);
    return {
      pid,
      startedAt: Number.isFinite(startedAtValue)
        ? new Date(startedAtValue).toISOString()
        : null,
      executablePath: null,
      commandLine: output.slice(24).trim() || null,
    };
  } catch {
    return null;
  }
}

export function isSameProcessIdentity(
  recordedIdentity,
  currentIdentity,
  platform = process.platform,
) {
  if (!recordedIdentity || !currentIdentity) return false;
  if (Number(recordedIdentity.pid) !== Number(currentIdentity.pid)) return false;

  const recordedStartedAt = Date.parse(recordedIdentity.startedAt || '');
  const currentStartedAt = Date.parse(currentIdentity.startedAt || '');
  if (Number.isFinite(recordedStartedAt) && Number.isFinite(currentStartedAt)) {
    if (Math.abs(recordedStartedAt - currentStartedAt) > 5_000) return false;
    const recordedPath = normalizeIdentityText(recordedIdentity.executablePath, platform);
    const currentPath = normalizeIdentityText(currentIdentity.executablePath, platform);
    return !recordedPath || !currentPath || recordedPath === currentPath;
  }

  const recordedCommand = normalizeIdentityText(recordedIdentity.commandLine, platform);
  const currentCommand = normalizeIdentityText(currentIdentity.commandLine, platform);
  return Boolean(recordedCommand && currentCommand && recordedCommand === currentCommand);
}

export function inspectRecordedProcessOwnership(lock, options = {}) {
  const inspect = options.getProcessIdentity ?? getProcessIdentity;
  const platform = options.platform ?? process.platform;
  const owned = [];
  const absent = [];
  const notOwned = [];
  const unknown = [];

  for (const [pidField, identityField] of RECORDED_PROCESS_FIELDS) {
    const pid = Number(lock?.[pidField]);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    const currentIdentity = inspect(pid);
    if (!currentIdentity) {
      absent.push(pid);
      continue;
    }
    const recordedIdentity = lock?.[identityField];
    if (!recordedIdentity) {
      unknown.push(pid);
      continue;
    }
    if (isSameProcessIdentity(recordedIdentity, currentIdentity, platform)) {
      owned.push(pid);
    } else {
      notOwned.push(pid);
    }
  }

  return {
    safeToClear: owned.length === 0 && unknown.length === 0,
    owned,
    absent,
    notOwned,
    unknown,
  };
}

export function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'EPERM') return true;
    return false;
  }
}

export function getOwnedPids(lock) {
  return [
    Number(lock?.watchdogPid),
    Number(lock?.listenerPid),
    Number(lock?.childPid),
  ].filter((pid, index, values) => (
    Number.isInteger(pid)
      && pid > 0
      && values.indexOf(pid) === index
  ));
}

export function terminateOwnedTree(lock, options = {}) {
  const watchdogPid = Number(lock?.watchdogPid);
  const execute = options.execute ?? execFileSync;
  const timeout = options.timeoutMs ?? DEFAULT_PROCESS_COMMAND_TIMEOUT_MS;
  const inspect = options.getProcessIdentity ?? getProcessIdentity;
  const currentIdentity = inspect(watchdogPid);
  if (!isSameProcessIdentity(lock?.watchdogIdentity, currentIdentity)) {
    return [];
  }

  if (process.platform === 'win32') {
    try {
      execute(
        'taskkill.exe',
        ['/PID', String(watchdogPid), '/T', '/F'],
        {
          stdio: 'ignore',
          windowsHide: true,
          timeout,
        },
      );
    } catch {
      // The manager verifies the owned watchdog and listener after the attempt.
    }
    return [watchdogPid];
  }

  try {
    process.kill(-watchdogPid, 'SIGTERM');
  } catch {
    process.kill(watchdogPid, 'SIGTERM');
  }
  return [watchdogPid];
}
