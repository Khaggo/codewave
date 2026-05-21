import fs from 'node:fs';
import path from 'node:path';

function readAnnotation(test, type) {
  return test.annotations.find((entry) => entry.type === type)?.description ?? null;
}

function readFindings(test) {
  return test.annotations
    .filter((entry) => entry.type === 'qa-finding' && entry.description)
    .map((entry) => {
      try {
        return JSON.parse(entry.description);
      } catch {
        return { severity: 'medium', summary: entry.description };
      }
    });
}

export default class StructuredQaReporter {
  constructor(options = {}) {
    this.outputFile = options.outputFile ?? 'qa/playwright/artifacts/qa-summary.md';
    this.results = [];
  }

  onTestEnd(test, result) {
    this.results.push({
      title: test.titlePath().filter(Boolean).join(' > '),
      status: result.status,
      severity: readAnnotation(test, 'qa-severity') ?? 'medium',
      summary: readAnnotation(test, 'qa-summary') ?? '',
      findings: readFindings(test),
      error: result.error?.message ?? '',
    });
  }

  async onEnd() {
    const grouped = {
      passed: this.results.filter((entry) => entry.status === 'passed'),
      failed: this.results.filter((entry) => entry.status === 'failed'),
      skipped: this.results.filter((entry) => entry.status === 'skipped'),
      timedOut: this.results.filter((entry) => entry.status === 'timedOut'),
    };

    const lines = [
      '# AUTOCARE Structured QA Report',
      '',
      '## Summary',
      '',
      `- Passed: ${grouped.passed.length}`,
      `- Failed: ${grouped.failed.length}`,
      `- Timed out: ${grouped.timedOut.length}`,
      `- Skipped: ${grouped.skipped.length}`,
      '',
      '## Passed',
      '',
    ];

    if (grouped.passed.length === 0) {
      lines.push('- None');
    } else {
      for (const entry of grouped.passed) {
        lines.push(`- [${entry.severity.toUpperCase()}] ${entry.title}${entry.summary ? `: ${entry.summary}` : ''}`);
        if (entry.findings.length > 0) {
          for (const finding of entry.findings) {
            lines.push(`  Finding: ${finding.severity?.toUpperCase?.() ?? 'MEDIUM'}: ${finding.summary}`);
          }
        }
      }
    }

    lines.push('', '## Failed / Needs Fixing', '');

    const failedEntries = [...grouped.failed, ...grouped.timedOut];
    if (failedEntries.length === 0) {
      lines.push('- None');
    } else {
      for (const entry of failedEntries) {
        lines.push(`- [${entry.severity.toUpperCase()}] ${entry.title}`);
        if (entry.summary) {
          lines.push(`  Summary: ${entry.summary}`);
        }
        if (entry.findings.length > 0) {
          for (const finding of entry.findings) {
            lines.push(`  - ${finding.severity?.toUpperCase?.() ?? 'MEDIUM'}: ${finding.summary}`);
          }
        }
        if (entry.error) {
          lines.push(`  Error: ${entry.error.replace(/\s+/g, ' ').trim()}`);
        }
      }
    }

    lines.push('', '## Skipped', '');

    if (grouped.skipped.length === 0) {
      lines.push('- None');
    } else {
      for (const entry of grouped.skipped) {
        lines.push(`- [${entry.severity.toUpperCase()}] ${entry.title}${entry.summary ? `: ${entry.summary}` : ''}`);
      }
    }

    const outputPath = path.resolve(this.outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
  }
}
