import { spawn } from 'node:child_process';
import fs from 'node:fs';

import { normalizeSpawnEnvironment } from './runtime-definitions.mjs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmExecPath = process.env.npm_execpath && fs.existsSync(process.env.npm_execpath)
  ? process.env.npm_execpath
  : null;
const steps = [
  { label: 'web component tests', args: ['run', 'test:web'], timeoutMs: 180_000 },
  { label: 'mobile component tests', args: ['run', 'test:mobile'], timeoutMs: 180_000 },
  { label: 'Storybook interaction and accessibility tests', args: ['run', 'test:storybook'], timeoutMs: 180_000 },
  { label: 'Storybook browser checks', args: ['run', 'qa:storybook'], timeoutMs: 180_000 },
  { label: 'responsive UI checks', args: ['run', 'qa:ui'], timeoutMs: 240_000 },
];

const runStep = ({ label, args, timeoutMs }) => new Promise((resolve, reject) => {
  process.stdout.write(`[ui-check] ${label} (deadline ${timeoutMs}ms)\n`);
  const child = spawn(npmExecPath ? process.execPath : npmCommand, npmExecPath ? [npmExecPath, ...args] : args, {
    cwd: process.cwd(),
    env: normalizeSpawnEnvironment(process.env),
    shell: false,
    stdio: 'inherit',
    windowsHide: true,
  });
  const timer = setTimeout(() => {
    child.kill('SIGTERM');
    reject(new Error(`${label} exceeded its ${timeoutMs}ms deadline.`));
  }, timeoutMs);

  child.once('error', (error) => {
    clearTimeout(timer);
    reject(error);
  });
  child.once('exit', (code, signal) => {
    clearTimeout(timer);
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(`${label} failed (${signal ?? `exit ${code}`}).`));
  });
});

for (const step of steps) {
  await runStep(step);
}

process.stdout.write('[ui-check] all UI checks passed.\n');
