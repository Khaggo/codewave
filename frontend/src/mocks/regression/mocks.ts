import type {
  ClientRegressionSurface,
  MockCoverageFamily,
} from '../../lib/api/generated/regression/client-regression-pack';

export interface ClientRegressionMockCoverageRow {
  coordinationKey: string;
  taskIds: readonly string[];
  surface: ClientRegressionSurface;
  mockFiles: readonly string[];
  coveredFamilies: readonly MockCoverageFamily[];
  notApplicableFamilies: readonly MockCoverageFamily[];
  notes: string;
}

export const clientRegressionRequiredMockFamilies: readonly MockCoverageFamily[] = [
  'happy',
  'empty',
  'error',
  'unauthorized',
  'forbidden',
  'conflict',
];

export const clientRegressionMockCoverageMatrix: ClientRegressionMockCoverageRow[] = [
  {
    coordinationKey: 'bookings-cluster',
    taskIds: ['T501', 'T502', 'T503', 'T504', 'T505', 'T506', 'T531'],
    surface: 'cross-surface',
    mockFiles: ['frontend/src/mocks/bookings/mocks.ts'],
    coveredFamilies: [
      'happy',
      'empty',
      'error',
      'unauthorized',
      'forbidden',
      'conflict',
    ],
    notApplicableFamilies: [],
    notes:
      'Booking mocks cover discovery, live availability windows, create, history, schedule, queue, unauthorized customer state, forbidden staff actions, and booking conflicts.',
  },
  {
    coordinationKey: 'auth-identity-guardrails',
    taskIds: ['T507', 'T508', 'T509', 'T529'],
    surface: 'cross-surface',
    mockFiles: ['frontend/src/mocks/auth/mocks.ts'],
    coveredFamilies: [
      'happy',
      'error',
      'unauthorized',
      'forbidden',
      'conflict',
    ],
    notApplicableFamilies: ['empty'],
    notes:
      'Auth mocks focus on activation, blocked-state, downgraded-session, and role-surface guardrail coverage rather than empty collection states.',
  },
  {
    coordinationKey: 'customer-profile-address',
    taskIds: ['T510'],
    surface: 'customer-mobile',
    mockFiles: ['frontend/src/mocks/users/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error', 'forbidden', 'conflict'],
    notApplicableFamilies: ['unauthorized'],
    notes:
      'Profile and address mocks cover incomplete profile, no-address states, validation errors, forbidden mutations, and address conflicts.',
  },
  {
    coordinationKey: 'customer-vehicles',
    taskIds: ['T511'],
    surface: 'customer-mobile',
    mockFiles: ['frontend/src/mocks/vehicles/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error', 'forbidden', 'conflict'],
    notApplicableFamilies: ['unauthorized'],
    notes:
      'Vehicle mocks cover first-vehicle onboarding, empty garage, not-found, forbidden owner mismatch, and duplicate-plate conflicts.',
  },
  {
    coordinationKey: 'staff-inspections',
    taskIds: ['T512'],
    surface: 'staff-admin-web',
    mockFiles: ['frontend/src/mocks/inspections/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error', 'forbidden', 'conflict'],
    notApplicableFamilies: ['unauthorized'],
    notes:
      'Inspection mocks cover verified and mixed findings, empty history, vehicle-not-found, forbidden-role, and booking-lineage conflict cases.',
  },
  {
    coordinationKey: 'vehicle-lifecycle',
    taskIds: ['T513'],
    surface: 'customer-mobile',
    mockFiles: ['frontend/src/mocks/vehicle-lifecycle/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error', 'forbidden'],
    notApplicableFamilies: ['unauthorized', 'conflict'],
    notes:
      'Vehicle lifecycle mocks cover empty timeline, reviewed summaries, and role-forbidden customer-safe visibility rules.',
  },
  {
    coordinationKey: 'insurance-cluster',
    taskIds: ['T514', 'T515'],
    surface: 'cross-surface',
    mockFiles: ['frontend/src/mocks/insurance/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error', 'forbidden', 'conflict'],
    notApplicableFamilies: ['unauthorized'],
    notes:
      'Insurance mocks cover customer intake states, empty review queue, inquiry-not-found, forbidden review role, and invalid transition conflict cases.',
  },
  {
    coordinationKey: 'notifications-reminders',
    taskIds: ['T520'],
    surface: 'customer-mobile',
    mockFiles: ['frontend/src/mocks/notifications/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error', 'forbidden'],
    notApplicableFamilies: ['unauthorized', 'conflict'],
    notes:
      'Notification mocks cover feed and preference happy states, derived empty feed handling, load failures, and forbidden cross-account reads while read-state persistence remains a documented API gap.',
  },
  {
    coordinationKey: 'customer-loyalty',
    taskIds: ['T521'],
    surface: 'customer-mobile',
    mockFiles: ['frontend/src/mocks/loyalty/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error', 'forbidden', 'conflict'],
    notApplicableFamilies: ['unauthorized'],
    notes:
      'Loyalty mocks cover zero-balance, partial-history, eligible redemption, insufficient-points conflict, inactive reward, forbidden cross-account access, runtime failure, and legacy-drift display cases.',
  },
  {
    coordinationKey: 'job-order-workbench',
    taskIds: ['T517'],
    surface: 'staff-admin-web',
    mockFiles: ['frontend/src/mocks/job-orders/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error', 'forbidden', 'conflict'],
    notApplicableFamilies: ['unauthorized'],
    notes:
      'Job-order mocks cover workbench handoff empty states, finalize conflicts, forbidden actions, and invoice-related execution cases.',
  },
  {
    coordinationKey: 'quality-gates',
    taskIds: ['T518'],
    surface: 'staff-admin-web',
    mockFiles: ['frontend/src/mocks/quality-gates/mocks.ts'],
    coveredFamilies: ['happy', 'error', 'forbidden', 'conflict'],
    notApplicableFamilies: ['empty', 'unauthorized'],
    notes:
      'QA mocks focus on blocked, passed, pending, overridden, and unavailable gate states rather than collection-empty states.',
  },
  {
    coordinationKey: 'back-jobs',
    taskIds: ['T519'],
    surface: 'staff-admin-web',
    mockFiles: ['frontend/src/mocks/back-jobs/mocks.ts'],
    coveredFamilies: ['happy', 'error', 'conflict'],
    notApplicableFamilies: ['empty', 'unauthorized', 'forbidden'],
    notes:
      'Back-job mocks emphasize lifecycle, customer-safe visibility, and lineage conflict cases; surface-level role denial is covered by the shared T529 guardrail mocks.',
  },
  {
    coordinationKey: 'customer-support-chatbot',
    taskIds: ['T522'],
    surface: 'customer-mobile',
    mockFiles: ['frontend/src/mocks/chatbot/mocks.ts'],
    coveredFamilies: ['happy', 'error'],
    notApplicableFamilies: ['empty', 'unauthorized', 'forbidden', 'conflict'],
    notes:
      'Chatbot mocks cover deterministic answers, lookup answers, and escalation fallback. Session and role guardrails are covered in the shared auth/guardrail registry.',
  },
  {
    coordinationKey: 'admin-analytics',
    taskIds: ['T523'],
    surface: 'staff-admin-web',
    mockFiles: ['frontend/src/mocks/analytics/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error'],
    notApplicableFamilies: ['unauthorized', 'forbidden', 'conflict'],
    notes:
      'Analytics mocks focus on snapshot presence, empty derived states, and partial-load failures. Role gating is inherited from the shared staff web session and guardrail layer.',
  },
  {
    coordinationKey: 'customer-catalog',
    taskIds: ['T524'],
    surface: 'customer-mobile',
    mockFiles: ['frontend/src/mocks/catalog/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error', 'conflict'],
    notApplicableFamilies: ['unauthorized', 'forbidden'],
    notes:
      'Catalog mocks cover ready feed, empty feed, service unavailable, hidden detail recovery, and category or SKU conflict samples.',
  },
  {
    coordinationKey: 'customer-checkout',
    taskIds: ['T525'],
    surface: 'customer-mobile',
    mockFiles: ['frontend/src/mocks/cart/mocks.ts'],
    coveredFamilies: ['happy', 'empty', 'error', 'conflict'],
    notApplicableFamilies: ['unauthorized', 'forbidden'],
    notes:
      'Cart and checkout mocks cover empty cart, unavailable cart service, missing cart item, preview validation failure, and checkout blocking conflicts.',
  },
  {
    coordinationKey: 'customer-order-history',
    taskIds: ['T526'],
    surface: 'customer-mobile',
    mockFiles: [
      'frontend/src/mocks/orders/mocks.ts',
      'frontend/src/mocks/invoice-payments/mocks.ts',
    ],
    coveredFamilies: ['happy', 'empty', 'error'],
    notApplicableFamilies: ['unauthorized', 'forbidden', 'conflict'],
    notes:
      'Order-history coverage focuses on tracked orders, empty histories, overdue or cancelled invoice tracking, and runtime availability issues.',
  },
  {
    coordinationKey: 'staff-inventory-visibility',
    taskIds: ['T527'],
    surface: 'staff-admin-web',
    mockFiles: ['frontend/src/mocks/inventory/mocks.ts'],
    coveredFamilies: ['happy', 'error'],
    notApplicableFamilies: ['empty', 'unauthorized', 'forbidden', 'conflict'],
    notes:
      'Inventory visibility mocks cover live catalog-backed presentation plus service-unavailable runtime handling while planned stock routes remain contract-only.',
  },
  {
    coordinationKey: 'commerce-derived-sync',
    taskIds: ['T528'],
    surface: 'cross-surface',
    mockFiles: ['frontend/src/mocks/commerce-sync/mocks.ts'],
    coveredFamilies: ['happy', 'error'],
    notApplicableFamilies: ['empty', 'unauthorized', 'forbidden', 'conflict'],
    notes:
      'Derived-sync mocks focus on scenario-based state truth, such as pending-sync or stale-snapshot cases, rather than route-auth failures.',
  },
];

export const clientRegressionMockCoverageSummary = {
  totalRows: clientRegressionMockCoverageMatrix.length,
  familiesCoveredAcrossMatrix: clientRegressionRequiredMockFamilies.filter((family) =>
    clientRegressionMockCoverageMatrix.some((row) =>
      row.coveredFamilies.includes(family),
    ),
  ),
  rowsWithAllRequiredFamilies: clientRegressionMockCoverageMatrix
    .filter(
      (row) =>
        clientRegressionRequiredMockFamilies.every(
          (family) =>
            row.coveredFamilies.includes(family) ||
            row.notApplicableFamilies.includes(family),
        ),
    )
    .map((row) => row.coordinationKey),
} as const;
