#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const exportRoot = path.resolve(
  repoRoot,
  process.argv[2] || '.managed-runtime/mobile-performance-export',
);
const baselinePath = path.join(repoRoot, 'tools', 'web-performance-baseline.json');
const reportPath = path.join(
  repoRoot,
  '.managed-runtime',
  'mobile-bundle-report.json',
);

function findHermesBundles(directory) {
  if (!fs.existsSync(directory)) return [];
  const bundles = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      bundles.push(...findHermesBundles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.hbc')) {
      bundles.push(entryPath);
    }
  }
  return bundles;
}

if (!fs.existsSync(baselinePath)) {
  console.error(`Missing mobile performance baseline: ${baselinePath}`);
  process.exit(2);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const baselineBytes = Number(baseline.mobile?.androidExportBytes);
const allowedGrowthPercent = Number(baseline.allowedGrowthPercent);
if (
  !Number.isFinite(baselineBytes) ||
  baselineBytes <= 0 ||
  !Number.isFinite(allowedGrowthPercent)
) {
  console.error('Mobile performance baseline is incomplete.');
  process.exit(2);
}

const bundles = findHermesBundles(exportRoot);
if (bundles.length !== 1) {
  console.error(
    `Expected one Android Hermes bundle under ${exportRoot}; found ${bundles.length}.`,
  );
  process.exit(2);
}

const bundlePath = bundles[0];
const sourceMapPath = `${bundlePath}.map`;
if (!fs.existsSync(sourceMapPath)) {
  console.error('Mobile performance exports must emit an external source map.');
  process.exit(2);
}
const currentBytes = fs.statSync(bundlePath).size;
const maximumBytes = Math.floor(
  baselineBytes * (1 + allowedGrowthPercent / 100),
);
const growthPercent =
  ((currentBytes - baselineBytes) / baselineBytes) * 100;
const report = {
  generatedAt: new Date().toISOString(),
  bundlePath: path.relative(repoRoot, bundlePath),
  sourceMapPath: path.relative(repoRoot, sourceMapPath),
  currentBytes,
  baselineBytes,
  maximumBytes,
  allowedGrowthPercent,
  growthPercent: Number(growthPercent.toFixed(2)),
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('## Mobile Android bundle budget');
console.log('');
console.log('| Current bytes | Baseline bytes | Maximum bytes | Growth |');
console.log('| ---: | ---: | ---: | ---: |');
console.log(
  `| ${currentBytes} | ${baselineBytes} | ${maximumBytes} | ${report.growthPercent.toFixed(
    2,
  )}% |`,
);
console.log('');
console.log(`Bundle: ${report.bundlePath}`);
console.log(`Report: ${path.relative(repoRoot, reportPath)}`);

if (currentBytes > maximumBytes) {
  console.error(
    `Android bundle ${currentBytes} bytes exceeds the ${maximumBytes}-byte budget.`,
  );
  process.exit(1);
}
