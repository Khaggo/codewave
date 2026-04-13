import { existsSync, readdirSync, rmSync } from 'fs';
import path from 'path';

import {
  backupOwnedContracts,
  clearDirectoryContents,
  copyProjectIntoFrontend,
  detectAiPackages,
  detectFramework,
  detectPackageManager,
  ensureDirectory,
  frontendImportRuntimeRoot,
  frontendRoot,
  pathContains,
  readPackageJson,
  resolveSourceRoot,
  restoreOwnedContracts,
  writeIntegrationFiles,
} from './frontend.shared';

const usageText = [
  'Usage:',
  '  npm run frontend:import -- <path-to-frontend-project>',
  '',
  'Examples:',
  '  npm run frontend:import -- ..\\incoming\\frontend-app',
  '  npm run frontend:import -- C:\\work\\frontend-app',
  '',
  'This command replaces the placeholder frontend workspace with the imported project,',
  'while restoring the backend-owned contract files under `frontend/src/lib/api/generated`',
  'and `frontend/src/mocks`.',
].join('\n');

const main = () => {
  const [, , rawSourcePath] = process.argv;

  if (!rawSourcePath || rawSourcePath === '--help' || rawSourcePath === '-h') {
    process.stdout.write(`${usageText}\n`);
    return;
  }

  const sourceRoot = resolveSourceRoot(rawSourcePath);
  if (!existsSync(sourceRoot)) {
    throw new Error(`Frontend source path does not exist: ${sourceRoot}`);
  }

  const packageJson = readPackageJson(sourceRoot);
  if (!packageJson) {
    throw new Error(`Expected a package.json in the frontend source path: ${sourceRoot}`);
  }

  if (pathContains(frontendRoot, sourceRoot)) {
    throw new Error(
      `Refusing to import from inside the target frontend directory. Stage the source elsewhere first: ${sourceRoot}`,
    );
  }

  const hasAppLikeDirectory = ['src', 'app', 'components', 'pages'].some((entryName) =>
    existsSync(path.join(sourceRoot, entryName)),
  );
  if (!hasAppLikeDirectory) {
    throw new Error(
      `Frontend source path does not look like an app project. Expected at least one of src, app, components, or pages inside ${sourceRoot}`,
    );
  }

  const backupRoot = path.join(frontendImportRuntimeRoot, 'contract-backup');
  backupOwnedContracts(backupRoot);

  ensureDirectory(frontendRoot);
  clearDirectoryContents(frontendRoot);
  copyProjectIntoFrontend(sourceRoot, frontendRoot);
  restoreOwnedContracts(backupRoot);

  const framework = detectFramework(packageJson);
  const packageManager = detectPackageManager(sourceRoot);
  const aiPackages = detectAiPackages(packageJson);

  writeIntegrationFiles({
    importedAt: new Date().toISOString(),
    sourceProjectName: packageJson.name ?? path.basename(sourceRoot),
    framework,
    packageManager,
    aiPackages,
    preservedContractRoots: [
      'src/lib/api/generated',
      'src/mocks',
    ],
  });

  rmSync(backupRoot, { recursive: true, force: true });

  const copiedEntries = readdirSync(frontendRoot).sort();
  process.stdout.write(
    [
      `Imported frontend project into ${frontendRoot}`,
      `Detected framework: ${framework}`,
      `Detected package manager: ${packageManager}`,
      `Detected AI packages: ${aiPackages.length ? aiPackages.join(', ') : 'none'}`,
      `Frontend root entries: ${copiedEntries.join(', ')}`,
      '',
      'Next steps:',
      '- cd backend && npm run frontend:inspect',
      '- Install frontend dependencies in the frontend project using the detected package manager.',
      '- Keep AI features disabled by env until the first live slices are wired.',
    ].join('\n'),
  );
};

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
}
