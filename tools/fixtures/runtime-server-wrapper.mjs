import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(directory, 'runtime-http-server.mjs');
const port = process.argv[2];
const delayMs = Number.parseInt(process.argv[3] ?? '0', 10) || 0;
let child = null;

const startChild = () => {
  child = spawn(process.execPath, [serverPath, port], {
    stdio: 'ignore',
    windowsHide: true,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
};

setTimeout(startChild, delayMs);

const shutdown = () => {
  if (child && !child.killed) {
    child.kill('SIGTERM');
    return;
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
