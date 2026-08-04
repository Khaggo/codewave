import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const checkerPath = fileURLToPath(new URL('./graphify-check.mjs', import.meta.url));

function runChecker({
  sourceFileExists,
  sourceIsNewer = false,
  generatedSourcePath = '',
  generatedSourceIsNewer = false,
  graphNodeSourcePath = '',
}) {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'graphify-check-'));
  const sourceFile = path.join(workspace, 'tools', 'current.mjs');
  const graphPath = path.join(workspace, 'graphify-out', 'graph.json');
  const generatedSourceFile = generatedSourcePath
    ? path.join(workspace, generatedSourcePath)
    : null;

  mkdirSync(path.dirname(graphPath), { recursive: true });
  if (sourceFileExists) {
    mkdirSync(path.dirname(sourceFile), { recursive: true });
    writeFileSync(sourceFile, 'export const current = true;\n');
  }
  if (generatedSourceFile) {
    mkdirSync(path.dirname(generatedSourceFile), { recursive: true });
    writeFileSync(generatedSourceFile, 'export const generated = true;\n');
  }

  const nodes = Array.from({ length: 5000 }, (_, index) => ({
    id: `node-${index}`,
    source_file: index === 0
      ? graphNodeSourcePath || path.relative(workspace, sourceFile)
      : '',
  }));
  const edges = Array.from({ length: 10000 }, (_, index) => ({
    source: `node-${index % nodes.length}`,
    target: `node-${(index + 1) % nodes.length}`,
  }));
  writeFileSync(graphPath, JSON.stringify({ nodes, edges }));
  if (sourceFileExists && sourceIsNewer) {
    const newerTime = new Date(Date.now() + 5_000);
    utimesSync(sourceFile, newerTime, newerTime);
  }
  if (generatedSourceFile && generatedSourceIsNewer) {
    const newerTime = new Date(Date.now() + 5_000);
    utimesSync(generatedSourceFile, newerTime, newerTime);
  }

  const result = spawnSync(process.execPath, [checkerPath], {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 10_000,
  });
  rmSync(workspace, { recursive: true, force: true });
  return result;
}

test('Graphify check accepts nodes whose source files exist', () => {
  const result = runChecker({ sourceFileExists: true });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Graphify check passed/);
});

test('Graphify check rejects nodes whose source files were deleted', () => {
  const result = runChecker({ sourceFileExists: false });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing source files/);
  assert.match(result.stderr, /tools[\\/]current\.mjs/);
});

test('Graphify check rejects source files changed after the last refresh', () => {
  const result = runChecker({ sourceFileExists: true, sourceIsNewer: true });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /older than 1 source files/);
  assert.match(result.stderr, /tools[\\/]current\.mjs/);
});

test('Graphify check ignores newer generated Storybook output', () => {
  const result = runChecker({
    sourceFileExists: true,
    generatedSourcePath: 'frontend/storybook-static/chunk.js',
    generatedSourceIsNewer: true,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Graphify check passed/);
});

test('Graphify check rejects generated Storybook nodes', () => {
  const generatedSourcePath = 'frontend/storybook-static/chunk.js';
  const result = runChecker({
    sourceFileExists: true,
    generatedSourcePath,
    graphNodeSourcePath: generatedSourcePath,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /generated nodes/);
  assert.match(result.stderr, /storybook-static/);
});

test('Graphify check rejects temporary mobile Storybook bundle nodes', () => {
  const generatedSourcePath = 'tmp/storybook-mobile-index.js';
  const result = runChecker({
    sourceFileExists: true,
    generatedSourcePath,
    graphNodeSourcePath: generatedSourcePath,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /generated nodes/);
  assert.match(result.stderr, /storybook-mobile-index/);
});
