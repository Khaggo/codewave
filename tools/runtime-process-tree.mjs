import { execFileSync } from 'node:child_process';
import process from 'node:process';

const DEFAULT_PROCESS_COMMAND_TIMEOUT_MS = 5_000;

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
  const ownedPids = getOwnedPids(lock);
  const watchdogPid = Number(lock?.watchdogPid);
  const execute = options.execute ?? execFileSync;
  const timeout = options.timeoutMs ?? DEFAULT_PROCESS_COMMAND_TIMEOUT_MS;

  if (process.platform === 'win32') {
    if (isPidAlive(watchdogPid)) {
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
        // The manager verifies every recorded PID and reports survivors.
      }
    }
    for (const pid of ownedPids) {
      if (!isPidAlive(pid)) continue;
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // The manager verifies every recorded PID and reports survivors.
      }
    }
    return ownedPids;
  }

  if (!isPidAlive(watchdogPid)) return ownedPids;
  try {
    process.kill(-watchdogPid, 'SIGTERM');
  } catch {
    process.kill(watchdogPid, 'SIGTERM');
  }
  return ownedPids;
}
