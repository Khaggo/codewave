import { stopMainService } from './swagger.shared';

async function main() {
  const stopped = await stopMainService();
  process.stdout.write(stopped ? 'Stopped main service.\n' : 'No running main service was found.\n');
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
