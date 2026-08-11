import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  getRuntimeLogPolicy,
  removeFileSafely,
  rotateLogFile,
} from './runtime-file-utils.mjs';

test('runtime log policy uses bounded defaults and valid overrides', () => {
  assert.deepEqual(getRuntimeLogPolicy({}), {
    maxBytes: 5 * 1024 * 1024,
    retainedFiles: 3,
  });
  assert.deepEqual(
    getRuntimeLogPolicy({
      CODEWAVE_RUNTIME_LOG_MAX_BYTES: '1024',
      CODEWAVE_RUNTIME_LOG_RETAINED_FILES: '2',
    }),
    { maxBytes: 1024, retainedFiles: 2 },
  );
});

test('Windows stale metadata cleanup tolerates EPERM without looping', () => {
  let removeAttempts = 0;
  const fileSystem = {
    chmodSync() {},
    rmSync() {
      removeAttempts += 1;
      const error = new Error('simulated Windows file lock');
      error.code = 'EPERM';
      throw error;
    },
  };

  assert.equal(
    removeFileSafely('stale-lock.json', { fileSystem, platform: 'win32' }),
    false,
  );
  assert.equal(removeAttempts, 2);
});

test('log rotation retains the configured generations', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-rotation-'));
  const logPath = path.join(directory, 'manager.log');

  try {
    fs.writeFileSync(`${logPath}.1`, 'previous-one');
    fs.writeFileSync(`${logPath}.2`, 'previous-two');
    fs.writeFileSync(logPath, 'current-log-content');

    assert.equal(
      rotateLogFile(logPath, { maxBytes: 4, retainedFiles: 2 }),
      true,
    );
    assert.equal(fs.existsSync(logPath), false);
    assert.equal(fs.readFileSync(`${logPath}.1`, 'utf8'), 'current-log-content');
    assert.equal(fs.readFileSync(`${logPath}.2`, 'utf8'), 'previous-one');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('log rotation leaves files below the threshold untouched', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-rotation-'));
  const logPath = path.join(directory, 'stdout.log');

  try {
    fs.writeFileSync(logPath, 'small');
    assert.equal(
      rotateLogFile(logPath, { maxBytes: 100, retainedFiles: 3 }),
      false,
    );
    assert.equal(fs.readFileSync(logPath, 'utf8'), 'small');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('forced rotation starts a new runtime-instance log below the size threshold', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-rotation-'));
  const logPath = path.join(directory, 'stderr.log');

  try {
    fs.writeFileSync(logPath, 'previous instance');
    assert.equal(
      rotateLogFile(
        logPath,
        { maxBytes: 1024, retainedFiles: 3 },
        { force: true },
      ),
      true,
    );
    assert.equal(fs.existsSync(logPath), false);
    assert.equal(fs.readFileSync(`${logPath}.1`, 'utf8'), 'previous instance');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
