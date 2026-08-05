import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { shouldSkipRepositoryDirectory } from './repo-policy-check.mjs';

const root = process.cwd();
const baseline = JSON.parse(
  readFileSync(path.join(root, 'tools', 'quality-baseline.json'), 'utf8'),
);
const violations = [];
const normalize = (value) => value.split(path.sep).join('/');
const lineCount = (filePath) => readFileSync(filePath, 'utf8').split(/\r?\n/).length;

for (const relative of Object.keys(baseline.grandfathered)) {
  if (!existsSync(path.join(root, relative))) {
    violations.push(
      `${relative}: stale grandfathered entry; remove it from tools/quality-baseline.json`,
    );
  }
}

const visit = (directory) => {
  for (const entry of readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    const relative = normalize(path.relative(root, entryPath));
    if (shouldSkipRepositoryDirectory(entry)) {
      continue;
    }

    const stat = statSync(entryPath);
    if (stat.isDirectory()) {
      visit(entryPath);
      continue;
    }
    if (!/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry)) {
      continue;
    }

    const lines = lineCount(entryPath);
    const configured = baseline.grandfathered[relative];
    if (configured && lines < configured.maxLines) {
      violations.push(
        `${relative}: ${lines} lines (ratchet max ${configured.maxLines}); lower maxLines to ${lines}`,
      );
    }
    const limit =
      configured?.maxLines ??
      (/\.spec\.|\.test\./.test(entry)
        ? baseline.defaults.test
        : relative.startsWith('backend/')
          ? baseline.defaults.backend
          : baseline.defaults.ui);

    if (lines > limit) {
      violations.push(`${relative}: ${lines} lines (limit ${limit})`);
    }
  }
};

for (const directory of ['backend', 'frontend/src', 'mobile/src', 'packages', 'tools']) {
  const absolute = path.join(root, directory);
  if (existsSync(absolute)) {
    visit(absolute);
  }
}

if (violations.length > 0) {
  console.error('File growth policy failed:\n' + violations.join('\n'));
  process.exit(1);
}

console.log('File growth policy passed.');
