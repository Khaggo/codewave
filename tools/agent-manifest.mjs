#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_MANIFEST_RELATIVE_PATH = 'docs/architecture/agent-manifest.json';
const SHA256 = 'sha256';

const toPosix = (value) => value.split(path.sep).join('/');

export const sha256Buffer = (value) =>
  createHash(SHA256).update(value).digest('hex');

export const sha256File = (filePath) => sha256Buffer(readFileSync(filePath));

const resolveManifestPath = (rootDirectory, manifestPath) => {
  const root = path.resolve(rootDirectory);
  const candidate = path.resolve(root, manifestPath);
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Manifest path must remain inside the repository: ${manifestPath}`);
  }
  return candidate;
};

const resolveEntryPath = (docsRoot, relativePath) => {
  const candidate = path.resolve(docsRoot, ...relativePath.split('/'));
  const relative = path.relative(docsRoot, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Manifest entry escapes docs/architecture: ${relativePath}`);
  }
  return candidate;
};

const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));

export const inspectAgentManifest = ({
  rootDirectory = process.cwd(),
  manifestPath = DEFAULT_MANIFEST_RELATIVE_PATH,
} = {}) => {
  const root = path.resolve(rootDirectory);
  const absoluteManifestPath = resolveManifestPath(root, manifestPath);
  const docsRoot = path.join(root, 'docs', 'architecture');
  const errors = [];
  const mismatches = [];

  if (!existsSync(absoluteManifestPath)) {
    return {
      ok: false,
      rootDirectory: root,
      manifestPath: absoluteManifestPath,
      manifest: null,
      errors: [`Missing manifest: ${toPosix(path.relative(root, absoluteManifestPath))}`],
      mismatches,
    };
  }

  let manifest;
  try {
    manifest = readJson(absoluteManifestPath);
  } catch (error) {
    return {
      ok: false,
      rootDirectory: root,
      manifestPath: absoluteManifestPath,
      manifest: null,
      errors: [`Unable to parse manifest: ${error.message}`],
      mismatches,
    };
  }

  if (!Array.isArray(manifest.files)) {
    errors.push('Manifest must contain a files array.');
    return {
      ok: false,
      rootDirectory: root,
      manifestPath: absoluteManifestPath,
      manifest,
      errors,
      mismatches,
    };
  }

  const seenPaths = new Set();
  for (const entry of manifest.files) {
    const relativePath = entry?.path;
    if (typeof relativePath !== 'string' || relativePath.length === 0) {
      errors.push('Manifest contains an entry without a valid path.');
      continue;
    }
    if (seenPaths.has(relativePath)) {
      errors.push(`Manifest contains duplicate entry: ${relativePath}`);
      continue;
    }
    seenPaths.add(relativePath);

    let filePath;
    try {
      filePath = resolveEntryPath(docsRoot, relativePath);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      errors.push(`${relativePath}: manifest points to a missing file.`);
      continue;
    }
    if (entry.hash?.algorithm !== SHA256) {
      errors.push(
        `${relativePath}: unsupported hash algorithm "${entry.hash?.algorithm ?? 'missing'}".`,
      );
      continue;
    }

    const actual = sha256File(filePath);
    const expected = entry.hash.value;
    if (expected !== actual) {
      mismatches.push({ relativePath, expected, actual });
    }
  }

  return {
    ok: errors.length === 0 && mismatches.length === 0,
    rootDirectory: root,
    manifestPath: absoluteManifestPath,
    manifest,
    errors,
    mismatches,
  };
};

export const updateManifestHashes = (manifest, rootDirectory) => {
  const updated = structuredClone(manifest);
  const docsRoot = path.join(path.resolve(rootDirectory), 'docs', 'architecture');
  updated.files = updated.files.map((entry) => {
    const filePath = resolveEntryPath(docsRoot, entry.path);
    return {
      ...entry,
      hash: {
        algorithm: SHA256,
        value: sha256File(filePath),
      },
    };
  });
  return updated;
};

