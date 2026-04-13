import { existsSync } from 'fs';
import path from 'path';

import {
  detectAiPackages,
  detectFramework,
  detectPackageManager,
  findLikelyFiles,
  frontendGeneratedRoot,
  frontendMocksRoot,
  frontendRoot,
  getPresentEnvFiles,
  readPackageJson,
} from './frontend.shared';

const describeFramework = (framework: ReturnType<typeof detectFramework>) => {
  if (framework === 'nextjs') {
    return 'Next.js';
  }

  if (framework === 'vite') {
    return 'Vite';
  }

  if (framework === 'cra') {
    return 'Create React App';
  }

  return 'Unknown';
};

const main = () => {
  const packageJson = readPackageJson(frontendRoot);
  const contractsPresent = existsSync(frontendGeneratedRoot);
  const mocksPresent = existsSync(frontendMocksRoot);

  if (!packageJson) {
    process.stdout.write(
      [
        'No frontend package.json found in frontend/.',
        'This workspace is still the contract-only placeholder.',
        '',
        `Contracts present: ${contractsPresent ? 'yes' : 'no'}`,
        `Mocks present: ${mocksPresent ? 'yes' : 'no'}`,
        '',
        'Next step:',
        '  cd backend && npm run frontend:import -- <path-to-full-frontend-project>',
      ].join('\n'),
    );
    return;
  }

  const framework = detectFramework(packageJson);
  const packageManager = detectPackageManager(frontendRoot);
  const aiPackages = detectAiPackages(packageJson);
  const envFiles = getPresentEnvFiles(frontendRoot);

  const apiFiles = findLikelyFiles(frontendRoot, [
    /(^|\/)(api|services|lib)\/.*(api|client|http|fetch|axios)/i,
    /(^|\/)(api|services)\//i,
  ]);
  const authFiles = findLikelyFiles(frontendRoot, [
    /auth/i,
    /session/i,
    /guard/i,
    /middleware/i,
  ]);
  const aiFiles = findLikelyFiles(frontendRoot, [/openai/i, /anthropic/i, /gemini/i, /langchain/i, /\/ai\//i]);

  const appRoots = ['app', 'src', 'components', 'pages', 'public']
    .filter((entryName) => existsSync(path.join(frontendRoot, entryName)))
    .join(', ');

  process.stdout.write(
    [
      `Frontend package: ${packageJson.name ?? '(unnamed project)'}`,
      `Framework: ${describeFramework(framework)}`,
      `Package manager: ${packageManager}`,
      `Contracts present: ${contractsPresent ? 'yes' : 'no'}`,
      `Mocks present: ${mocksPresent ? 'yes' : 'no'}`,
      `Detected app roots: ${appRoots || 'none'}`,
      `Env files: ${envFiles.length ? envFiles.join(', ') : 'none found'}`,
      `AI packages: ${aiPackages.length ? aiPackages.join(', ') : 'none detected'}`,
      '',
      'Likely API integration files:',
      ...(apiFiles.length ? apiFiles.map((filePath) => `- ${filePath}`) : ['- none detected']),
      '',
      'Likely auth/session files:',
      ...(authFiles.length ? authFiles.map((filePath) => `- ${filePath}`) : ['- none detected']),
      '',
      'Likely AI-related files:',
      ...(aiFiles.length ? aiFiles.map((filePath) => `- ${filePath}`) : ['- none detected']),
      '',
      'Recommended next steps:',
      '- Verify the frontend runs locally with its package manager.',
      '- Review env files and keep AI features disabled until the first live backend slices are wired.',
      '- Start live integration with T110, T111, then T109.',
    ].join('\n'),
  );
};

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
}
