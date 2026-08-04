import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  createDirtyWorktreeSnapshot,
  createSnapshotLabel,
  parseSnapshotArgs,
} from './worktree-snapshot.mjs';

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 15_000,
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout;
};

const createRepository = () => {
  const repository = mkdtempSync(path.join(os.tmpdir(), 'worktree-snapshot-'));
  run('git', ['init', '--quiet', '--initial-branch=main'], repository);
  run('git', ['config', 'user.email', 'snapshot@example.test'], repository);
  run('git', ['config', 'user.name', 'Snapshot Test'], repository);
  writeFileSync(path.join(repository, 'tracked.txt'), 'before\n');
  writeFileSync(path.join(repository, 'deleted.txt'), 'remove me\n');
  run('git', ['add', '.'], repository);
  run('git', ['commit', '--quiet', '-m', 'fixture'], repository);
  return repository;
};

test('creates a recoverable snapshot for staged, unstaged, deleted, and untracked work', () => {
  const repository = createRepository();
  const recovery = mkdtempSync(path.join(os.tmpdir(), 'worktree-recovery-'));
  const progress = [];
  try {
    writeFileSync(path.join(repository, 'tracked.txt'), 'after\n');
    run('git', ['add', 'tracked.txt'], repository);
    rmSync(path.join(repository, 'deleted.txt'));
    writeFileSync(path.join(repository, 'untracked.txt'), 'new file\n');

    const result = createDirtyWorktreeSnapshot({
      cwd: repository,
      outputDirectory: path.join(repository, '.snapshots'),
      label: 'fixture',
      timeoutMs: 15_000,
      onProgress: (message) => progress.push(message),
    });

    assert.equal(result.manifest.summary.total, 3);
    assert.equal(result.manifest.summary.staged, 1);
    assert.equal(result.manifest.summary.untracked, 1);
    assert.equal(result.manifest.artifacts.untrackedArchive.entries, 1);
    assert.ok(existsSync(result.files.manifest));
    assert.deepEqual(progress, [
      'Resolving repository and worktree state.',
      'Capturing 3 tracked and untracked changes.',
      'Archiving 1 untracked path.',
      'Promoting verified snapshot artifacts.',
      'Snapshot artifacts are ready.',
    ]);

    run('git', ['clone', '--quiet', repository, recovery], repository);
    run('git', ['apply', result.files.patch], recovery);
    run('tar', ['-xzf', result.files.archive], recovery);
    assert.equal(
      readFileSync(path.join(recovery, 'tracked.txt'), 'utf8').replace(/\r\n/g, '\n'),
      'after\n',
    );
    assert.equal(existsSync(path.join(recovery, 'deleted.txt')), false);
    assert.equal(
      readFileSync(path.join(recovery, 'untracked.txt'), 'utf8').replace(/\r\n/g, '\n'),
      'new file\n',
    );
  } finally {
    rmSync(repository, { recursive: true, force: true });
    rmSync(recovery, { recursive: true, force: true });
  }
});

test('refuses to overwrite a snapshot with the same label', () => {
  const repository = createRepository();
  try {
    writeFileSync(path.join(repository, 'tracked.txt'), 'changed\n');
    const options = {
      cwd: repository,
      outputDirectory: path.join(repository, '.snapshots'),
      label: 'collision',
      timeoutMs: 15_000,
    };
    createDirtyWorktreeSnapshot(options);
    assert.throws(
      () => createDirtyWorktreeSnapshot(options),
      /Snapshot artifact already exists/,
    );
  } finally {
    rmSync(repository, { recursive: true, force: true });
  }
});

test('removes partial artifacts when archive creation fails', () => {
  const repository = createRepository();
  const outputDirectory = path.join(repository, '.snapshots');
  try {
    writeFileSync(path.join(repository, 'untracked.txt'), 'new\n');
    assert.throws(
      () =>
        createDirtyWorktreeSnapshot({
          cwd: repository,
          outputDirectory,
          label: 'failed',
          timeoutMs: 15_000,
          commandRunner(command, args, options) {
            if (command === 'tar' && args[0] === '-czf') {
              throw new Error('simulated tar failure');
            }
            const result = spawnSync(command, args, {
              ...options,
              maxBuffer: 16 * 1024 * 1024,
              windowsHide: true,
            });
            if (result.status !== 0) {
              throw new Error(String(result.stderr));
            }
            return result.stdout;
          },
        }),
      /simulated tar failure/,
    );
    assert.equal(
      existsSync(path.join(outputDirectory, 'failed-manifest.json')),
      false,
    );
    assert.equal(
      existsSync(path.join(outputDirectory, 'failed-tracked.patch')),
      false,
    );
  } finally {
    rmSync(repository, { recursive: true, force: true });
  }
});

test('parses bounded CLI options and creates stable timestamp labels', () => {
  assert.deepEqual(
    parseSnapshotArgs([
      '--label',
      'checkpoint',
      '--output-dir',
      'out',
      '--timeout-ms',
      '20000',
      '--json',
    ]),
    {
      label: 'checkpoint',
      outputDirectory: 'out',
      timeoutMs: 20_000,
      json: true,
    },
  );
  assert.equal(
    createSnapshotLabel(new Date('2026-08-02T01:02:03.456Z')),
    'dirty-state-20260802-010203Z',
  );
});
