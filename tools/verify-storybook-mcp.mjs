import process from 'node:process';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = new URL(
  process.env.STORYBOOK_MCP_URL ?? 'http://127.0.0.1:6006/mcp',
);
const shouldRunTests = process.argv.includes('--run-tests');
const client = new Client({
  name: 'codewave-storybook-verifier',
  version: '1.0.0',
});
const transport = new StreamableHTTPClientTransport(endpoint);

try {
  await client.connect(transport);
  const { tools } = await client.listTools(undefined, { timeout: 10_000 });
  const toolNames = tools.map((tool) => tool.name);
  if (!toolNames.includes('run-story-tests')) {
    throw new Error('Storybook MCP did not expose run-story-tests');
  }
  console.log(`Storybook MCP connected: ${toolNames.length} tools available.`);

  if (shouldRunTests) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    timeout.unref();
    try {
      const result = await client.callTool(
        {
          name: 'run-story-tests',
          arguments: {
            stories: [{ storyId: 'components-pageheader--default' }],
            a11y: true,
          },
        },
        undefined,
        {
          signal: controller.signal,
          timeout: 45_000,
        },
      );
      const output = result.content
        .filter((entry) => entry.type === 'text')
        .map((entry) => entry.text)
        .join('\n');
      if (result.isError) {
        throw new Error(output || 'Storybook MCP test tool returned an error');
      }
      console.log(output);
    } finally {
      clearTimeout(timeout);
    }
  }
} finally {
  await client.close();
}
