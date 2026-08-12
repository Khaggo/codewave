const crypto = require('node:crypto');

const LOCAL_DATABASE_HOSTS = new Set([
  '127.0.0.1',
  '::1',
  'localhost',
  'postgres',
  'db',
  'database',
]);

const FIXTURE = Object.freeze({
  vehiclePlates: Object.freeze(['QAMOB1001', 'QAMOB1002', 'QAMOB1003']),
  bookingReferences: Object.freeze(
    Array.from({ length: 12 }, (_, index) => `QA-MOBILE-${String(index + 1).padStart(3, '0')}`),
  ),
  insuranceReference: 'QA-INS-MOBILE-001',
  insuranceClientRequestId: '85b35061-3cf2-4de0-9c4d-e109b8bb7001',
  accessoryCategorySlug: 'qa-mobile-accessories',
  accessoryProducts: Object.freeze([
    Object.freeze({
      slug: 'qa-mobile-cabin-organizer',
      name: 'QA Cabin Organizer',
      sku: 'QA-MOBILE-ACC-001',
      variantName: 'QA Test Variant A',
      priceCents: 100,
      stock: 12,
    }),
    Object.freeze({
      slug: 'qa-mobile-utility-tray',
      name: 'QA Utility Tray',
      sku: 'QA-MOBILE-ACC-002',
      variantName: 'QA Test Variant B',
      priceCents: 200,
      stock: 18,
    }),
  ]),
});

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getStableFixtureIdentifiers(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error('MOBILE_QA_EMAIL is required.');

  return {
    email: normalizedEmail,
    emailFingerprint: crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 12),
    ...FIXTURE,
  };
}

function assertLocalMobileQaFixtureSafety({ nodeEnv, databaseUrl, execute }) {
  if (!['development', 'test'].includes(String(nodeEnv ?? '').toLowerCase())) {
    throw new Error('Mobile QA fixture requires NODE_ENV=test or NODE_ENV=development.');
  }

  let parsed;
  try {
    parsed = new URL(String(databaseUrl ?? ''));
  } catch {
    throw new Error('Mobile QA fixture requires a valid local DATABASE_URL.');
  }

  const host = parsed.hostname.toLowerCase();
  if (!LOCAL_DATABASE_HOSTS.has(host)) {
    throw new Error('Mobile QA fixture refuses non-local, public, and Railway database hosts.');
  }

  return {
    mode: execute ? 'execute' : 'dry_run',
    host,
    database: parsed.pathname.replace(/^\/+/, '') || 'unknown',
  };
}

module.exports = {
  FIXTURE,
  assertLocalMobileQaFixtureSafety,
  getStableFixtureIdentifiers,
  normalizeEmail,
};
