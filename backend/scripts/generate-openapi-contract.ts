import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import request from 'supertest';

import { createMainServiceTestApp } from '../apps/main-service/test/helpers/main-service-test-app';

const outputPath = path.resolve(
  __dirname,
  '..',
  '..',
  'packages',
  'contracts',
  'openapi',
  'main-service.json',
);

const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortValue(entry)]),
  );
};

async function main() {
  const checkOnly = process.argv.includes('--check');
  console.log('Compiling isolated OpenAPI test application...');
  const { app } = await createMainServiceTestApp();

  try {
    console.log('Rendering OpenAPI document...');
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const generated = `${JSON.stringify(sortValue(response.body), null, 2)}\n`;

    if (checkOnly) {
      let committed = '';
      try {
        committed = readFileSync(outputPath, 'utf8');
      } catch {
        throw new Error('OpenAPI artifact is missing. Run npm run contracts:generate.');
      }
      if (committed !== generated) {
        throw new Error('OpenAPI artifact is stale. Run npm run contracts:generate.');
      }
      console.log('OpenAPI contract artifact is current.');
      return;
    }

    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, generated, 'utf8');
    console.log(`Generated ${path.relative(process.cwd(), outputPath)}.`);
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
