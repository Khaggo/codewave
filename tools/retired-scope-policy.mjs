import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const activeRoots = [
  'backend/apps/main-service/src',
  'backend/shared',
  'frontend/src',
  'mobile/src',
  'packages',
];

const activeFiles = [
  'package.json',
  'backend/package.json',
  'frontend/package.json',
  'mobile/package.json',
  'backend/railway.toml',
  'backend/.env.example',
  'backend/.env.railway.example',
];

const sourceExtensions = new Set([
  '.cjs',
  '.js',
  '.jsx',
  '.json',
  '.mjs',
  '.toml',
  '.ts',
  '.tsx',
]);

const pathRules = [
  {
    id: 'retired ecommerce file',
    pattern:
      /(?:^|\/)(?:ecommerce-service|shopProductAdmin|inventoryWorkspace|StoreScreen|ShopScreen)(?:\/|\.|$)/i,
  },
  {
    id: 'retired ecommerce generated contract',
    pattern:
      /(?:^|\/)lib\/api\/generated\/(?:cart|catalog|inventory|orders|invoice-orders)(?:\/|$)/i,
  },
  {
    id: 'retired ecommerce mock',
    pattern: /(?:^|\/)mocks\/(?:orders|products|inventory|cart)(?:\/|$)/i,
  },
];

const sourceRules = [
  {
    id: 'retired ecommerce service reference',
    pattern: /\becommerce-service\b/i,
  },
  {
    id: 'retired commerce event reference',
    pattern:
      /\b(?:CommerceEventsModule|commerce-event-reaction-planner|CommerceEventReactionPlannerService)\b/i,
  },
  {
    id: 'retired ecommerce API route',
    pattern:
      /[\u0022'\u0060]\/api\/(?:cart|products?(?:-categories)?|catalog|inventory|checkout|orders|invoices|users\/[^\u0022'\u0060\/]+\/orders)(?:\/|[\u0022'\u0060])/i,
  },
  {
    id: 'retired ecommerce client',
    pattern:
      /\b(?:catalogClient|ecommerceCheckoutClient|inventoryAdminClient|invoiceOrderManagementClient)\b/i,
  },
  {
    id: 'retired mobile shop UI',
    pattern:
      /\b(?:shopScrollContent|shopCartButton|shopProductCount|productMetaRow|productDetailCartButton|product ordering)\b/i,
  },
];

const normalizePath = (filePath) => filePath.split(path.sep).join('/');

const lineForIndex = (source, index) =>
  source.slice(0, Math.max(0, index)).split(/\r?\n/).length;

export const inspectRetiredScopeSource = ({ relativePath, source }) => {
  const normalizedPath = normalizePath(relativePath);
  const violations = [];

  for (const rule of pathRules) {
    if (rule.pattern.test(normalizedPath)) {
      violations.push({
        file: normalizedPath,
        line: 1,
        rule: rule.id,
      });
    }
  }

  for (const rule of sourceRules) {
    const flags = rule.pattern.flags.includes('g')
      ? rule.pattern.flags
      : `${rule.pattern.flags}g`;
    const pattern = new RegExp(rule.pattern.source, flags);
    for (const match of source.matchAll(pattern)) {
      violations.push({
        file: normalizedPath,
        line: lineForIndex(source, match.index),
        rule: rule.id,
      });
    }
  }

  return violations;
};

const shouldInspect = (filePath) => {
  const basename = path.basename(filePath);
  return basename.startsWith('.env') || sourceExtensions.has(path.extname(filePath));
};

const collectFiles = (entryPath, files) => {
  if (!existsSync(entryPath)) {
    return;
  }

  if (!statSync(entryPath).isDirectory()) {
    if (shouldInspect(entryPath)) {
      files.push(entryPath);
    }
    return;
  }

  for (const entry of readdirSync(entryPath)) {
    if (
      entry === 'node_modules' ||
      entry === 'coverage' ||
      entry === 'dist' ||
      entry === '.next' ||
      entry === '.expo'
    ) {
      continue;
    }
    collectFiles(path.join(entryPath, entry), files);
  }
};

export const findRetiredScopeViolations = (root) => {
  const files = [];
  for (const relativePath of [...activeRoots, ...activeFiles]) {
    collectFiles(path.join(root, relativePath), files);
  }

  return files.flatMap((filePath) =>
    inspectRetiredScopeSource({
      relativePath: path.relative(root, filePath),
      source: readFileSync(filePath, 'utf8'),
    }),
  );
};
