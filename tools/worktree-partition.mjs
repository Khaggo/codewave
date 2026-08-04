import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GROUPS = Object.freeze([
  {
    id: '01-cross-cutting-workspace',
    description: 'Root workspace metadata, CI, agent configuration, and repository controls.',
    matches: (file) =>
      /^(?:\.github|\.codex|\.serena)\//.test(file) ||
      /^\.codex-runtime[^/]*\//.test(file) ||
      /^(?:package(?:-lock)?\.json|CODEOWNERS|CONTRIBUTING\.md|SECURITY\.md|README\.md|\.editorconfig|\.gitattributes|\.gitignore|\.npmrc|\.nvmrc|\.prettierignore|\.prettierrc\.json)$/.test(
        file,
      ) ||
      /^tools\//.test(file),
  },
  {
    id: '02-accessories-store',
    description: 'Bounded Accessories catalog, ordering, payment, fulfillment, and client surfaces.',
    matches: (file) =>
      /^backend\/apps\/main-service\/(?:src\/modules|test)\/accessories(?:\/|$)/i.test(file) ||
      /^backend\/shared\/db\/schema\/accessor(?:y|ies)(?:-|_|\.|\/|$)/i.test(file) ||
      /^frontend\/src\/(?:app\/admin\/accessories|screens\/accessories|lib\/accessories)(?:\/|$)/i.test(file) ||
      /^mobile\/src\/(?:screens\/accessories|lib\/accessories|components\/accessories)(?:\/|$)/i.test(file) ||
      /^qa\/playwright\/(?:tests|fixtures)\/accessories(?:\/|\.|-|_|$)/i.test(file),
  },
  {
    id: '03-service-only-scope-removal',
    description: 'Retired ecommerce, shop, catalog, inventory, and technician-login surfaces.',
    matches: (file) =>
      /(^|\/)(?:ecommerce-service|e-?commerce|commerce|shop|cart|catalog|inventory)(?:\/|\.|-|_|$)/i.test(
        file,
      ) ||
      /(?:EcommerceUnavailableCard|ShopProductAdmin|InventoryWorkspace|StoreScreen|TechnicianDashboard|technicianMobileAccess|operationsStore|useOperationsStore|catalogClient|ecommerceCheckoutClient|inventoryAdminClient|invoiceOrderManagementClient|runtimeFlags)/i.test(
        file,
      ) ||
      /^frontend\/src\/(?:lib\/api\/generated\/(?:orders|invoice-orders)|mocks\/(?:orders|regression)|screens\/(?:inventoryWorkspace|shopProductAdmin))\//i.test(
        file,
      ) ||
      /^docs\/architecture\/tasks\/(?:02-ecommerce-service|03-integration\/T30[13]-)/.test(
        file,
      ) ||
      /^docs\/architecture\/tasks\/05-client-integration\/T52[4-7]-/.test(file),
  },
  {
    id: '04-database-and-contracts',
    description: 'Drizzle baseline, shared persistence schema, OpenAPI, and pure shared packages.',
    matches: (file) =>
      /^backend\/drizzle\//.test(file) ||
      /^backend\/shared\/db\//.test(file) ||
      /^packages\//.test(file),
  },
  {
    id: '05-backend-identity-and-customer',
    description: 'Authentication, users, vehicles, and technician-profile application code.',
    matches: (file) =>
      /^backend\/apps\/main-service\/(?:src\/modules|test)\/(?:auth|users|vehicles|technician-profiles)/.test(
        file,
      ),
  },
  {
    id: '06-backend-booking-and-service',
    description: 'Booking, service catalog, inspections, lifecycle, and back-job behavior.',
    matches: (file) =>
      /^backend\/apps\/main-service\/(?:src\/modules|test)\/(?:bookings|services|inspections|vehicle-lifecycle|back-jobs)/.test(
        file,
      ),
  },
  {
    id: '07-backend-job-order-and-qa',
    description: 'Job Orders, QA gates, claims, queues, invoices, and finalization.',
    matches: (file) =>
      /^backend\/apps\/main-service\/(?:src\/modules|test)\/(?:job-orders|quality-gates|staff-work-queues|invoice-payments)/.test(
        file,
      ) || /^backend\/scripts\/(?:smoke-job-order|repair-job-order)/.test(file),
  },
  {
    id: '08-backend-insurance-and-notifications',
    description: 'Insurance workflows, customer-safe projections, and notifications.',
    matches: (file) =>
      /^backend\/apps\/main-service\/(?:src\/modules|test)\/(?:insurance|notifications)/.test(
        file,
      ) || /^backend\/scripts\/(?:seed-insurance|smoke-notifications)/.test(file),
  },
  {
    id: '09-backend-loyalty-analytics-support',
    description: 'Loyalty, analytics, chatbot, and remaining main-service support code.',
    matches: (file) =>
      /^backend\/apps\/main-service\/(?:src\/modules|test)\/(?:loyalty|analytics|chatbot)/.test(
        file,
      ),
  },
  {
    id: '10-backend-platform',
    description: 'Remaining backend configuration, scripts, shared infrastructure, and tests.',
    matches: (file) => /^backend\//.test(file),
  },
  {
    id: '11-staff-job-order-and-qa',
    description: 'Staff Job Order, Intake, QA, claim, finalization, and back-job surfaces.',
    matches: (file) =>
      /^frontend\/src\/(?:screens|lib)\/(?:JobOrder|QAAudit|DigitalIntake|BackJob|jobOrder|qualityGate|staffWork|backJob)/.test(
        file,
      ) ||
      /^frontend\/src\/lib\/api\/generated\/(?:job-orders|quality-gates|back-jobs|inspections|invoice-payments)\//.test(
        file,
      ) ||
      /^frontend\/src\/app\/(?:admin\/job-orders|admin\/qa-audit|backjobs|admin\/invoices)/.test(
        file,
      ),
  },
  {
    id: '12-staff-insurance-and-admin',
    description: 'Staff insurance, customer administration, analytics, loyalty, and settings.',
    matches: (file) =>
      /^frontend\/src\/(?:app\/insurance|lib\/insurance|screens\/(?:Insurance|AdminAnalytics|Loyalty|Customer)|components\/(?:Staff|Insurance))/.test(
        file,
      ) ||
      /^frontend\/src\/lib\/api\/generated\/(?:insurance|analytics|loyalty|users|vehicles|notifications)\//.test(
        file,
      ),
  },
  {
    id: '13-staff-shell-and-other',
    description: 'Remaining staff web shell, authentication, shared UI, and routes.',
    matches: (file) =>
      /^frontend\//.test(file) && !/^frontend\/\.storybook\//.test(file),
  },
  {
    id: '14-mobile-insurance-and-garage',
    description: 'Customer Insurance, Garage, vehicle lifecycle, and related data clients.',
    matches: (file) =>
      /^mobile\/src\/screens\/(?:insurance|Insurance|VehicleLifecycle|vehicleLifecycle|Garage|garage|useGarage)/.test(
        file,
      ) ||
      /^mobile\/src\/lib\/(?:insurance|vehicleLifecycle|digitalGarage)/.test(file),
  },
  {
    id: '15-mobile-booking-and-service',
    description: 'Customer booking, service tracking, Job Order progress, and back-job views.',
    matches: (file) =>
      /^mobile\/src\/(?:screens|lib)\/(?:booking|Booking|jobOrder|JobOrder|backJob|BackJob|invoiceCheckout)/.test(
        file,
      ) || /^mobile\/src\/screens\/dashboard\/(?:booking|service|job)/i.test(file),
  },
  {
    id: '16-mobile-auth-shell-and-other',
    description: 'Remaining customer mobile shell, authentication, Home, rewards, and shared UI.',
    matches: (file) => /^mobile\//.test(file),
  },
  {
    id: '17-qa-storybook-and-evidence',
    description: 'Playwright, Storybook, QA fixtures, screenshots, and workflow evidence.',
    matches: (file) =>
      /^qa\//.test(file) ||
      /^playwright(?:\.[a-z0-9-]+)?\.config\.mjs$/i.test(file) ||
      /^(?:storybook|playwright)-.+\.(?:png|jpe?g|webp)$/i.test(file) ||
      /^frontend\/\.storybook\//.test(file),
  },
  {
    id: '18-documentation-and-planning',
    description: 'Architecture, contracts, SSOT, project-control, and planning artifacts.',
    matches: (file) =>
      /^docs\//.test(file) ||
      /^(?:context\.md|system-planning-deliverable\.html|AUTOCARE_.*\.md)$/.test(file),
  },
]);

