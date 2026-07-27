import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const graphPath = path.resolve('graphify-out', 'graph.json');
if (!existsSync(graphPath)) {
  console.error('Graphify output is missing. Run: graphify extract . --code-only --no-cluster');
  process.exit(1);
}

const graph = JSON.parse(readFileSync(graphPath, 'utf8'));
const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
const edges = Array.isArray(graph.edges) ? graph.edges : [];
const generatedPattern =
  /(^|\/)(?:node_modules|coverage|dist|graphify-out|\.expo|\.next[^/]*|expo-export[^/]*)\//;
const generatedNodes = nodes.filter((node) =>
  generatedPattern.test(String(node.source_file ?? '').replaceAll('\\', '/')),
);

if (nodes.length < 100 || edges.length < 100) {
  console.error(`Graphify output is unexpectedly small: ${nodes.length} nodes, ${edges.length} edges.`);
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

console.log(`Graphify check passed: ${nodes.length} nodes, ${edges.length} edges.`);
