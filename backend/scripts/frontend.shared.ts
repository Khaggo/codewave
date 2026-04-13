import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import path from 'path';

import { backendRoot } from './swagger.shared';

export type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

export type FrontendFramework = 'nextjs' | 'vite' | 'cra' | 'unknown';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'unknown';

const ignoredImportNames = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  'out',
]);

const likelyCodeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const envFileNames = ['.env', '.env.local', '.env.example', '.env.development', '.env.production'] as const;

export const repoRoot = path.resolve(backendRoot, '..');
export const frontendRoot = path.join(repoRoot, 'frontend');
export const frontendGeneratedRoot = path.join(frontendRoot, 'src', 'lib', 'api', 'generated');
export const frontendMocksRoot = path.join(frontendRoot, 'src', 'mocks');
export const frontendIntegrationRoot = path.join(frontendRoot, '.codex-integration');
export const frontendImportRuntimeRoot = path.join(backendRoot, '.runtime', 'frontend-import');

export const ensureDirectory = (targetPath: string) => {
  mkdirSync(targetPath, { recursive: true });
};

export const readJsonFile = <T>(filePath: string): T => {
  const contents = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(contents) as T;
};

export const readPackageJson = (projectRoot: string) => {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  return readJsonFile<PackageJson>(packageJsonPath);
};

export const getDependencyNames = (packageJson: PackageJson | null) => {
  if (!packageJson) {
    return [];
  }

  return Array.from(
    new Set([
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ]),
  ).sort();
};

export const detectFramework = (packageJson: PackageJson | null): FrontendFramework => {
  const dependencies = new Set(getDependencyNames(packageJson));

  if (dependencies.has('next')) {
    return 'nextjs';
  }

  if (dependencies.has('vite')) {
    return 'vite';
  }

  if (dependencies.has('react-scripts')) {
    return 'cra';
  }

  return 'unknown';
};

