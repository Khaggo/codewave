import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { resolveLatestMigrationSnapshot } from './migration-snapshot.mjs';

const createFixture = (journal, snapshots = []) => {
  const root = mkdtempSync(path.join(tmpdir(), 'autocare-migration-snapshot-'));
  const meta = path.join(root, 'backend', 'drizzle', 'meta');
  mkdirSync(meta, { recursive: true });
  writeFileSync(path.join(meta, '_journal.json'), JSON.stringify(journal));
  for (const name of snapshots) {
    writeFileSync(path.join(meta, name), '{}');
  }
  return root;
};

test('resolves the snapshot belonging to the highest journal index', () => {
  const root = createFixture(
    { entries: [{ idx: 0 }, { idx: 2 }, { idx: 1 }] },
    ['0000_snapshot.json', '0001_snapshot.json', '0002_snapshot.json'],
  );

  assert.equal(
    path.basename(resolveLatestMigrationSnapshot(root)),
    '0002_snapshot.json',
  );
});

test('fails closed for an empty or malformed journal', () => {
  assert.throws(
    () => resolveLatestMigrationSnapshot(createFixture({ entries: [] })),
    /at least one entry/,
  );
  assert.throws(
    () => resolveLatestMigrationSnapshot(createFixture({ entries: [{ idx: -1 }] })),
    /invalid migration index/,
  );
});

test('fails when the latest journal snapshot is absent', () => {
  const root = createFixture(
    { entries: [{ idx: 0 }, { idx: 1 }] },
    ['0000_snapshot.json'],
  );

  assert.throws(() => resolveLatestMigrationSnapshot(root), /snapshot is missing/);
});
