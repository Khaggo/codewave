import { spawnSync } from 'node:child_process';

import {
  databaseFingerprint,
  isProductionLikeDatabase,
} from './operational-safety';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://admin:root@localhost:5433/codewave';

if (isProductionLikeDatabase(databaseUrl)) {
  throw new Error(
    `db:push:local refused non-local target ${databaseFingerprint(databaseUrl)}. Use committed migrations.`,
  );
}

console.log(`Pushing schema to local target ${databaseFingerprint(databaseUrl)}.`);
const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(executable, ['drizzle-kit', 'push'], {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
