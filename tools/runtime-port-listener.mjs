import process from 'node:process';
import { execFileSync } from 'node:child_process';

const DEFAULT_OS_COMMAND_TIMEOUT_MS = 3_000;

export function parseWindowsListeners(output, port) {
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

export function getListeningPid(
  port,
  platform = process.platform,
  execute = execFileSync,
) {
  try {
    if (platform === 'win32') {
      const output = execute('netstat', ['-ano', '-p', 'tcp'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: DEFAULT_OS_COMMAND_TIMEOUT_MS,
        windowsHide: true,
      });
      return parseWindowsListeners(output, port)[0] ?? null;
    }

    const output = execute('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: DEFAULT_OS_COMMAND_TIMEOUT_MS,
    }).trim();
    const pid = Number.parseInt(output.split(/\r?\n/)[0] ?? '', 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}
