import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  cleanupRuntimeArtifacts,
  collectRuntimeCleanupCandidates,
} from './runtime-retention.mjs';

const NOW_MS = Date.parse('2026-07-29T00:00:00.000Z');
const OLD_DATE = new Date('2026-05-01T00:00:00.000Z');

function makeDirectory(parentPath, name, modifiedAt = OLD_DATE) {
  const directory = path.join(parentPath, name);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'artifact.txt'), 'fixture');
  fs.utimesSync(directory, modifiedAt, modifiedAt);
  return directory;
}

test('runtime cleanup selects only allowlisted old generated artifacts', () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-cleanup-'));
  const rootRuntime = path.join(rootDirectory, '.runtime');
  const mobileRuntime = path.join(rootDirectory, 'mobile', '.runtime');

  try {
    fs.mkdirSync(rootRuntime, { recursive: true });
    fs.mkdirSync(mobileRuntime, { recursive: true });
    const oldRailwayRepro = makeDirectory(rootRuntime, 'railway-web-repro');
    const protectedTrace = makeDirectory(rootRuntime, 'trace-manual-investigation');
    const oldExport = makeDirectory(mobileRuntime, 'export-old-fixture');
    const protectedUploads = makeDirectory(mobileRuntime, 'uploads');
    const freshExport = makeDirectory(
      mobileRuntime,
      'export-fresh-fixture',
      new Date('2026-07-28T00:00:00.000Z'),
    );

    const candidates = collectRuntimeCleanupCandidates({
      rootDirectory,
      retentionDays: 30,
      nowMs: NOW_MS,
    });

    assert.deepEqual(
      candidates.map((candidate) => candidate.path).sort(),
      [oldRailwayRepro, oldExport].sort(),
    );
    assert.equal(fs.existsSync(protectedTrace), true);
    assert.equal(fs.existsSync(protectedUploads), true);
    assert.equal(fs.existsSync(freshExport), true);
  } finally {
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test('runtime cleanup is dry-run by default and mutates only with execute', () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-cleanup-'));
  const runtimeDirectory = path.join(rootDirectory, '.runtime');

  try {
    fs.mkdirSync(runtimeDirectory, { recursive: true });
    const oldExport = makeDirectory(runtimeDirectory, 'export-old-fixture');

    const dryRun = cleanupRuntimeArtifacts({
      rootDirectory,
      retentionDays: 30,
      nowMs: NOW_MS,
    });
    assert.equal(dryRun.execute, false);
    assert.equal(fs.existsSync(oldExport), true);

    const executed = cleanupRuntimeArtifacts({
      rootDirectory,
      retentionDays: 30,
      nowMs: NOW_MS,
      execute: true,
    });
    assert.equal(executed.candidates.length, 1);
    assert.equal(fs.existsSync(oldExport), false);
  } finally {
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  }
});
