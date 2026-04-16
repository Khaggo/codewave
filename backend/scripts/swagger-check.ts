import { getDocsJsonUrl, loadLocalEnv } from './swagger.shared';
import { validateMainServiceOpenApiDocument } from './swagger.contract';

async function main() {
  const env = loadLocalEnv();
  const response = await fetch(getDocsJsonUrl(env));

  if (!response.ok) {
    throw new Error(`OpenAPI endpoint returned ${response.status}`);
  }

  const document = (await response.json()) as Parameters<typeof validateMainServiceOpenApiDocument>[0];

  validateMainServiceOpenApiDocument(document);

  process.stdout.write('OpenAPI contract check passed.\n');
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
