import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findRetiredScopeViolations } from './retired-scope-policy.mjs';

export const REPOSITORY_IGNORED_DIRECTORY_NAMES = new Set([
  '.cache',
  '.codex-runtime',
  '.expo',
  '.git',
  '.managed-runtime',
  '.next',
  '.playwright-mcp',
  '.runtime',
  '.uv-cache',
  '.worktrees',
  'build',
  'coverage',
  'dist',
  'graphify-out',
  'node_modules',
  'out',
  'playwright-report',
  'storybook-static',
  'test-results',
  'tmp',
]);

export const shouldSkipRepositoryDirectory = (entryName) =>
  REPOSITORY_IGNORED_DIRECTORY_NAMES.has(entryName) ||
  entryName.startsWith('.codex-runtime') ||
  entryName.startsWith('.next-') ||
  entryName.startsWith('expo-export');

export const collectProjectLockfiles = (root) => {
  const lockfiles = [];
  const findLockfiles = (directory) => {
    for (const entry of readdirSync(directory)) {
      if (shouldSkipRepositoryDirectory(entry)) {
        continue;
      }
      const entryPath = path.join(directory, entry);
      if (statSync(entryPath).isDirectory()) {
        findLockfiles(entryPath);
      } else if (entry === 'package-lock.json') {
        lockfiles.push(path.relative(root, entryPath).split(path.sep).join('/'));
      }
    }
  };
  findLockfiles(root);
  return lockfiles.sort();
};

const requiredFiles = [
  '.editorconfig',
  '.github/CODEOWNERS',
  '.nvmrc',
  'CONTRIBUTING.md',
  'README.md',
  'SECURITY.md',
  'docs/architecture/repository-map.md',
];

export const checkRepositoryPolicy = (root = process.cwd()) => {
  const errors = [];

  for (const file of requiredFiles) {
    if (!existsSync(path.join(root, file))) {
      errors.push(`Missing required repository file: ${file}`);
    }
  }

  const workflowRoot = path.join(root, '.github', 'workflows');
  if (existsSync(workflowRoot)) {
    const visit = (directory) => {
      for (const entry of readdirSync(directory)) {
        const entryPath = path.join(directory, entry);
        if (statSync(entryPath).isDirectory()) {
          visit(entryPath);
          continue;
        }
        if (!/\.ya?ml$/.test(entry)) {
          continue;
        }
        const source = readFileSync(entryPath, 'utf8');
        for (const match of source.matchAll(/uses:\s*([^@\s]+)@([^\s#]+)/g)) {
          if (!/^[a-f0-9]{40}$/.test(match[2])) {
            errors.push(
              `${path.relative(root, entryPath)} uses ${match[1]} without an immutable SHA`,
            );
          }
        }
      }
    };
    visit(workflowRoot);
  }

  try {
    const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
    const forbidden = tracked
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((file) =>
        /(^|\/)(?:node_modules|coverage|graphify-out|dist|build|\.codex-runtime[^/]*|\.expo|\.managed-runtime|\.next[^/]*|\.playwright-mcp|\.runtime)\//.test(file),
      );
    if (forbidden.length > 0) {
      errors.push(`Generated files are tracked:\n${forbidden.join('\n')}`);
    }
  } catch (error) {
    errors.push(`Unable to inspect tracked files: ${error.message}`);
  }

  const lockfiles = collectProjectLockfiles(root);
  if (lockfiles.length !== 1 || lockfiles[0] !== 'package-lock.json') {
    errors.push(`Expected one root package-lock.json; found: ${lockfiles.join(', ') || 'none'}`);
  }

  const retiredScopeViolations = findRetiredScopeViolations(root);
  if (retiredScopeViolations.length > 0) {
    errors.push(
      [
        'Retired ecommerce references remain in active repository surfaces:',
        ...retiredScopeViolations.map(
          ({ file, line, rule }) => `${file}:${line} (${rule})`,
        ),
      ].join('\n'),
    );
  }

  return errors;
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const errors = checkRepositoryPolicy();
  if (errors.length > 0) {
    console.error(errors.join('\n\n'));
    process.exit(1);
  }

  console.log('Repository policy check passed.');
}
