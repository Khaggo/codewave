import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const baselinePath = path.resolve('tools', 'coverage-baseline.json');
const summaryPath = path.resolve('backend', 'coverage', 'coverage-summary.json');

if (!existsSync(summaryPath)) {
  console.error('Backend coverage summary is missing. Run npm --workspace backend run test:coverage.');
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')).backend;
const summary = JSON.parse(readFileSync(summaryPath, 'utf8')).total;
const failures = [];

for (const metric of ['lines', 'statements', 'branches', 'functions']) {
  const current = Number(summary[metric]?.pct ?? 0);
  const floor = Number(baseline[metric] ?? 0) - 0.5;
  if (current < floor) {
    failures.push(`${metric}: ${current}% is below ratchet floor ${floor}%`);
  }
}

if (failures.length > 0) {
  console.error(`Coverage ratchet failed:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(
  `Coverage ratchet passed: ${['lines', 'statements', 'branches', 'functions']
    .map((metric) => `${metric} ${summary[metric].pct}%`)
    .join(', ')}.`,
);
