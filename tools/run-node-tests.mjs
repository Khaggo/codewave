import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const roots = process.argv.slice(2);

if (roots.length === 0) {
  console.error('Usage: node tools/run-node-tests.mjs <directory> [...]');
  process.exit(2);
}

const tests = [];

const visit = (entryPath) => {
  const stat = statSync(entryPath);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(entryPath)) {
      visit(path.join(entryPath, entry));
    }
    return;
  }

  if (entryPath.endsWith('.test.mjs')) {
    tests.push(entryPath);
  }
};

for (const root of roots) {
  visit(path.resolve(root));
}

tests.sort();

if (tests.length === 0) {
  console.error(`No .test.mjs files found under: ${roots.join(', ')}`);
  process.exit(1);
}

console.log(`Running ${tests.length} Node tests.`);
const result = spawnSync(process.execPath, ['--test', ...tests], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
