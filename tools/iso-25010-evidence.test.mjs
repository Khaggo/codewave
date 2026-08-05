import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  collectIso25010Evidence,
  readPlaywrightEvidence,
  writeEvidenceReport,
} from './iso-25010-evidence.mjs';

function makeResults() {
  return {
    stats: { expected: 2, unexpected: 1, skipped: 1 },
    suites: [
      {
        title: 'Panelist remediation',
        file: 'panelist-remediation.acceptance.spec.mjs',
        specs: [
          {
            title: 'bounded queue conflict recovery',
            tests: [{ status: 'expected', results: [{ status: 'passed', duration: 12 }] }],
          },
          {
            title: 'customer privacy failure',
            tests: [{ status: 'unexpected', results: [{ status: 'failed', duration: 4 }] }],
          },
        ],
        suites: [
          {
            title: 'viewport checks',
            file: 'panelist-remediation.acceptance.spec.mjs',
            specs: [
              {
                title: 'mobile skipped without runtime',
                tests: [{ status: 'skipped', results: [{ status: 'skipped', duration: 0 }] }],
              },
            ],
          },
        ],
      },
    ],
  };
}

test('ISO evidence collector reports observed test statuses and keeps the survey pending', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'autocare-iso-'));
  const resultsPath = path.join(root, 'results.json');
  const artifactsPath = path.join(root, 'artifacts');
  fs.mkdirSync(path.join(artifactsPath, 'html-report'), { recursive: true });
  fs.writeFileSync(resultsPath, JSON.stringify(makeResults()), 'utf8');
  fs.writeFileSync(path.join(artifactsPath, 'results.json'), '{}', 'utf8');
  fs.writeFileSync(path.join(artifactsPath, 'qa-summary.md'), 'real artifact', 'utf8');

  const report = collectIso25010Evidence({
    resultsPath,
    artifactRoot: artifactsPath,
    generatedAt: '2026-08-05T00:00:00.000Z',
  });

  assert.equal(report.testRun.status, 'observed');
  assert.deepEqual(report.testRun.summary, {
    total: 3,
    passed: 1,
    failed: 1,
    skipped: 1,
    unknown: 0,
  });
  assert.equal(report.survey.status, 'pending');
  assert.equal(report.survey.respondents, null);
  assert.equal(report.survey.results, null);
  assert.equal(report.characteristics.reliability.status, 'observed');
  assert.equal(report.characteristics.security.status, 'observed_with_failures');
  assert.equal(report.characteristics.portability.status, 'observed_skipped_only');
  assert.equal(report.artifacts.find((item) => item.path === 'results.json').status, 'present');
  assert.equal(report.artifacts.find((item) => item.path === 'html-report/index.html').status, 'missing');
});

test('missing Playwright results are explicit and can fail a required evidence run', () => {
  const evidence = readPlaywrightEvidence(path.join(os.tmpdir(), 'autocare-results-does-not-exist.json'));
  assert.equal(evidence.status, 'missing');
  assert.deepEqual(evidence.tests, []);
});

test('evidence reports are atomically replaceable without inventing survey data', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'autocare-iso-write-'));
  const outputPath = path.join(root, 'nested', 'evidence.json');
  const report = collectIso25010Evidence({
    resultsPath: path.join(root, 'missing-results.json'),
    artifactRoot: root,
    generatedAt: '2026-08-05T00:00:00.000Z',
  });

  writeEvidenceReport(report, outputPath);
  assert.equal(fs.existsSync(outputPath), true);
  const written = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(written.survey.status, 'pending');
  assert.equal(written.survey.respondents, null);
  assert.equal(written.testRun.status, 'missing');
  assert.equal(fs.readdirSync(path.dirname(outputPath)).some((name) => name.endsWith('.tmp')), false);
});
