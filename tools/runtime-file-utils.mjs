import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const WINDOWS_RENAME_RETRY_DELAYS_MS = [10, 25, 50, 100, 200];
const DEFAULT_LOG_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_LOG_RETAINED_FILES = 3;

function sleepSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

export function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  for (let attempt = 0; ; attempt += 1) {
    try {
      fs.renameSync(temporaryPath, filePath);
      return;
    } catch (error) {
      const retryableWindowsReplace = process.platform === 'win32'
        && ['EACCES', 'EPERM'].includes(error?.code)
        && attempt < WINDOWS_RENAME_RETRY_DELAYS_MS.length;
      if (!retryableWindowsReplace) {
        try {
          fs.unlinkSync(temporaryPath);
        } catch {}
        throw error;
      }
      sleepSync(WINDOWS_RENAME_RETRY_DELAYS_MS[attempt]);
    }
  }
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRuntimeLogPolicy(environment = process.env) {
  return {
    maxBytes: toPositiveInteger(
      environment.CODEWAVE_RUNTIME_LOG_MAX_BYTES,
      DEFAULT_LOG_MAX_BYTES,
    ),
    retainedFiles: toPositiveInteger(
      environment.CODEWAVE_RUNTIME_LOG_RETAINED_FILES,
      DEFAULT_LOG_RETAINED_FILES,
    ),
  };
}

export function rotateLogFile(
  filePath,
  policy = getRuntimeLogPolicy(),
  options = {},
) {
  if (!fs.existsSync(filePath)) return false;
  if (!options.force && fs.statSync(filePath).size < policy.maxBytes) return false;

  const retainedFiles = toPositiveInteger(
    policy.retainedFiles,
    DEFAULT_LOG_RETAINED_FILES,
  );
  const oldestPath = `${filePath}.${retainedFiles}`;
  if (fs.existsSync(oldestPath)) fs.unlinkSync(oldestPath);

  for (let index = retainedFiles - 1; index >= 1; index -= 1) {
    const sourcePath = `${filePath}.${index}`;
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, `${filePath}.${index + 1}`);
    }
  }

  fs.renameSync(filePath, `${filePath}.1`);
  return true;
}
