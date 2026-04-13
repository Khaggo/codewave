import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

type ManifestEntry = {
  path: string;
  docId: string;
  docType: 'control-plane' | 'agent-role' | 'domain';
  owningService: string;
  owningRole: string;
  requiredHeadings: string[];
  directDependencies: string[];
  summaryMaxWords: number | null;
  version: number;
  hash: {
    algorithm: string;
    value: string;
  };
  validationStatus: string;
  lastVerifiedAt: string;
};

type Manifest = {
  schemaVersion: number;
  generatedAt: string;
  policy: {
    orchestratorWriteMode: string;
    validatorMode: string;
    domainWorkerManifestWrites: boolean;
    transactionalReplacement: boolean;
  };
  files: ManifestEntry[];
};

type ReferenceDocRule = {
  docPath: string;
  controllerPath: string;
  schemaPath: string;
};

const repoRoot = path.resolve(__dirname, '..', '..');
const docsRoot = path.join(repoRoot, 'docs', 'architecture');
const manifestPath = path.join(docsRoot, 'agent-manifest.json');
const referenceDocRules: ReferenceDocRule[] = [
  {
    docPath: path.join(docsRoot, 'domains', 'main-service', 'auth.md'),
    controllerPath: path.join(
      repoRoot,
      'backend',
      'apps',
      'main-service',
      'src',
      'modules',
      'auth',
      'controllers',
      'auth.controller.ts',
    ),
    schemaPath: path.join(
      repoRoot,
      'backend',
      'apps',
      'main-service',
      'src',
      'modules',
      'auth',
      'schemas',
      'auth.schema.ts',
    ),
  },
  {
    docPath: path.join(docsRoot, 'domains', 'main-service', 'users.md'),
    controllerPath: path.join(
      repoRoot,
      'backend',
      'apps',
      'main-service',
      'src',
      'modules',
      'users',
      'controllers',
      'users.controller.ts',
    ),
    schemaPath: path.join(
      repoRoot,
      'backend',
      'apps',
      'main-service',
      'src',
      'modules',
      'users',
      'schemas',
      'users.schema.ts',
    ),
  },
];

const readJson = <T>(filePath: string): T => {
  const raw = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw) as T;
};

const getHash = (filePath: string) =>
  createHash('sha256').update(readFileSync(filePath)).digest('hex');

const getSecondLevelHeadings = (contents: string) =>
  Array.from(contents.matchAll(/^##\s+(.+)$/gm)).map((match) => match[1].trim());

const getAgentSummaryWordCount = (contents: string) => {
  const normalized = getSectionContents(contents, 'Agent Summary').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.split(' ').length : 0;
};

const getSectionContents = (contents: string, heading: string) => {
  const lines = contents.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (startIndex === -1) {
    return '';
  }

  const sectionLines: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('## ')) {
      break;
    }

    sectionLines.push(lines[index]);
  }

  return sectionLines.join('\n').trim();
};

