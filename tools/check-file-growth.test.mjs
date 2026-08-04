import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const checkerPath = fileURLToPath(
  new URL('./check-file-growth.mjs', import.meta.url),
);

const createFixture = async (t, { baseline, files = {} }) => {
  const root = await mkdtemp(path.join(tmpdir(), 'codewave-file-growth-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  await mkdir(path.join(root, 'tools'), { recursive: true });
  await writeFile(
    path.join(root, 'tools', 'quality-baseline.json'),
    JSON.stringify(baseline),
    'utf8',
  );

  for (const [relative, contents] of Object.entries(files)) {
    const filePath = path.join(root, relative);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, 'utf8');
  }

  return root;
};

const runChecker = (cwd) =>
  spawnSync(process.execPath, [checkerPath], {
    cwd,
    encoding: 'utf8',
    timeout: 10_000,
  });

const baseline = (grandfathered = {}) => ({
  defaults: { ui: 500, backend: 800, test: 1000 },
  grandfathered,
});

test('rejects a grandfathered entry whose file was removed', async (t) => {
  const root = await createFixture(t, {
    baseline: baseline({
      'mobile/src/screens/Removed.js': { maxLines: 600, targetLines: 500 },
    }),
  });

  const result = runChecker(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /stale grandfathered entry/);
});

test('requires the ratchet to move down when a large file shrinks', async (t) => {
  const currentLines = Array.from({ length: 501 }, () => '// line').join('\n');
  const root = await createFixture(t, {
    baseline: baseline({
      'mobile/src/screens/Large.js': { maxLines: 550, targetLines: 500 },
    }),
    files: { 'mobile/src/screens/Large.js': currentLines },
  });

  const result = runChecker(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /lower maxLines to 501/);
});

test('accepts an exact grandfathered maximum', async (t) => {
  const currentLines = Array.from({ length: 501 }, () => '// line').join('\n');
  const root = await createFixture(t, {
    baseline: baseline({
      'mobile/src/screens/Large.js': { maxLines: 501, targetLines: 500 },
    }),
    files: { 'mobile/src/screens/Large.js': currentLines },
  });

  const result = runChecker(root);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /File growth policy passed/);
});

test('rejects a new UI module above the default limit', async (t) => {
  const currentLines = Array.from({ length: 501 }, () => '// line').join('\n');
  const root = await createFixture(t, {
    baseline: baseline(),
    files: { 'frontend/src/screens/NewScreen.js': currentLines },
  });

  const result = runChecker(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /501 lines \(limit 500\)/);
});
