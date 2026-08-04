import fs from 'node:fs';

export function tailFile(filePath, lineCount = 30) {
  if (!fs.existsSync(filePath)) return '';
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - lineCount - 1)).join('\n').trim();
}

export function formatFailureLogs(paths) {
  return [
    tailFile(paths.managerLog, 20),
    tailFile(paths.stderrLog, 30),
  ].filter(Boolean).join('\n');
}

export function formatRuntimeLogs(paths, lineCount = 40) {
  const sections = [
    ['Lifecycle history', tailFile(paths.managerLog, lineCount)],
    ['Current instance stderr', tailFile(paths.stderrLog, lineCount)],
    ['Current instance stdout', tailFile(paths.stdoutLog, lineCount)],
  ];
  return sections
    .map(([title, content]) => `=== ${title} ===\n${content || '(empty)'}`)
    .join('\n');
}

export function formatStatus(status) {
  const pid = status.listenerPid ? ` PID ${status.listenerPid}` : '';
  const probe =
    status.healthProbeAttempts > 1
      ? ` (health probes: ${status.healthProbeAttempts})`
      : '';
  return `${status.name.padEnd(20)} ${status.state.padEnd(18)} port ${status.port}${pid}${probe}`;
}

export function printUsage(runtimeNames) {
  console.log(`Usage:
  node tools/runtime-manager.mjs start [runtime-name]
  node tools/runtime-manager.mjs wait <runtime-name> [timeout-ms]
  node tools/runtime-manager.mjs stop [runtime-name]
  node tools/runtime-manager.mjs restart <runtime-name>
  node tools/runtime-manager.mjs status [runtime-name]
  node tools/runtime-manager.mjs logs <runtime-name> [line-count]

Runtime names: ${runtimeNames.join(', ')}
`);
}
