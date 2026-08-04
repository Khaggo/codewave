import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  partitionChanges,
  readWorktreeChanges,
} from './worktree-partition.mjs';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_BUFFER_BYTES = 256 * 1024 * 1024;
const LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const commandLabel = (command, args) => [command, ...args].join(' ');

const defaultCommandRunner = (
  command,
  args,
  { cwd, timeoutMs = DEFAULT_TIMEOUT_MS, encoding = null } = {},
) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding,
    maxBuffer: MAX_BUFFER_BYTES,
    timeout: timeoutMs,
    windowsHide: true,
  });
  if (result.error) {
    if (result.error.code === 'ETIMEDOUT') {
      throw new Error(
        `${commandLabel(command, args)} exceeded ${timeoutMs}ms.`,
      );
    }
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString('utf8')
      : String(result.stderr ?? '');
    throw new Error(
      stderr.trim() || `${commandLabel(command, args)} exited ${result.status}.`,
    );
  }
  return result.stdout;
};

const outputText = (value) =>
  Buffer.isBuffer(value) ? value.toString('utf8') : String(value ?? '');

const sha256File = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();

const formatTimestamp = (date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
    .replace('T', '-');

export const createSnapshotLabel = (date = new Date()) =>
  `dirty-state-${formatTimestamp(date)}`;

const assertLabel = (label) => {
  if (!LABEL_PATTERN.test(label)) {
    throw new Error(
      'Snapshot label must contain only letters, numbers, dots, underscores, and hyphens.',
    );
  }
};

const getRepositoryRoot = (cwd, commandRunner, timeoutMs) =>
  path.resolve(
    outputText(
      commandRunner('git', ['rev-parse', '--show-toplevel'], {
        cwd,
        timeoutMs,
        encoding: 'utf8',
      }),
    ).trim(),
  );

const getGitText = (repositoryRoot, args, commandRunner, timeoutMs) =>
  outputText(
    commandRunner('git', args, {
      cwd: repositoryRoot,
      timeoutMs,
      encoding: 'utf8',
    }),
  ).trim();

const artifactInfo = (file) => ({
  file: path.basename(file),
  bytes: statSync(file).size,
  sha256: sha256File(file),
});

const ensureAvailableNames = (files) => {
  const collision = files.find((file) => existsSync(file));
  if (collision) {
    throw new Error(`Snapshot artifact already exists: ${collision}`);
  }
};

const archiveEntries = (archive, repositoryRoot, commandRunner, timeoutMs) => {
  const listing = outputText(
    commandRunner('tar', ['-tzf', archive], {
      cwd: repositoryRoot,
      timeoutMs,
      encoding: 'utf8',
    }),
  );
  return listing.split(/\r?\n/).filter(Boolean);
};

export const createDirtyWorktreeSnapshot = ({
  cwd = process.cwd(),
  outputDirectory,
  label = createSnapshotLabel(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  commandRunner = defaultCommandRunner,
  onProgress = () => {},
} = {}) => {
  assertLabel(label);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new Error('Snapshot timeout must be an integer from 1000 to 120000ms.');
  }
  if (typeof onProgress !== 'function') {
    throw new Error('Snapshot progress handler must be a function.');
  }

  onProgress('Resolving repository and worktree state.');
  const repositoryRoot = getRepositoryRoot(cwd, commandRunner, timeoutMs);
  const changes = readWorktreeChanges(repositoryRoot);
  if (!changes.length) {
    throw new Error('Worktree is clean; no recovery snapshot is required.');
  }

  const report = partitionChanges(changes);
  const untracked = changes
    .filter((change) => change.status === '??')
    .map((change) => change.file);
  const unsafePath = untracked.find((file) => /[\r\n]/.test(file));
  if (unsafePath) {
    throw new Error(
      `Cannot archive an untracked path containing a line break: ${JSON.stringify(unsafePath)}`,
    );
  }

  const targetDirectory = path.resolve(
    outputDirectory ?? path.join(repositoryRoot, '.runtime', 'repo-audits'),
  );
  const finalFiles = {
    patch: path.join(targetDirectory, `${label}-tracked.patch`),
    list: path.join(targetDirectory, `${label}-untracked.txt`),
    archive: path.join(targetDirectory, `${label}-untracked.tar.gz`),
    manifest: path.join(targetDirectory, `${label}-manifest.json`),
  };
  ensureAvailableNames(Object.values(finalFiles));
  mkdirSync(targetDirectory, { recursive: true });

  const partialSuffix = `.partial-${process.pid}-${Date.now()}`;
  const partialFiles = Object.fromEntries(
    Object.entries(finalFiles).map(([key, file]) => [key, `${file}${partialSuffix}`]),
  );
  const promotedFiles = [];

  try {
    onProgress(`Capturing ${report.summary.total} tracked and untracked changes.`);
    const patch = commandRunner(
      'git',
      ['-c', 'core.safecrlf=false', 'diff', '--binary', '--no-ext-diff', 'HEAD', '--'],
      { cwd: repositoryRoot, timeoutMs },
    );
    writeFileSync(partialFiles.patch, patch);
    const hasTrackedPatch = patch.length > 0;
    if (hasTrackedPatch) {
      commandRunner('git', ['apply', '--stat', partialFiles.patch], {
        cwd: repositoryRoot,
        timeoutMs,
      });
    }

    writeFileSync(
      partialFiles.list,
      untracked.length ? `${untracked.join('\n')}\n` : '',
      'utf8',
    );
    onProgress(
      `Archiving ${untracked.length} untracked ${untracked.length === 1 ? 'path' : 'paths'}.`,
    );
    commandRunner('tar', ['-czf', partialFiles.archive, '-T', partialFiles.list], {
      cwd: repositoryRoot,
      timeoutMs,
    });
    const entries = archiveEntries(
      partialFiles.archive,
      repositoryRoot,
      commandRunner,
      timeoutMs,
    );
    if (entries.length !== untracked.length) {
      throw new Error(
        `Untracked archive contains ${entries.length} entries; expected ${untracked.length}.`,
      );
    }

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      repositoryRoot,
      branch: getGitText(repositoryRoot, ['branch', '--show-current'], commandRunner, timeoutMs),
      head: getGitText(repositoryRoot, ['rev-parse', 'HEAD'], commandRunner, timeoutMs),
      summary: report.summary,
      groups: report.groups.map((group) => ({
        id: group.id,
        description: group.description,
        count: group.changes.length,
      })),
      artifacts: {
        trackedPatch: {
          ...artifactInfo(partialFiles.patch),
          file: path.basename(finalFiles.patch),
          gitApplyParse: hasTrackedPatch ? 'passed' : 'not-required',
        },
        untrackedList: {
          ...artifactInfo(partialFiles.list),
          file: path.basename(finalFiles.list),
        },
        untrackedArchive: {
          ...artifactInfo(partialFiles.archive),
          file: path.basename(finalFiles.archive),
          entries: entries.length,
        },
      },
      changes,
    };
    writeFileSync(partialFiles.manifest, `${JSON.stringify(manifest, null, 2)}\n`);

    onProgress('Promoting verified snapshot artifacts.');
    for (const key of ['patch', 'list', 'archive', 'manifest']) {
      renameSync(partialFiles[key], finalFiles[key]);
      promotedFiles.push(finalFiles[key]);
    }

    onProgress('Snapshot artifacts are ready.');
    return { repositoryRoot, files: finalFiles, manifest };
  } catch (error) {
    for (const file of promotedFiles) {
      rmSync(file, { force: true });
    }
    throw error;
  } finally {
    for (const file of Object.values(partialFiles)) {
      rmSync(file, { force: true });
    }
  }
};

export const parseSnapshotArgs = (argv) => {
  const options = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      options.json = true;
      continue;
    }
    const key = {
      '--label': 'label',
      '--output-dir': 'outputDirectory',
      '--timeout-ms': 'timeoutMs',
    }[argument];
    if (!key || index + 1 >= argv.length) {
      throw new Error(`Unknown or incomplete snapshot option: ${argument}`);
    }
    const value = argv[index + 1];
    options[key] = key === 'timeoutMs' ? Number(value) : value;
    index += 1;
  }
  return options;
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    const options = parseSnapshotArgs(process.argv.slice(2));
    console.error(
      `[worktree-snapshot] Starting ${options.label ?? 'timestamped snapshot'} with a bounded per-command timeout.`,
    );
    const result = createDirtyWorktreeSnapshot({
      ...options,
      onProgress: (message) => console.error(`[worktree-snapshot] ${message}`),
    });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Snapshot created: ${result.files.manifest}`);
      console.log(
        `Worktree: ${result.manifest.summary.total} changes, ${result.manifest.summary.staged} staged, ${result.manifest.summary.conflicts} conflicts.`,
      );
      console.log(
        `Untracked archive: ${result.manifest.artifacts.untrackedArchive.entries} entries.`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
