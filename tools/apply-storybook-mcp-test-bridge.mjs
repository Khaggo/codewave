import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repositoryDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const packageDirectory = path.join(
  repositoryDirectory,
  'node_modules',
  '@storybook',
  'addon-mcp',
);
const packageJsonPath = path.join(packageDirectory, 'package.json');
const presetPath = path.join(packageDirectory, 'dist', 'preset.js');
const supportedVersion = '0.7.0';
const marker = 'codewave-storybook-playwright-test-bridge-v1';

if (!fs.existsSync(packageJsonPath) || !fs.existsSync(presetPath)) {
  console.log('Storybook MCP bridge skipped: @storybook/addon-mcp is not installed.');
  process.exit(0);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (packageJson.version !== supportedVersion) {
  throw new Error(
    `Storybook MCP bridge supports @storybook/addon-mcp ${supportedVersion}; found ${packageJson.version}. Review the upstream test bridge before upgrading.`,
  );
}

let source = fs.readFileSync(presetPath, 'utf8');
if (source.includes(marker)) {
  console.log('Storybook MCP bounded test bridge is already applied.');
  process.exit(0);
}

const importNeedle = 'import { execSync } from "node:child_process";';
const functionNeedle =
  'async function addRunStoryTestsTool(server, { a11yEnabled }, enabled = () => server.ctx.custom?.toolsets?.test ?? true) {';
const testRunNeedle =
  '\t\t\tconst testResults = (await triggerTestRun(channel, addonVitestConstants.TRIGGER_TEST_RUN_REQUEST, addonVitestConstants.TRIGGER_TEST_RUN_RESPONSE, storyIds, { a11y: runA11y })).result;';

if (
  !source.includes(importNeedle)
  || !source.includes(functionNeedle)
  || !source.includes(testRunNeedle)
) {
  throw new Error(
    'Storybook MCP bridge target changed. Refusing to patch an unknown addon layout.',
  );
}

source = source.replace(
  importNeedle,
  'import { execFileSync, execSync, spawn } from "node:child_process";',
);
source = source.replace(
  functionNeedle,
  `// ${marker}
function runCodewaveStoryTests(options, storyIds, runA11y) {
\treturn new Promise((resolve, reject) => {
\t\tconst runnerPath = path.resolve(options.configDir, "..", "..", "tools", "run-storybook-mcp-tests.mjs");
\t\tconst runnerArguments = [runnerPath];
\t\tfor (const storyId of storyIds ?? []) runnerArguments.push("--story", storyId);
\t\tif (runA11y) runnerArguments.push("--a11y");
\t\tconst startedAt = Date.now();
\t\tconst child = spawn(process.execPath, runnerArguments, {
\t\t\tcwd: path.resolve(options.configDir, ".."),
\t\t\tenv: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: "1" },
\t\t\tstdio: ["ignore", "pipe", "pipe"],
\t\t\twindowsHide: true
\t\t});
\t\tlet stdout = "";
\t\tlet stderr = "";
\t\tlet settled = false;
\t\tconst finish = (callback) => {
\t\t\tif (settled) return;
\t\t\tsettled = true;
\t\t\tclearTimeout(timeout);
\t\t\tcallback();
\t\t};
\t\tconst terminate = () => {
\t\t\tif (process.platform === "win32" && child.pid) {
\t\t\t\ttry {
\t\t\t\t\texecFileSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
\t\t\t\t\t\tstdio: "ignore",
\t\t\t\t\t\ttimeout: 5000,
\t\t\t\t\t\twindowsHide: true
\t\t\t\t\t});
\t\t\t\t} catch {}
\t\t\t} else child.kill("SIGTERM");
\t\t};
\t\tconst timeout = setTimeout(() => {
\t\t\tterminate();
\t\t\tfinish(() => reject(new Error("Storybook Playwright bridge exceeded its 60-second deadline")));
\t\t}, 60000);
\t\tchild.stdout?.on("data", (chunk) => {
\t\t\tstdout += chunk.toString();
\t\t});
\t\tchild.stderr?.on("data", (chunk) => {
\t\t\tstderr += chunk.toString();
\t\t});
\t\tchild.once("error", (error) => finish(() => reject(error)));
\t\tchild.once("exit", (code, signal) => {
\t\t\tif (code === 0) {
\t\t\t\tfinish(() => resolve({
\t\t\t\t\tdurationMs: Date.now() - startedAt,
\t\t\t\t\toutput: stdout.trim()
\t\t\t\t}));
\t\t\t\treturn;
\t\t\t}
\t\t\tconst detail = [stderr.trim(), stdout.trim()].filter(Boolean).join("\\n");
\t\t\tfinish(() => reject(new Error(\`Storybook Playwright bridge failed (code=\${code ?? "null"}, signal=\${signal ?? "null"}).\${detail ? \`\\n\${detail}\` : ""}\`)));
\t\t});
\t});
}

${functionNeedle}`,
);
source = source.replace(
  `${testRunNeedle}
\t\t\tif (!testResults) throw new Error("Test run response missing result data");
\t\t\tconst { text, summary } = formatRunStoryTestResults({
\t\t\t\ttestResults,
\t\t\t\trunA11y,
\t\t\t\torigin
\t\t\t});
\t\t\tif (!disableTelemetry) await collectTelemetry({
\t\t\t\tevent: "tool:runStoryTests",
\t\t\t\tserver,
\t\t\t\ttoolset: "test",
\t\t\t\trunA11y,
\t\t\t\tinputStoryCount,
\t\t\t\tmatchedStoryCount: testResults.storyIds?.length ?? storyIds?.length ?? 0,
\t\t\t\t...summary
\t\t\t});
\t\t\treturn { content: [{
\t\t\t\ttype: "text",
\t\t\t\ttext
\t\t\t}] };`,
  `\t\t\tconst { durationMs, output } = await runCodewaveStoryTests(options, storyIds, runA11y);
\t\t\tconst scopeNote = storyIds?.length
\t\t\t\t? \`The compatibility bridge validated \${storyIds.length} requested \${storyIds.length === 1 ? "story" : "stories"}.\`
\t\t\t\t: "The complete story suite was validated.";
\t\t\treturn { content: [{
\t\t\t\ttype: "text",
\t\t\t\ttext: \`Story tests passed through the bounded Storybook Playwright bridge in \${durationMs}ms.\\n\${scopeNote}\\n\\n\${output}\`
\t\t\t}] };`,
);

fs.writeFileSync(presetPath, source, 'utf8');
console.log('Applied Storybook MCP bounded test bridge.');
