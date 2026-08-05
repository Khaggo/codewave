#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const ISO_25010_CHARACTERISTICS = Object.freeze([
  'functionalSuitability',
  'performanceEfficiency',
  'compatibility',
  'usability',
  'reliability',
  'security',
  'maintainability',
  'portability',
]);

const CHARACTERISTIC_MATCHERS = Object.freeze({
  functionalSuitability: /booking|job order|qa|insurance|billing|accessories|loyalty|garage/i,
  performanceEfficiency: /bounded|500|pagination|queue|page-stable|viewport/i,
  compatibility: /mobile|desktop|tablet|responsive|viewport/i,
  usability: /ux|readable|reference|accessib|touch|empty|error|recovery/i,
  reliability: /retry|recovery|conflict|stale|failed|timeout|session|atomic/i,
  security: /privacy|uuid|hash|unauthor|role|claim|internal|customer-safe|review-gat/i,
  maintainability: /contract|fixture|deterministic|evidence|schema/i,
  portability: /mobile|desktop|tablet|viewport|export/i,
});

const KNOWN_ARTIFACTS = Object.freeze([
  'results.json',
  'qa-summary.md',
  'html-report/index.html',
  'ui-report/index.html',
  'storybook-report/index.html',
]);

function parseArgs(argv) {
  const options = {
    results: path.resolve('qa/playwright/artifacts/results.json'),
    artifacts: path.resolve('qa/playwright/artifacts'),
    output: '',
    requireResults: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--results') options.results = path.resolve(argv[++index]);
    else if (value === '--artifacts') options.artifacts = path.resolve(argv[++index]);
    else if (value === '--output') options.output = path.resolve(argv[++index]);
    else if (value === '--require-results') options.requireResults = true;
    else if (value === '--help') options.help = true;
    else throw new Error(`Unknown option: ${value}`);
  }

  return options;
}

function flattenPlaywrightSuites(suites, parents = []) {
  const flattened = [];
  for (const suite of Array.isArray(suites) ? suites : []) {
    const suitePath = [...parents, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const results = Array.isArray(test.results) ? test.results : [];
        const latest = results.at(-1) ?? {};
        const status = latest.status ?? test.status ?? 'unknown';
        flattened.push({
          title: [...suitePath, spec.title].filter(Boolean).join(' > '),
          file: spec.file ?? suite.file ?? null,
          project: latest.projectName ?? test.projectName ?? null,
          status,
          expectedStatus: test.expectedStatus ?? null,
          durationMs: Number.isFinite(latest.duration) ? latest.duration : null,
          retries: results.length > 0 ? results.length - 1 : 0,
        });
      }
    }
    flattened.push(...flattenPlaywrightSuites(suite.suites, suitePath));
  }
  return flattened;
}

function normalizeStatus(status) {
  if (status === 'passed') return 'passed';
  if (status === 'skipped' || status === 'disabled') return 'skipped';
  if (status === 'failed' || status === 'timedOut' || status === 'interrupted') return 'failed';
  return 'unknown';
}

export function readPlaywrightEvidence(resultsPath) {
  if (!fs.existsSync(resultsPath)) {
    return {
      status: 'missing',
      path: resultsPath,
      tests: [],
      stats: null,
    };
  }

  const raw = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const tests = flattenPlaywrightSuites(raw.suites).map((test) => ({
    ...test,
    status: normalizeStatus(test.status),
  }));

  return {
    status: 'observed',
    path: resultsPath,
    tests,
    stats: raw.stats ?? null,
  };
}

function summarizeTests(tests) {
  return tests.reduce(
    (summary, test) => {
      summary.total += 1;
      summary[test.status] = (summary[test.status] ?? 0) + 1;
      return summary;
    },
    { total: 0, passed: 0, failed: 0, skipped: 0, unknown: 0 },
  );
}

function buildCharacteristicEvidence(tests) {
  return Object.fromEntries(
    ISO_25010_CHARACTERISTICS.map((characteristic) => {
      const matcher = CHARACTERISTIC_MATCHERS[characteristic];
      const matched = tests.filter((test) => matcher.test(`${test.title} ${test.file ?? ''}`));
      const status = matched.length === 0
        ? 'not_observed'
        : matched.some((test) => test.status === 'failed')
          ? 'observed_with_failures'
          : matched.some((test) => test.status === 'passed')
            ? 'observed'
            : 'observed_skipped_only';

      return [characteristic, {
        status,
        matchedTests: matched.map((test) => ({
          title: test.title,
          file: test.file,
          project: test.project,
          status: test.status,
        })),
      }];
    }),
  );
}

function collectArtifactStatus(artifactRoot) {
  return KNOWN_ARTIFACTS.map((relativePath) => {
    const absolutePath = path.join(artifactRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      return { path: relativePath, status: 'missing', bytes: null };
    }
    return {
      path: relativePath,
      status: 'present',
      bytes: fs.statSync(absolutePath).size,
    };
  });
}

export function collectIso25010Evidence({
  resultsPath = path.resolve('qa/playwright/artifacts/results.json'),
  artifactRoot = path.resolve('qa/playwright/artifacts'),
  generatedAt = new Date().toISOString(),
} = {}) {
  const playwrightEvidence = readPlaywrightEvidence(resultsPath);
  const tests = playwrightEvidence.tests;
  return {
    schema: 'autocare.iso-25010-automated-evidence.v1',
    generatedAt,
    source: {
      collector: 'tools/iso-25010-evidence.mjs',
      playwrightResults: path.relative(process.cwd(), resultsPath),
      artifactRoot: path.relative(process.cwd(), artifactRoot),
    },
    testRun: {
      status: playwrightEvidence.status,
      summary: summarizeTests(tests),
      reportedStats: playwrightEvidence.stats,
    },
    characteristics: buildCharacteristicEvidence(tests),
    artifacts: collectArtifactStatus(artifactRoot),
    survey: {
      status: 'pending',
      respondents: null,
      results: null,
      note: 'Respondent survey results are not generated or inferred by this collector.',
    },
  };
}

export function writeEvidenceReport(report, outputPath) {
  const absolutePath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(absolutePath),
    `.${path.basename(absolutePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  fs.writeFileSync(temporaryPath, `${JSON.stringify(report, null, 2)}${os.EOL}`, 'utf8');
  fs.renameSync(temporaryPath, absolutePath);
  return absolutePath;
}

function printHelp() {
  console.log([
    'Usage: node tools/iso-25010-evidence.mjs [options]',
    '',
    '--results <path>          Playwright JSON results file.',
    '--artifacts <path>        Playwright artifact directory.',
    '--output <path>           Atomically write the JSON report to this path.',
    '--require-results         Exit 2 when the results file is missing.',
  ].join('\n'));
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const report = collectIso25010Evidence({
    resultsPath: options.results,
    artifactRoot: options.artifacts,
  });
  if (options.output) writeEvidenceReport(report, options.output);
  process.stdout.write(`${JSON.stringify(report)}${os.EOL}`);

  if (options.requireResults && report.testRun.status === 'missing') return 2;
  return 0;
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
