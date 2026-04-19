const { spawn } = require('child_process');

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const expoArgs = ['expo', 'start', ...process.argv.slice(2)];

const child = spawn(npxCommand, expoArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_UNSTABLE_MCP_SERVER: '1',
  },
});

child.on('error', (error) => {
  console.error(`Failed to start Expo MCP mode: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
