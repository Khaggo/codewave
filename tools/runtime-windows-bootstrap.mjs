import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

import { removeFileSafely } from './runtime-file-utils.mjs';

const descriptorPath = path.resolve(process.cwd(), process.argv[2] ?? '');
const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
removeFileSafely(descriptorPath);

const watchdog = spawn(process.execPath, descriptor.watchdogArguments, {
  cwd: descriptor.cwd,
  shell: false,
  detached: true,
  windowsHide: true,
  env: process.env,
  stdio: 'ignore',
});
watchdog.unref();

const shutdown = () => {
  if (!watchdog.killed) {
    watchdog.kill('SIGTERM');
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
watchdog.on('error', () => process.exit(1));
watchdog.on('exit', (code) => process.exit(code ?? 0));