export const serializeManifest = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`;

export const writeManifestAtomically = ({
  manifestPath,
  contents,
  rename = renameSync,
} = {}) => {
  if (typeof manifestPath !== 'string' || typeof contents !== 'string') {
    throw new TypeError('manifestPath and contents are required.');
  }

  const directory = path.dirname(manifestPath);
  mkdirSync(directory, { recursive: true });
  const temporaryPath = path.join(
    directory,
    `.${path.basename(manifestPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let fileHandle;
  try {
    fileHandle = openSync(temporaryPath, 'wx', 0o600);
    writeSync(fileHandle, contents, 0, 'utf8');
    fsyncSync(fileHandle);
    closeSync(fileHandle);
    fileHandle = undefined;

    if (process.platform === 'win32' && existsSync(manifestPath)) {
      const backupPath = `${manifestPath}.${process.pid}.${randomUUID()}.bak`;
      renameSync(manifestPath, backupPath);
      try {
        rename(temporaryPath, manifestPath);
        rmSync(backupPath, { force: true });
      } catch (error) {
        if (!existsSync(manifestPath) && existsSync(backupPath)) {
          renameSync(backupPath, manifestPath);
        }
        throw error;
      }
    } else {
      rename(temporaryPath, manifestPath);
    }
  } finally {
    if (fileHandle !== undefined) {
      closeSync(fileHandle);
    }
    rmSync(temporaryPath, { force: true });
  }
};

export const generateAgentManifest = ({
  rootDirectory = process.cwd(),
  manifestPath = DEFAULT_MANIFEST_RELATIVE_PATH,
  write = false,
} = {}) => {
  const inspection = inspectAgentManifest({ rootDirectory, manifestPath });
  if (!write || inspection.ok || inspection.errors.length > 0) {
    return { ...inspection, wrote: false };
  }

  const updated = updateManifestHashes(inspection.manifest, inspection.rootDirectory);
  writeManifestAtomically({
    manifestPath: inspection.manifestPath,
    contents: serializeManifest(updated),
  });
  const verified = inspectAgentManifest({ rootDirectory, manifestPath });
  return { ...verified, wrote: true };
};

export const formatManifestDiagnostics = (result) => {
  const lines = [];
  for (const error of result.errors) lines.push(`ERROR ${error}`);
  for (const mismatch of result.mismatches) {
    lines.push(
      `HASH ${mismatch.relativePath}: expected ${mismatch.expected}, actual ${mismatch.actual}`,
    );
  }
  if (lines.length === 0) lines.push('Agent manifest is valid.');
  return lines.join('\n');
};

export const parseManifestArgs = (argv) => {
  const options = { write: false, json: false, manifestPath: DEFAULT_MANIFEST_RELATIVE_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--write') {
      options.write = true;
      continue;
    }
    if (argument === '--json') {
      options.json = true;
      continue;
    }
    if (argument === '--manifest') {
      options.manifestPath = argv[++index] ?? '';
      continue;
    }
    if (argument.startsWith('--manifest=')) {
      options.manifestPath = argument.slice('--manifest='.length);
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown manifest argument: ${argument}`);
  }
  if (!options.manifestPath) throw new Error('--manifest requires a path.');
  return options;
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    const options = parseManifestArgs(process.argv.slice(2));
    if (options.help) {
      console.log(
        'Usage: node tools/agent-manifest.mjs [--write] [--json] [--manifest <path>]',
      );
      process.exit(0);
    }
    const result = generateAgentManifest(options);
    if (options.json) {
      console.log(JSON.stringify({
        ok: result.ok,
        wrote: result.wrote,
        errors: result.errors,
        mismatches: result.mismatches,
      }, null, 2));
    } else {
      console.log(formatManifestDiagnostics(result));
      if (result.wrote) console.log('Manifest hashes updated atomically.');
    }
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
