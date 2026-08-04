#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_RETENTION_DAYS = 30;
const GENERATED_DIRECTORY_PATTERN =
  /^(?:export-.+|checkup-mobile-export|detailed-context-export|qa-mobile-web-export|mobile-performance-export|railway-(?:.+-)?(?:repro|deploy))$/;
const ROTATED_LOG_PATTERN = /\.log\.\d+$/;
const RUNTIME_DIRECTORIES = [
  '.managed-runtime',
  '.runtime',
  'backend/.runtime',
  'frontend/.runtime',
  'mobile/.runtime',
];

function isWithin(parentPath, candidatePath) {
  const relativePath = path.relative(parentPath, candidatePath);
  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  );
}

function collectManagedLogCandidates(runtimeDirectory, cutoffMs) {
  const managedDirectory = path.join(runtimeDirectory, 'managed');
  if (!fs.existsSync(managedDirectory)) return [];

  const candidates = [];
  for (const runtimeEntry of fs.readdirSync(managedDirectory, {
    withFileTypes: true,
  })) {
    if (!runtimeEntry.isDirectory()) continue;
    const runtimePath = path.join(managedDirectory, runtimeEntry.name);
    for (const fileEntry of fs.readdirSync(runtimePath, { withFileTypes: true })) {
      if (!fileEntry.isFile() || !ROTATED_LOG_PATTERN.test(fileEntry.name)) {
        continue;
      }
      const filePath = path.join(runtimePath, fileEntry.name);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoffMs) {
        candidates.push({
          path: filePath,
          kind: 'rotated-log',
          modifiedAt: stat.mtime.toISOString(),
        });
      }
    }
  }
  return candidates;
}

export function collectRuntimeCleanupCandidates({
  rootDirectory = process.cwd(),
  retentionDays = DEFAULT_RETENTION_DAYS,
  nowMs = Date.now(),
} = {}) {
  const normalizedRetentionDays = Number.isFinite(Number(retentionDays))
    ? Math.max(1, Math.floor(Number(retentionDays)))
    : DEFAULT_RETENTION_DAYS;
  const cutoffMs = nowMs - normalizedRetentionDays * 24 * 60 * 60 * 1000;
  const candidates = [];

  for (const relativeDirectory of RUNTIME_DIRECTORIES) {
    const runtimeDirectory = path.resolve(rootDirectory, relativeDirectory);
    if (!fs.existsSync(runtimeDirectory)) continue;

    for (const entry of fs.readdirSync(runtimeDirectory, { withFileTypes: true })) {
      if (!entry.isDirectory() || !GENERATED_DIRECTORY_PATTERN.test(entry.name)) {
        continue;
      }
      const candidatePath = path.join(runtimeDirectory, entry.name);
      const stat = fs.statSync(candidatePath);
      if (stat.mtimeMs < cutoffMs) {
        candidates.push({
          path: candidatePath,
          kind: 'generated-export',
          modifiedAt: stat.mtime.toISOString(),
        });
      }
    }

    candidates.push(...collectManagedLogCandidates(runtimeDirectory, cutoffMs));
  }

  return candidates
    .filter(({ path: candidatePath }) =>
      RUNTIME_DIRECTORIES.some((relativeDirectory) =>
        isWithin(
          path.resolve(rootDirectory, relativeDirectory),
          path.resolve(candidatePath),
        ),
      ),
    )
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function cleanupRuntimeArtifacts(options = {}) {
  const execute = options.execute === true;
  const candidates = collectRuntimeCleanupCandidates(options);
  if (execute) {
    for (const candidate of candidates) {
      fs.rmSync(candidate.path, {
        recursive: candidate.kind === 'generated-export',
        force: true,
      });
    }
  }
  return { execute, candidates };
}

function parseArguments(argv) {
  let execute = false;
  let retentionDays = DEFAULT_RETENTION_DAYS;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--execute') {
      execute = true;
      continue;
    }
    if (argument === '--retention-days') {
      retentionDays = Number.parseInt(argv[index + 1] ?? '', 10);
      index += 1;
      continue;
    }
    if (argument.startsWith('--retention-days=')) {
      retentionDays = Number.parseInt(argument.split('=')[1] ?? '', 10);
      continue;
    }
    throw new Error(`Unknown runtime cleanup argument: ${argument}`);
  }

  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error('Runtime retention days must be a positive integer.');
  }
  return { execute, retentionDays };
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = cleanupRuntimeArtifacts(options);
  const mode = result.execute ? 'deleted' : 'would delete';

  console.log(
    `Runtime cleanup ${result.execute ? 'execute' : 'dry-run'}: ${
      result.candidates.length
    } artifact(s) ${mode}.`,
  );
  for (const candidate of result.candidates) {
    console.log(`${candidate.kind.padEnd(16)} ${candidate.path}`);
  }
  if (!result.execute && result.candidates.length > 0) {
    console.log('Run `npm run runtime:cleanup:execute` to apply this cleanup.');
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    fs.writeSync(2, `[runtime-retention] ${error.message}\n`);
    process.exit(1);
  }
}
