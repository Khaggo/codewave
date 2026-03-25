import {
  getDocsJsonUrl,
  getHealthUrl,
  loadLocalEnv,
  readLogTail,
  startInfra,
  startMainService,
  stopMainService,
  waitForHttp,
  waitForPort,
} from './swagger.shared';

async function main() {
  const env = loadLocalEnv();

  await stopMainService();
  await startInfra(env);

  await waitForPort('127.0.0.1', 5432);
  await waitForPort('127.0.0.1', 6379);
  await waitForPort('127.0.0.1', 5672);

  await startMainService(env);

  try {
    await waitForHttp(getHealthUrl(env));
    await waitForHttp(getDocsJsonUrl(env));
  } catch (error) {
    await stopMainService();
    const logTail = readLogTail();
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\n\nMain service log tail:\n${logTail}`,
    );
  }

  process.stdout.write(`Main service is ready.\nHealth: ${getHealthUrl(env)}\nOpenAPI: ${getDocsJsonUrl(env)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
