import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const scope = process.env.SCOPE;
const outputPath = process.env.GITHUB_OUTPUT;
const base = process.env.BASE_SHA;
const allScopes = new Set(['backend', 'frontend', 'mobile']);

if (!allScopes.has(scope)) {
  console.error(`Unknown CI scope: ${scope}`);
  process.exit(2);
}

let run = true;
if (base && !/^0+$/.test(base)) {
  const changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const shared = changed.some((file) =>
    /^(?:package(?:-lock)?\.json|tools\/|packages\/|\.github\/|docs\/architecture\/)/.test(
      file,
    ),
  );
  run = shared || changed.some((file) => file.startsWith(`${scope}/`));
}

const value = `run=${run ? 'true' : 'false'}\n`;
if (outputPath) {
  appendFileSync(outputPath, value);
}
console.log(`${scope}: ${value.trim()}`);
