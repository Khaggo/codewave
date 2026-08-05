import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  collectProjectLockfiles,
  shouldSkipRepositoryDirectory,
} from './repo-policy-check.mjs';

const createFixture = () => mkdtempSync(path.join(os.tmpdir(), 'repo-policy-'));

test('ignores runtime, dependency, build, and generated directories', () => {
  for (const directory of [
    '.managed-runtime',
    '.runtime',
    '.playwright-mcp',
    '.codex-runtime-cw002',
    '.uv-cache',
    'node_modules',
    'dist',
    'build',
    'coverage',
    'storybook-static',
    'playwright-report',
    'test-results',
    'tmp',
    '.next-build',
    'expo-export-preview',
  ]) {
    assert.equal(shouldSkipRepositoryDirectory(directory), true, directory);
  }
});

test('does not count tool-owned runtime lockfiles as project lockfiles', () => {
  const root = createFixture();
  try {
    writeFileSync(path.join(root, 'package-lock.json'), '{}\n');
    mkdirSync(path.join(root, '.managed-runtime', 'vercel-upload-current'), {
      recursive: true,
    });
    mkdirSync(path.join(root, '.runtime', 'fixture'), { recursive: true });
    mkdirSync(path.join(root, 'dist', 'nested'), { recursive: true });
    writeFileSync(
      path.join(root, '.managed-runtime', 'vercel-upload-current', 'package-lock.json'),
      '{}\n',
    );
    writeFileSync(path.join(root, '.runtime', 'fixture', 'package-lock.json'), '{}\n');
    writeFileSync(path.join(root, 'dist', 'nested', 'package-lock.json'), '{}\n');

    assert.deepEqual(collectProjectLockfiles(root), ['package-lock.json']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('still reports a real nested project lockfile', () => {
  const root = createFixture();
  try {
    writeFileSync(path.join(root, 'package-lock.json'), '{}\n');
    mkdirSync(path.join(root, 'backend'), { recursive: true });
    writeFileSync(path.join(root, 'backend', 'package-lock.json'), '{}\n');

    assert.deepEqual(collectProjectLockfiles(root), [
      'backend/package-lock.json',
      'package-lock.json',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
