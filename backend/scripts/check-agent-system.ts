import { createHash } from 'crypto';
import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';

import { inspectTaskStatus } from './agent-task-status';

type Manifest = {
  files: Array<{
    path: string;
    hash: {
      algorithm: string;
      value: string;
    };
  }>;
};

const repoRoot = path.resolve(__dirname, '..', '..');
const architectureRoot = path.join(repoRoot, 'docs', 'architecture');
const tasksRoot = path.join(architectureRoot, 'tasks');

const expectedRoleFiles = [
  'docs-worker.md',
  'domain-worker.md',
  'integration-worker.md',
  'operating-rules.md',
  'orchestrator.md',
  'refactor-worker.md',
  'test-worker.md',
  'validator.md',
];

const expectedSkillFiles = [
  '.codex/skills/autocare-agent-system-bootstrap/SKILL.md',
  '.codex/skills/autocare-continuous-task-runner/SKILL.md',
  '.codex/skills/mcp-auto-orchestrator/SKILL.md',
];

const requiredSafetyText = new Map([
  [
    '.codex/skills/autocare-agent-system-bootstrap/SKILL.md',
    ['does not start a daemon', 'user request wins over the repository queue'],
  ],
  [
    '.codex/skills/autocare-continuous-task-runner/SKILL.md',
    ['foreground execution loop', 'active user request always wins'],
  ],
  [
    '.codex/skills/mcp-auto-orchestrator/SKILL.md',
    ['not activation of the AUTOCARE task queue', 'Do not load the task queue'],
  ],
]);

const getSha256 = (filePath: string) =>
  createHash('sha256').update(readFileSync(filePath)).digest('hex');

const getTaskFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return getTaskFiles(entryPath);
    }
    return /^T\d+.*\.md$/u.test(entry.name) ? [entryPath] : [];
  });

const main = () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const roleFile of expectedRoleFiles) {
    const filePath = path.join(architectureRoot, 'agents', roleFile);
    if (!existsSync(filePath)) {
      errors.push(`Missing role contract: docs/architecture/agents/${roleFile}`);
    }
  }

  for (const relativePath of expectedSkillFiles) {
    const filePath = path.join(repoRoot, ...relativePath.split('/'));
    if (!existsSync(filePath)) {
      errors.push(`Missing orchestration skill: ${relativePath}`);
      continue;
    }

    const contents = readFileSync(filePath, 'utf8');
    for (const safetyText of requiredSafetyText.get(relativePath) ?? []) {
      if (!contents.includes(safetyText)) {
        errors.push(`${relativePath}: missing safety rule "${safetyText}".`);
      }
    }
  }

  const manifestPath = path.join(architectureRoot, 'agent-manifest.json');
  if (!existsSync(manifestPath)) {
    errors.push('Missing docs/architecture/agent-manifest.json.');
  } else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
    for (const entry of manifest.files) {
      const filePath = path.join(architectureRoot, ...entry.path.split('/'));
      if (!existsSync(filePath)) {
        errors.push(`Manifest points to a missing file: ${entry.path}`);
        continue;
      }
      if (entry.hash.algorithm !== 'sha256') {
        errors.push(`${entry.path}: unsupported hash algorithm ${entry.hash.algorithm}.`);
        continue;
      }
      if (getSha256(filePath) !== entry.hash.value) {
        errors.push(`${entry.path}: manifest hash mismatch.`);
      }
    }
  }

  const statusCounts = new Map<string, number>();
  for (const taskFile of getTaskFiles(tasksRoot)) {
    const relativePath = path.relative(repoRoot, taskFile).split(path.sep).join('/');
    const inspection = inspectTaskStatus(
      relativePath,
      readFileSync(taskFile, 'utf8'),
    );
    errors.push(...inspection.errors);
    if (inspection.status) {
      statusCounts.set(
        inspection.status,
        (statusCounts.get(inspection.status) ?? 0) + 1,
      );
    }
  }

  const readyCount = statusCounts.get('ready') ?? 0;
  if (readyCount === 0) {
    warnings.push('The implementation queue has no ready tasks; use an explicit user objective.');
  }

  const lifecycleKeys = new Set([
    'preinstall',
    'install',
    'postinstall',
    'prepare',
    'prestart',
    'poststart',
  ]);
  for (const relativePath of [
    'package.json',
    'backend/package.json',
    'frontend/package.json',
    'mobile/package.json',
  ]) {
    const packagePath = path.join(repoRoot, ...relativePath.split('/'));
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    for (const [scriptName, command] of Object.entries(packageJson.scripts ?? {})) {
      if (
        lifecycleKeys.has(scriptName) &&
        /\b(agent|orchestrat(?:or|ion))\b/iu.test(command)
      ) {
        errors.push(`${relativePath}: automatic lifecycle script "${scriptName}" starts agent work.`);
      }
    }
  }

  const statusSummary = [...statusCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status}=${count}`)
    .join(', ');

  process.stdout.write('AUTOCARE agent system check\n');
  process.stdout.write('Mode: opt-in, single-agent by default\n');
  process.stdout.write('Background runtime: none configured\n');
  process.stdout.write(`Role contracts: ${expectedRoleFiles.length}\n`);
  process.stdout.write(`Orchestration skills: ${expectedSkillFiles.length}\n`);
  process.stdout.write(`Task states: ${statusSummary}\n`);

  for (const warning of warnings) {
    process.stdout.write(`Warning: ${warning}\n`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      process.stderr.write(`Error: ${error}\n`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write('Agent system check passed.\n');
};

main();
