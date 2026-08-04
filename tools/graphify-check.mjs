import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const graphPath = path.resolve('graphify-out', 'graph.json');
const refreshCommand = 'npm run graph:refresh';
const minimumExpectedNodes = 5000;
const minimumExpectedEdges = 10000;
const sourceRoots = ['backend', 'frontend', 'mobile', 'packages', 'qa', 'tools'];
const codeExtensionPattern = /\.(?:cjs|js|jsx|mjs|ts|tsx)$/i;

if (!existsSync(graphPath)) {
  console.error(`Graphify output is missing. Run: ${refreshCommand}`);
  process.exit(1);
}

const graph = JSON.parse(readFileSync(graphPath, 'utf8'));
const graphModifiedAt = statSync(graphPath).mtimeMs;
const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
const edges = Array.isArray(graph.edges) ? graph.edges : [];
const generatedDirectoryPattern =
  /(^|\/)(?:node_modules|coverage|dist|graphify-out|storybook-static|playwright-report|test-results|\.runtime|\.managed-runtime|\.playwright-mcp|\.expo|\.next[^/]*|expo-export[^/]*)\//;
const generatedTemporaryPattern =
  /(^|\/)tmp\/(?:lockgen-[^/]+(?:\/|$)|storybook-mobile-index(?:\.[^/]+)?$)/;
const isGeneratedPath = (value) => {
  const normalizedPath = String(value ?? '').replaceAll('\\', '/');
  return generatedDirectoryPattern.test(normalizedPath)
    || generatedTemporaryPattern.test(normalizedPath);
};
const generatedNodes = nodes.filter((node) =>
  isGeneratedPath(node.source_file),
);
const missingSourceFiles = [
  ...new Set(
    nodes
      .map((node) => String(node.source_file ?? '').trim())
      .filter(Boolean)
      .filter((sourceFile) => !existsSync(path.resolve(sourceFile))),
  ),
];
const newerSourceFiles = sourceRoots.flatMap((sourceRoot) => {
  const absoluteRoot = path.resolve(sourceRoot);
  if (!existsSync(absoluteRoot)) return [];

  return readdirSync(absoluteRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((filePath) => codeExtensionPattern.test(filePath))
    .filter((filePath) => !isGeneratedPath(filePath))
    .filter((filePath) => statSync(filePath).mtimeMs > graphModifiedAt)
    .map((filePath) => path.relative(process.cwd(), filePath));
});

if (
  nodes.length < minimumExpectedNodes ||
  edges.length < minimumExpectedEdges
) {
  console.error(
    `Graphify output is unexpectedly small: ${nodes.length} nodes, ${edges.length} edges. ` +
      `Run a full refresh with: ${refreshCommand}`,
  );
  process.exit(1);
}

if (generatedNodes.length > 0) {
  console.error(
    `Graphify contains ${generatedNodes.length} generated nodes. First examples:\n` +
      generatedNodes
        .slice(0, 10)
        .map((node) => node.source_file)
        .join('\n'),
  );
  process.exit(1);
}

if (missingSourceFiles.length > 0) {
  console.error(
    `Graphify contains nodes for ${missingSourceFiles.length} missing source files. ` +
      `Run a full refresh with: ${refreshCommand}\nFirst examples:\n` +
      missingSourceFiles.slice(0, 10).join('\n'),
  );
  process.exit(1);
}

if (newerSourceFiles.length > 0) {
  console.error(
    `Graphify is older than ${newerSourceFiles.length} source files. ` +
      `Run a full refresh with: ${refreshCommand}\nFirst examples:\n` +
      newerSourceFiles.slice(0, 10).join('\n'),
  );
  process.exit(1);
}

console.log(`Graphify check passed: ${nodes.length} nodes, ${edges.length} edges.`);