const CONFLICT_CODES = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU']);

export const parsePorcelainV1Z = (output) => {
  const tokens = output.split('\0');
  const changes = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) continue;
    const status = token.slice(0, 2);
    const file = token.slice(3).replaceAll('\\', '/');
    let source = null;
    if (/[RC]/.test(status)) {
      source = (tokens[index + 1] ?? '').replaceAll('\\', '/');
      index += 1;
    }
    changes.push({ status, file, source });
  }

  return changes;
};

export const classifyChange = (change) =>
  GROUPS.find((group) => group.matches(change.file))?.id ?? '99-unclassified';

export const partitionChanges = (changes) => {
  const groups = new Map(
    GROUPS.map((group) => [
      group.id,
      { id: group.id, description: group.description, changes: [] },
    ]),
  );
  groups.set('99-unclassified', {
    id: '99-unclassified',
    description: 'Files requiring explicit manual ownership before staging.',
    changes: [],
  });

  for (const change of changes) {
    groups.get(classifyChange(change)).changes.push(change);
  }

  const activeGroups = [...groups.values()].filter(
    (group) => group.changes.length > 0,
  );
  return {
    summary: {
      total: changes.length,
      modified: changes.filter((change) => change.status.includes('M')).length,
      deleted: changes.filter((change) => change.status.includes('D')).length,
      untracked: changes.filter((change) => change.status === '??').length,
      staged: changes.filter(
        (change) => change.status[0] !== ' ' && change.status[0] !== '?',
      ).length,
      conflicts: changes.filter((change) => CONFLICT_CODES.has(change.status)).length,
      unclassified:
        activeGroups.find((group) => group.id === '99-unclassified')?.changes
          .length ?? 0,
    },
    groups: activeGroups,
  };
};

export const readWorktreeChanges = (cwd = process.cwd()) => {
  const result = spawnSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'Unable to read Git worktree status.');
  }
  return parsePorcelainV1Z(result.stdout);
};

const printReport = (report) => {
  console.log(
    `Worktree: ${report.summary.total} changes, ${report.summary.staged} staged, ${report.summary.conflicts} conflicts, ${report.summary.unclassified} unclassified.`,
  );
  for (const group of report.groups) {
    console.log(`${String(group.changes.length).padStart(4)}  ${group.id}`);
  }
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    const report = partitionChanges(readWorktreeChanges());
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }
    if (process.argv.includes('--fail-on-unclassified') && report.summary.unclassified) {
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