const getBacktickedValues = (contents: string) =>
  Array.from(contents.matchAll(/`([^`]+)`/g)).map((match) => match[1]);

const normalizeRoute = (controllerPathValue: string, methodPathValue?: string) => {
  const controllerPath = controllerPathValue.replace(/^\/+|\/+$/g, '');
  const methodPath = (methodPathValue ?? '').replace(/^\/+|\/+$/g, '');
  const segments = [controllerPath, methodPath].filter(Boolean);
  return `/${segments.join('/')}`;
};

const parseControllerRoutes = (controllerContents: string) => {
  const controllerMatch = controllerContents.match(/@Controller(?:\('([^']*)'\))?/);
  if (!controllerMatch) {
    return [];
  }

  const controllerPathValue = controllerMatch[1] ?? '';
  const routes = Array.from(
    controllerContents.matchAll(/@(Get|Post|Patch|Delete|Put)\((?:'([^']*)')?\)/g),
  )
    .map((match) => `${match[1].toUpperCase()} ${normalizeRoute(controllerPathValue, match[2])}`)
    .sort();

  return Array.from(new Set(routes));
};

const parseDocApiRoutes = (docContents: string) => {
  const apiSection = getSectionContents(docContents, 'API Surface');
  return Array.from(
    new Set(
      getBacktickedValues(apiSection)
        .filter((value) => /^(GET|POST|PATCH|PUT|DELETE)\s+\/.+$/i.test(value))
        .map((value) => {
          const [method, ...rest] = value.replace(/\s+/g, ' ').trim().split(' ');
          return `${method.toUpperCase()} ${rest.join(' ')}`;
        })
        .sort(),
    ),
  );
};

const parseSchemaTables = (schemaContents: string) =>
  Array.from(
    new Set(Array.from(schemaContents.matchAll(/pgTable\('([^']+)'/g)).map((match) => match[1])),
  ).sort();

const parseDocPrimaryTables = (docContents: string) => {
  const ownedDataSection = getSectionContents(docContents, 'Owned Data / ERD');
  if (!ownedDataSection) {
    return [];
  }

  const lines = ownedDataSection.split('\n');
  const startIndex = lines.findIndex((line) => line.trim() === 'Primary tables or equivalents:');
  if (startIndex === -1) {
    return [];
  }

  const tableLines: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (['Key relations:', 'Core fields:', 'Ownership notes:'].includes(trimmed)) {
      break;
    }

    tableLines.push(lines[index]);
  }

  return Array.from(
    new Set(
      getBacktickedValues(tableLines.join('\n')).filter((value) => /^[a-z0-9_]+$/i.test(value)).sort(),
    ),
  );
};

const ensureRequiredHeadingOrder = (filePath: string, headings: string[], required: string[]) => {
  const actual = headings.join(' | ');
  let lastIndex = -1;

  for (const heading of required) {
    const index = headings.indexOf(heading);
    if (index === -1) {
      throw new Error(`${filePath}: missing required heading "${heading}"`);
    }

    if (index <= lastIndex) {
      throw new Error(`${filePath}: heading "${heading}" is out of order. Actual headings: ${actual}`);
    }

    lastIndex = index;
  }
};

const ensureSameEntries = (label: string, expected: string[], actual: string[]) => {
  const missing = expected.filter((value) => !actual.includes(value));
  const extra = actual.filter((value) => !expected.includes(value));

  if (missing.length || extra.length) {
    const parts = [
      missing.length ? `missing: ${missing.join(', ')}` : null,
      extra.length ? `extra: ${extra.join(', ')}` : null,
    ].filter(Boolean);
    throw new Error(`${label}: ${parts.join(' | ')}`);
  }
};

const main = () => {
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing manifest: ${manifestPath}`);
  }

  const manifest = readJson<Manifest>(manifestPath);

  if (manifest.policy.orchestratorWriteMode !== 'proposal-only') {
    throw new Error('Manifest policy drift: orchestratorWriteMode must stay "proposal-only".');
  }

  if (manifest.policy.validatorMode !== 'content-strict') {
    throw new Error('Manifest policy drift: validatorMode must stay "content-strict".');
  }

  if (manifest.files.some((entry) => entry.path.startsWith('_backlog/'))) {
    throw new Error('Canonical manifest must not include _backlog files.');
  }

  for (const entry of manifest.files) {
    const filePath = path.join(docsRoot, ...entry.path.split('/'));
    if (!existsSync(filePath)) {
      throw new Error(`Manifest points to a missing file: ${entry.path}`);
    }

    const contents = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    const headings = getSecondLevelHeadings(contents);

    ensureRequiredHeadingOrder(entry.path, headings, entry.requiredHeadings);

    if (entry.summaryMaxWords !== null) {
      const summaryWordCount = getAgentSummaryWordCount(contents);
      if (summaryWordCount > entry.summaryMaxWords) {
        throw new Error(
          `${entry.path}: Agent Summary exceeds ${entry.summaryMaxWords} words (${summaryWordCount} found).`,
        );
      }
    }

    const actualHash = getHash(filePath);
    if (entry.hash.algorithm !== 'sha256') {
      throw new Error(`${entry.path}: unsupported manifest hash algorithm "${entry.hash.algorithm}".`);
    }

    if (entry.hash.value !== actualHash) {
      throw new Error(`${entry.path}: manifest hash mismatch.`);
    }
  }

  for (const rule of referenceDocRules) {
    const docContents = readFileSync(rule.docPath, 'utf8').replace(/^\uFEFF/, '');
    const controllerContents = readFileSync(rule.controllerPath, 'utf8').replace(/^\uFEFF/, '');
    const schemaContents = readFileSync(rule.schemaPath, 'utf8').replace(/^\uFEFF/, '');

    const docRoutes = parseDocApiRoutes(docContents);
    const controllerRoutes = parseControllerRoutes(controllerContents);
    ensureSameEntries(`${path.basename(rule.docPath)} API Surface drift`, controllerRoutes, docRoutes);

    const docTables = parseDocPrimaryTables(docContents);
    const schemaTables = parseSchemaTables(schemaContents);
    ensureSameEntries(`${path.basename(rule.docPath)} owned tables drift`, schemaTables, docTables);
  }

  process.stdout.write(
    `Architecture docs validation passed for ${manifest.files.length} canonical files.\n`,
  );
};

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
}