export const detectPackageManager = (projectRoot: string): PackageManager => {
  if (existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (existsSync(path.join(projectRoot, 'yarn.lock'))) {
    return 'yarn';
  }

  if (existsSync(path.join(projectRoot, 'package-lock.json'))) {
    return 'npm';
  }

  return 'unknown';
};

export const detectAiPackages = (packageJson: PackageJson | null) => {
  const aiPatterns = [
    /(^|\/)openai$/,
    /(^|\/)anthropic$/,
    /(^|\/)langchain/,
    /(^|\/)ai$/,
    /ai-sdk/,
    /generative-ai/,
    /gemini/i,
    /ollama/i,
  ];

  return getDependencyNames(packageJson).filter((dependencyName) =>
    aiPatterns.some((pattern) => pattern.test(dependencyName)),
  );
};

export const clearDirectoryContents = (directoryPath: string) => {
  if (!existsSync(directoryPath)) {
    ensureDirectory(directoryPath);
    return;
  }

  for (const entryName of readdirSync(directoryPath)) {
    rmSync(path.join(directoryPath, entryName), { recursive: true, force: true });
  }
};

const copyDirectoryRecursive = (
  sourcePath: string,
  destinationPath: string,
  shouldSkip: (name: string, sourceEntryPath: string) => boolean,
) => {
  const sourceStats = statSync(sourcePath);

  if (sourceStats.isDirectory()) {
    ensureDirectory(destinationPath);
    for (const entryName of readdirSync(sourcePath)) {
      const sourceEntryPath = path.join(sourcePath, entryName);
      if (shouldSkip(entryName, sourceEntryPath)) {
        continue;
      }

      copyDirectoryRecursive(
        sourceEntryPath,
        path.join(destinationPath, entryName),
        shouldSkip,
      );
    }
    return;
  }

  ensureDirectory(path.dirname(destinationPath));
  copyFileSync(sourcePath, destinationPath);
};

export const copyProjectIntoFrontend = (sourceRoot: string, destinationRoot: string) => {
  copyDirectoryRecursive(sourceRoot, destinationRoot, (entryName) => ignoredImportNames.has(entryName));
};

export const backupOwnedContracts = (backupRoot: string) => {
  if (!existsSync(frontendGeneratedRoot) || !existsSync(frontendMocksRoot)) {
    throw new Error(
      'Missing current frontend contract assets. Expected frontend/src/lib/api/generated and frontend/src/mocks to exist before import.',
    );
  }

  rmSync(backupRoot, { recursive: true, force: true });
  ensureDirectory(backupRoot);

  copyDirectoryRecursive(frontendGeneratedRoot, path.join(backupRoot, 'generated'), () => false);
  copyDirectoryRecursive(frontendMocksRoot, path.join(backupRoot, 'mocks'), () => false);
};

const restoreManagedEntries = (sourceDirectory: string, destinationDirectory: string) => {
  if (!existsSync(sourceDirectory)) {
    return;
  }

  ensureDirectory(destinationDirectory);

  for (const entryName of readdirSync(sourceDirectory)) {
    const sourceEntryPath = path.join(sourceDirectory, entryName);
    const destinationEntryPath = path.join(destinationDirectory, entryName);

    rmSync(destinationEntryPath, { recursive: true, force: true });
    copyDirectoryRecursive(sourceEntryPath, destinationEntryPath, () => false);
  }
};

export const restoreOwnedContracts = (backupRoot: string) => {
  restoreManagedEntries(path.join(backupRoot, 'generated'), frontendGeneratedRoot);
  restoreManagedEntries(path.join(backupRoot, 'mocks'), frontendMocksRoot);
};

export const writeIntegrationFiles = (manifest: Record<string, unknown>) => {
  ensureDirectory(frontendIntegrationRoot);

  writeFileSync(
    path.join(frontendIntegrationRoot, 'import-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  writeFileSync(
    path.join(frontendIntegrationRoot, 'README.md'),
    [
      '# Codex Frontend Integration Notes',
      '',
      'This folder is managed by the backend workspace to make frontend import and slice integration repeatable.',
      '',
      '## What Was Preserved During Import',
      '',
      '- `src/lib/api/generated/*` backend-owned contract slices',
      '- `src/mocks/*` backend-owned slice mocks',
      '',
      '## Recommended Next Steps',
      '',
      '1. Install frontend dependencies with the detected package manager.',
      '2. Review the frontend env files and keep AI features disabled until the core backend slices are wired.',
      '3. Use `cd backend && npm run frontend:inspect` to discover API/auth/AI integration points.',
      '4. Integrate live slices in this order: `T110`, `T111`, then `T109`.',
      '',
      '## Optional Env Flags',
      '',
      'If the imported app does not already have an AI feature flag, add the relevant one for your framework and default it to `false` during backend integration:',
      '',
      '- `NEXT_PUBLIC_ENABLE_AI=false`',
      '- `VITE_ENABLE_AI=false`',
      '- `REACT_APP_ENABLE_AI=false`',
      '',
      'Set your backend base URL alongside it:',
      '',
      '- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000`',
      '- `VITE_API_BASE_URL=http://127.0.0.1:3000`',
      '- `REACT_APP_API_BASE_URL=http://127.0.0.1:3000`',
      '',
    ].join('\n'),
    'utf8',
  );

  writeFileSync(
    path.join(frontendIntegrationRoot, '.env.integration.example'),
    [
      '# Copy the relevant variables into the imported frontend env file.',
      'NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000',
      'NEXT_PUBLIC_ENABLE_AI=false',
      'VITE_API_BASE_URL=http://127.0.0.1:3000',
      'VITE_ENABLE_AI=false',
      'REACT_APP_API_BASE_URL=http://127.0.0.1:3000',
      'REACT_APP_ENABLE_AI=false',
      '',
    ].join('\n'),
    'utf8',
  );
};

export const resolveSourceRoot = (rawPath: string) =>
  path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);

export const pathContains = (parentPath: string, childPath: string) => {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
};

export const getPresentEnvFiles = (projectRoot: string) =>
  envFileNames.filter((fileName) => existsSync(path.join(projectRoot, fileName)));

export const findLikelyFiles = (
  projectRoot: string,
  patterns: RegExp[],
  maxResults = 12,
) => {
  const results: string[] = [];
  const queue = ['app', 'src', 'components', 'lib', 'utils', 'services', 'hooks', 'pages']
    .map((entryName) => path.join(projectRoot, entryName))
    .filter((entryPath) => existsSync(entryPath));

  while (queue.length && results.length < maxResults) {
    const currentPath = queue.shift()!;
    const currentStats = statSync(currentPath);

    if (currentStats.isDirectory()) {
      for (const entryName of readdirSync(currentPath)) {
        if (ignoredImportNames.has(entryName)) {
          continue;
        }

        queue.push(path.join(currentPath, entryName));
      }
      continue;
    }

    if (!likelyCodeExtensions.has(path.extname(currentPath))) {
      continue;
    }

    const relativePath = path.relative(projectRoot, currentPath);
    if (patterns.some((pattern) => pattern.test(relativePath.replace(/\\/g, '/')))) {
      results.push(relativePath.replace(/\\/g, '/'));
    }
  }

  return results;
};
