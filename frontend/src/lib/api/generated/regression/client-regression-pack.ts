import { staffPortalSessionRoutes } from '../auth/staff-web-session';
import { authRoutes } from '../auth/requests';
import { usersRoutes } from '../users/requests';
import { vehiclesRoutes } from '../vehicles/requests';
import { bookingsRoutes } from '../bookings/requests';
import { inspectionsRoutes } from '../inspections/requests';
import { vehicleLifecycleRoutes } from '../vehicle-lifecycle/requests';
import { insuranceRoutes } from '../insurance/requests';
import { staffInsuranceQueueRoute } from '../insurance/staff-web-insurance';
import { notificationRoutes } from '../notifications/requests';
import { customerNotificationReadStateApiGap } from '../notifications/customer-mobile-notifications';
import { backJobsRoutes } from '../back-jobs/requests';
import { jobOrdersRoutes } from '../job-orders/requests';
import { qualityGateRoutes } from '../quality-gates/requests';
import { analyticsRoutes } from '../analytics/requests';
import { analyticsFutureApiGaps } from '../analytics/staff-web-dashboard';
import { customerChatbotRoutes } from '../chatbot/customer-mobile-support';
import { catalogRoutes } from '../catalog/requests';
import { staffInventoryKnownApiGaps, staffInventoryRoutes } from '../inventory/staff-web-inventory';
import { customerMobileCheckoutRoutes } from '../cart/customer-mobile-checkout';
import { ordersRoutes } from '../orders/requests';
import { customerMobileOrderHistoryRoutes } from '../orders/customer-mobile-order-history';
import { invoicePaymentRoutes } from '../invoice-payments/requests';
import { loyaltyRoutes } from '../loyalty/requests';
import type {
  ContractRouteSource,
  ContractRouteStatus,
  RouteContract,
} from '../shared';

export type ClientRegressionSurface =
  | 'customer-mobile'
  | 'staff-admin-web'
  | 'cross-surface';

export type RouteRegressionEvidence =
  | 'typed_swagger_baseline'
  | 'planned_task_only';

export type RouteRegressionState = 'aligned_live' | 'planned_gap';

export type MockCoverageFamily =
  | 'happy'
  | 'empty'
  | 'error'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict';

export interface ClientRegressionTraceabilityRow {
  coordinationKey: string;
  taskIds: readonly string[];
  title: string;
  surface: ClientRegressionSurface;
  contractPacks: readonly string[];
  taskFiles: readonly string[];
  domainDocs: readonly string[];
  typedContractFiles: readonly string[];
  mockFiles: readonly string[];
  routeContracts: readonly RouteContract[];
  knownApiGaps: readonly string[];
  notes: string;
}

export interface ClientRegressionRouteDriftRow {
  coordinationKey: string;
  taskIds: readonly string[];
  surface: ClientRegressionSurface;
  typedContractFiles: readonly string[];
  method: RouteContract['method'];
  path: string;
  status: ContractRouteStatus;
  source: ContractRouteSource;
  evidence: RouteRegressionEvidence;
  driftState: RouteRegressionState;
  notes: string;
}

export interface ClientRegressionChecklistItem {
  check: string;
  expected: string;
  owner: 'swagger' | 'task' | 'typed-contract' | 'mocks' | 'manual-follow-up';
  required: true;
}

export const clientRegressionRuntimeObservation = {
  observedOn: '2026-04-22',
  swaggerUrl: 'http://127.0.0.1:3000/docs-json',
  swaggerReachability: 'unreachable',
  fallbackPolicy:
    "Use checked-in typed RouteContract entries marked with source 'swagger' as the current OpenAPI baseline until the local backend is running again.",
} as const;

export const clientRegressionTraceabilityMatrix: ClientRegressionTraceabilityRow[] = [
  {
    coordinationKey: 'bookings-cluster',
    taskIds: ['T501', 'T502', 'T503', 'T504', 'T505', 'T506', 'T531'],
    title: 'Booking cross-surface cluster',
    surface: 'cross-surface',
    contractPacks: [
      'docs/contracts/T105-bookings-operations-and-queue.md',
      'docs/contracts/T531-customer-booking-availability-calendar-mobile-flow.md',
    ],
    taskFiles: [
      'docs/architecture/tasks/05-client-integration/T501-booking-cross-surface-contract-foundation.md',
      'docs/architecture/tasks/05-client-integration/T502-customer-booking-discovery-mobile-flow.md',
      'docs/architecture/tasks/05-client-integration/T503-customer-booking-create-and-history-mobile-flow.md',
      'docs/architecture/tasks/05-client-integration/T504-staff-booking-schedule-and-queue-web-flow.md',
      'docs/architecture/tasks/05-client-integration/T505-staff-booking-decision-actions-web-flow.md',
      'docs/architecture/tasks/05-client-integration/T506-booking-status-sync-reminders-and-cross-surface-acceptance.md',
      'docs/architecture/tasks/05-client-integration/T531-customer-booking-availability-calendar-mobile-flow.md',
    ],
    domainDocs: [
      'docs/architecture/domains/main-service/bookings.md',
      'docs/architecture/domains/main-service/notifications.md',
    ],
    typedContractFiles: [
      'frontend/src/lib/api/generated/bookings/requests.ts',
      'frontend/src/lib/api/generated/bookings/responses.ts',
      'frontend/src/lib/api/generated/bookings/discovery.ts',
      'frontend/src/lib/api/generated/bookings/customer-flow.ts',
      'frontend/src/lib/api/generated/bookings/errors.ts',
      'frontend/src/lib/api/generated/bookings/surface-states.ts',
      'frontend/src/lib/api/generated/bookings/staff-flow.ts',
      'frontend/src/lib/api/generated/bookings/staff-actions.ts',
      'frontend/src/lib/api/generated/bookings/status-sync.ts',
    ],
    mockFiles: ['frontend/src/mocks/bookings/mocks.ts'],
    routeContracts: Object.values(bookingsRoutes),
    knownApiGaps: [],
    notes:
      'Covers booking discovery, live availability windows, create, history, staff schedule, queue, status updates, and reminder-sync acceptance.',
  },
  {
    coordinationKey: 'auth-identity-guardrails',
    taskIds: ['T507', 'T508', 'T509', 'T529'],
    title: 'Auth identity, activation, session, and guardrail cluster',
    surface: 'cross-surface',
    contractPacks: [
      'docs/contracts/T507-auth-users-cross-surface-identity-foundation.md',
      'docs/contracts/T508-customer-google-email-activation-mobile-flow.md',
      'docs/contracts/T509-staff-auth-session-and-role-gating-web-flow.md',
      'docs/contracts/T529-client-rbac-navigation-and-surface-guardrails.md',
    ],
    taskFiles: [
      'docs/architecture/tasks/05-client-integration/T507-auth-users-cross-surface-identity-foundation.md',
      'docs/architecture/tasks/05-client-integration/T508-customer-google-email-activation-mobile-flow.md',
      'docs/architecture/tasks/05-client-integration/T509-staff-auth-session-and-role-gating-web-flow.md',
      'docs/architecture/tasks/05-client-integration/T529-client-rbac-navigation-and-surface-guardrails.md',
    ],
    domainDocs: [
      'docs/architecture/domains/main-service/auth.md',
      'docs/architecture/domains/main-service/users.md',
      'docs/architecture/rbac-policy.md',
    ],
    typedContractFiles: [
      'frontend/src/lib/api/generated/auth/requests.ts',
      'frontend/src/lib/api/generated/auth/responses.ts',
      'frontend/src/lib/api/generated/auth/identity-foundation.ts',
      'frontend/src/lib/api/generated/auth/customer-google-activation.ts',
      'frontend/src/lib/api/generated/auth/staff-web-session.ts',
      'frontend/src/lib/api/generated/auth/client-surface-guardrails.ts',
      'frontend/src/lib/api/generated/users/requests.ts',
    ],
    mockFiles: ['frontend/src/mocks/auth/mocks.ts'],
    routeContracts: [
      ...Object.values(authRoutes),
      ...staffPortalSessionRoutes,
      ...Object.values(usersRoutes),
    ],
    knownApiGaps: [
      'GET /api/auth/me currently returns a minimal identity projection, so richer client session state must merge restore-time auth identity with previously normalized session data.',
    ],
    notes:
      'Tracks the shared auth backbone used by customer-mobile and staff-admin-web plus the final client surface guardrails.',
  },
  {
    coordinationKey: 'customer-profile-address',
    taskIds: ['T510'],
    title: 'Customer profile, address, and account states',
    surface: 'customer-mobile',
    contractPacks: ['docs/contracts/T510-customer-profile-address-and-account-states-mobile-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T510-customer-profile-address-and-account-states-mobile-flow.md'],
    domainDocs: ['docs/architecture/domains/main-service/users.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/users/customer-mobile-profile.ts',
      'frontend/src/lib/api/generated/users/requests.ts',
      'frontend/src/lib/api/generated/users/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/users/mocks.ts'],
    routeContracts: Object.values(usersRoutes),
    knownApiGaps: [],
    notes:
      'Covers profile completeness, address-default behavior, deactivated-account handling, and customer-owned profile mutations.',
  },
  {
    coordinationKey: 'customer-vehicles',
    taskIds: ['T511'],
    title: 'Customer vehicle onboarding and management',
    surface: 'customer-mobile',
    contractPacks: ['docs/contracts/T511-customer-vehicle-onboarding-and-management-mobile-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T511-customer-vehicle-onboarding-and-management-mobile-flow.md'],
    domainDocs: ['docs/architecture/domains/main-service/vehicles.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/vehicles/customer-mobile-vehicles.ts',
      'frontend/src/lib/api/generated/vehicles/requests.ts',
      'frontend/src/lib/api/generated/vehicles/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/vehicles/mocks.ts'],
    routeContracts: Object.values(vehiclesRoutes),
    knownApiGaps: [],
    notes:
      'Covers first-vehicle onboarding, owned vehicle management, customer display labeling, and ownership-safe errors.',
  },
  {
    coordinationKey: 'staff-inspections',
    taskIds: ['T512'],
    title: 'Inspection capture and verification',
    surface: 'staff-admin-web',
    contractPacks: ['docs/contracts/T512-inspection-capture-and-verification-web-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T512-inspection-capture-and-verification-web-flow.md'],
    domainDocs: ['docs/architecture/domains/main-service/inspections.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/inspections/staff-web-inspections.ts',
      'frontend/src/lib/api/generated/inspections/requests.ts',
      'frontend/src/lib/api/generated/inspections/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/inspections/mocks.ts'],
    routeContracts: Object.values(inspectionsRoutes),
    knownApiGaps: [],
    notes:
      'Covers staff capture, read history, verified findings, and inspection-related validation conflicts.',
  },
  {
    coordinationKey: 'vehicle-lifecycle',
    taskIds: ['T513'],
    title: 'Vehicle timeline and reviewed summary',
    surface: 'customer-mobile',
    contractPacks: ['docs/contracts/T115-vehicle-lifecycle-ai-summary-review.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T513-vehicle-timeline-and-reviewed-summary-mobile-flow.md'],
    domainDocs: ['docs/architecture/domains/main-service/vehicle-lifecycle.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/vehicle-lifecycle/customer-mobile-lifecycle.ts',
      'frontend/src/lib/api/generated/vehicle-lifecycle/requests.ts',
      'frontend/src/lib/api/generated/vehicle-lifecycle/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/vehicle-lifecycle/mocks.ts'],
    routeContracts: Object.values(vehicleLifecycleRoutes),
    knownApiGaps: [],
    notes:
      'Covers customer-safe timeline visibility, reviewed summaries, and the review-gated lifecycle summary flow.',
  },
  {
    coordinationKey: 'insurance-cluster',
    taskIds: ['T514', 'T515'],
    title: 'Insurance customer intake and staff review',
    surface: 'cross-surface',
    contractPacks: ['docs/contracts/T110-insurance-inquiry-core.md'],
    taskFiles: [
      'docs/architecture/tasks/05-client-integration/T514-insurance-customer-intake-mobile-flow.md',
      'docs/architecture/tasks/05-client-integration/T515-insurance-review-and-status-web-flow.md',
    ],
    domainDocs: ['docs/architecture/domains/main-service/insurance.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/insurance/customer-mobile-insurance.ts',
      'frontend/src/lib/api/generated/insurance/staff-web-insurance.ts',
      'frontend/src/lib/api/generated/insurance/requests.ts',
      'frontend/src/lib/api/generated/insurance/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/insurance/mocks.ts'],
    routeContracts: [...Object.values(insuranceRoutes), staffInsuranceQueueRoute],
    knownApiGaps: [
      'GET /api/insurance/review-queue remains task-planned and mock-backed until a real staff review-list endpoint exists.',
    ],
    notes:
      'Covers customer inquiry intake, staff detail review, status transitions, and the planned web review-queue read model.',
  },
  {
    coordinationKey: 'notifications-reminders',
    taskIds: ['T520'],
    title: 'Notification preferences, delivery states, and reminders',
    surface: 'customer-mobile',
    contractPacks: ['docs/contracts/T520-notification-preferences-delivery-states-and-reminder-sync.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T520-notification-preferences-delivery-states-and-reminder-sync.md'],
    domainDocs: ['docs/architecture/domains/main-service/notifications.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/notifications/customer-mobile-notifications.ts',
      'frontend/src/lib/api/generated/notifications/requests.ts',
      'frontend/src/lib/api/generated/notifications/responses.ts',
      'frontend/src/lib/api/generated/notifications/triggers.ts',
    ],
    mockFiles: ['frontend/src/mocks/notifications/mocks.ts'],
    routeContracts: Object.values(notificationRoutes),
    knownApiGaps: [
      customerNotificationReadStateApiGap.swaggerEvidence,
      customerNotificationReadStateApiGap.clientPolicy,
    ],
    notes:
      'Covers notification feed, preference updates, delivery-state presentation, and reminder-trigger alignment without inventing read/unread routes.',
  },
  {
    coordinationKey: 'customer-loyalty',
    taskIds: ['T521'],
    title: 'Customer loyalty balance, history, rewards, and redemption',
    surface: 'customer-mobile',
    contractPacks: ['docs/contracts/T521-loyalty-balance-history-rewards-and-redemption-mobile-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T521-loyalty-balance-history-rewards-and-redemption-mobile-flow.md'],
    domainDocs: ['docs/architecture/domains/main-service/loyalty.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/loyalty/customer-mobile-loyalty.ts',
      'frontend/src/lib/api/generated/loyalty/requests.ts',
      'frontend/src/lib/api/generated/loyalty/responses.ts',
      'frontend/src/lib/api/generated/loyalty/errors.ts',
    ],
    mockFiles: ['frontend/src/mocks/loyalty/mocks.ts'],
    routeContracts: [
      loyaltyRoutes.getLoyaltyAccount,
      loyaltyRoutes.getLoyaltyTransactions,
      loyaltyRoutes.listLoyaltyRewards,
      loyaltyRoutes.createLoyaltyRedemption,
    ],
    knownApiGaps: [],
    notes:
      'Covers live customer loyalty balance, ledger history, reward availability, redemption outcomes, and explicit legacy-drift handling for older source types.',
  },
  {
    coordinationKey: 'job-order-workbench',
    taskIds: ['T517'],
    title: 'Job-order progress, photos, finalization, and invoice payment handoff',
    surface: 'staff-admin-web',
    contractPacks: ['docs/contracts/T517-job-order-progress-photos-and-finalization-web-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T517-job-order-progress-photos-and-finalization-web-flow.md'],
    domainDocs: ['docs/architecture/domains/main-service/job-orders.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/job-orders/staff-web-execution.ts',
      'frontend/src/lib/api/generated/job-orders/staff-web-workbench.ts',
      'frontend/src/lib/api/generated/job-orders/requests.ts',
      'frontend/src/lib/api/generated/job-orders/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/job-orders/mocks.ts'],
    routeContracts: [
      jobOrdersRoutes.getJobOrderById,
      jobOrdersRoutes.addJobOrderProgress,
      jobOrdersRoutes.addJobOrderPhoto,
      jobOrdersRoutes.finalizeJobOrder,
      jobOrdersRoutes.recordInvoicePayment,
    ],
    knownApiGaps: [],
    notes:
      'Covers live staff workbench execution, photo evidence, finalization, and recorded payment visibility for service invoices.',
  },
  {
    coordinationKey: 'quality-gates',
    taskIds: ['T518'],
    title: 'Quality gates review, release block, and override',
    surface: 'staff-admin-web',
    contractPacks: ['docs/contracts/T518-quality-gates-review-release-and-override-web-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T518-quality-gates-review-release-and-override-web-flow.md'],
    domainDocs: ['docs/architecture/domains/main-service/quality-gates.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/quality-gates/staff-web-qa-review.ts',
      'frontend/src/lib/api/generated/quality-gates/requests.ts',
      'frontend/src/lib/api/generated/quality-gates/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/quality-gates/mocks.ts'],
    routeContracts: Object.values(qualityGateRoutes),
    knownApiGaps: [],
    notes:
      'Covers QA read, release-block reasoning, and super-admin override behavior before customer release proceeds.',
  },
  {
    coordinationKey: 'back-jobs',
    taskIds: ['T519'],
    title: 'Back-jobs review and rework',
    surface: 'staff-admin-web',
    contractPacks: ['docs/contracts/T519-back-jobs-review-and-rework-web-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T519-back-jobs-review-and-rework-web-flow.md'],
    domainDocs: ['docs/architecture/domains/main-service/back-jobs.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/back-jobs/staff-web-back-jobs.ts',
      'frontend/src/lib/api/generated/back-jobs/requests.ts',
      'frontend/src/lib/api/generated/back-jobs/responses.ts',
      'frontend/src/lib/api/generated/job-orders/requests.ts',
    ],
    mockFiles: ['frontend/src/mocks/back-jobs/mocks.ts'],
    routeContracts: [
      ...Object.values(backJobsRoutes),
      jobOrdersRoutes.createJobOrder,
    ],
    knownApiGaps: [],
    notes:
      'Covers staff back-job create and review plus linked rework job-order creation with sourceType back_job.',
  },
  {
    coordinationKey: 'customer-support-chatbot',
    taskIds: ['T522'],
    title: 'FAQ chatbot and escalation support',
    surface: 'customer-mobile',
    contractPacks: [
      'docs/contracts/T114-faq-chatbot-v1.md',
      'docs/contracts/T522-faq-chatbot-customer-support-mobile-flow.md',
    ],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T522-faq-chatbot-customer-support-mobile-flow.md'],
    domainDocs: ['docs/architecture/domains/main-service/chatbot.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/chatbot/customer-mobile-support.ts',
      'frontend/src/lib/api/generated/chatbot/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/chatbot/mocks.ts'],
    routeContracts: Object.values(customerChatbotRoutes),
    knownApiGaps: [],
    notes:
      'Covers deterministic FAQ answers, lookup-driven status replies, and customer-safe escalation creation.',
  },
  {
    coordinationKey: 'admin-analytics',
    taskIds: ['T523'],
    title: 'Admin analytics dashboard',
    surface: 'staff-admin-web',
    contractPacks: [
      'docs/contracts/T113-admin-dashboard-analytics-v1.md',
      'docs/contracts/T523-admin-analytics-dashboard-web-flow.md',
    ],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T523-admin-analytics-dashboard-web-flow.md'],
    domainDocs: ['docs/architecture/domains/main-service/analytics.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/analytics/staff-web-dashboard.ts',
      'frontend/src/lib/api/generated/analytics/requests.ts',
      'frontend/src/lib/api/generated/analytics/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/analytics/mocks.ts'],
    routeContracts: Object.values(analyticsRoutes),
    knownApiGaps: [...analyticsFutureApiGaps],
    notes:
      'Covers read-only analytics snapshots across operations, back-jobs, loyalty, invoice aging, and audit trail.',
  },
  {
    coordinationKey: 'customer-catalog',
    taskIds: ['T524'],
    title: 'Catalog and product discovery',
    surface: 'customer-mobile',
    contractPacks: ['docs/contracts/T524-catalog-and-product-discovery-mobile-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T524-catalog-and-product-discovery-mobile-flow.md'],
    domainDocs: ['docs/architecture/domains/ecommerce/catalog.md'],
    typedContractFiles: [
      'frontend/src/lib/api/generated/catalog/customer-mobile-catalog.ts',
      'frontend/src/lib/api/generated/catalog/requests.ts',
      'frontend/src/lib/api/generated/catalog/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/catalog/mocks.ts'],
    routeContracts: [
      catalogRoutes.listProducts,
      catalogRoutes.getProductById,
      catalogRoutes.listCategories,
    ],
    knownApiGaps: [],
    notes:
      'Covers customer-visible catalog discovery, product-detail refresh, empty feed, and hidden-product recovery states.',
  },
  {
    coordinationKey: 'customer-checkout',
    taskIds: ['T525'],
    title: 'Cart and invoice checkout',
    surface: 'customer-mobile',
    contractPacks: ['docs/contracts/T525-cart-and-invoice-checkout-mobile-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T525-cart-and-invoice-checkout-mobile-flow.md'],
    domainDocs: [
      'docs/architecture/domains/ecommerce/cart.md',
      'docs/architecture/domains/ecommerce/orders.md',
      'docs/architecture/domains/ecommerce/invoice-payments.md',
    ],
    typedContractFiles: [
      'frontend/src/lib/api/generated/cart/customer-mobile-checkout.ts',
      'frontend/src/lib/api/generated/cart/requests.ts',
      'frontend/src/lib/api/generated/cart/responses.ts',
      'frontend/src/lib/api/generated/orders/requests.ts',
      'frontend/src/lib/api/generated/orders/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/cart/mocks.ts'],
    routeContracts: Object.values(customerMobileCheckoutRoutes),
    knownApiGaps: [],
    notes:
      'Covers cart reads and mutations, immutable checkout preview, billing-address validation, and invoice-backed order creation.',
  },
  {
    coordinationKey: 'customer-order-history',
    taskIds: ['T526'],
    title: 'Order history and invoice tracking',
    surface: 'customer-mobile',
    contractPacks: ['docs/contracts/T526-order-history-and-invoice-tracking-mobile-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T526-order-history-and-invoice-tracking-mobile-flow.md'],
    domainDocs: [
      'docs/architecture/domains/ecommerce/orders.md',
      'docs/architecture/domains/ecommerce/invoice-payments.md',
    ],
    typedContractFiles: [
      'frontend/src/lib/api/generated/orders/customer-mobile-order-history.ts',
      'frontend/src/lib/api/generated/orders/requests.ts',
      'frontend/src/lib/api/generated/orders/responses.ts',
      'frontend/src/lib/api/generated/invoice-payments/requests.ts',
      'frontend/src/lib/api/generated/invoice-payments/responses.ts',
    ],
    mockFiles: [
      'frontend/src/mocks/orders/mocks.ts',
      'frontend/src/mocks/invoice-payments/mocks.ts',
    ],
    routeContracts: Object.values(customerMobileOrderHistoryRoutes),
    knownApiGaps: [],
    notes:
      'Covers customer order history, immutable order detail, and invoice-aging tracking for invoice-backed ecommerce orders.',
  },
  {
    coordinationKey: 'staff-inventory-visibility',
    taskIds: ['T527'],
    title: 'Inventory and stock visibility',
    surface: 'staff-admin-web',
    contractPacks: ['docs/contracts/T527-inventory-and-stock-visibility-web-flow.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T527-inventory-and-stock-visibility-web-flow.md'],
    domainDocs: [
      'docs/architecture/domains/ecommerce/catalog.md',
      'docs/architecture/domains/ecommerce/inventory.md',
    ],
    typedContractFiles: [
      'frontend/src/lib/api/generated/inventory/staff-web-inventory.ts',
      'frontend/src/lib/api/generated/catalog/requests.ts',
      'frontend/src/lib/api/generated/catalog/responses.ts',
    ],
    mockFiles: ['frontend/src/mocks/inventory/mocks.ts'],
    routeContracts: Object.values(staffInventoryRoutes),
    knownApiGaps: [...staffInventoryKnownApiGaps],
    notes:
      'Tracks live catalog-backed inventory visibility and the explicit planned-gap routes for quantity detail and adjustments.',
  },
  {
    coordinationKey: 'commerce-derived-sync',
    taskIds: ['T528'],
    title: 'Commerce and main-service derived state sync',
    surface: 'cross-surface',
    contractPacks: ['docs/contracts/T528-commerce-and-main-service-derived-state-sync.md'],
    taskFiles: ['docs/architecture/tasks/05-client-integration/T528-commerce-and-main-service-derived-state-sync.md'],
    domainDocs: [
      'docs/architecture/domains/ecommerce/orders.md',
      'docs/architecture/domains/ecommerce/invoice-payments.md',
      'docs/architecture/domains/main-service/notifications.md',
      'docs/architecture/domains/main-service/loyalty.md',
    ],
    typedContractFiles: [
      'frontend/src/lib/api/generated/commerce-sync/customer-derived-state-sync.ts',
      'frontend/src/lib/api/generated/notifications/requests.ts',
      'frontend/src/lib/api/generated/orders/requests.ts',
      'frontend/src/lib/api/generated/invoice-payments/requests.ts',
      'frontend/src/lib/api/generated/loyalty/requests.ts',
    ],
    mockFiles: ['frontend/src/mocks/commerce-sync/mocks.ts'],
    routeContracts: [
      notificationRoutes.listNotifications,
      notificationRoutes.getNotificationPreferences,
      notificationRoutes.updateNotificationPreferences,
      loyaltyRoutes.getLoyaltyAccount,
      loyaltyRoutes.getLoyaltyTransactions,
      ordersRoutes.listOrdersByUserId,
      ordersRoutes.getOrderById,
      invoicePaymentRoutes.getOrderInvoice,
    ],
    knownApiGaps: [],
    notes:
      'Tracks the distinction between owner-route truth and lagging derived read models across notifications, loyalty, and ecommerce surfaces.',
  },
];

export const clientRegressionRouteDriftMatrix: ClientRegressionRouteDriftRow[] =
  clientRegressionTraceabilityMatrix.flatMap((traceabilityRow) =>
    traceabilityRow.routeContracts.map((route) => ({
      coordinationKey: traceabilityRow.coordinationKey,
      taskIds: traceabilityRow.taskIds,
      surface: traceabilityRow.surface,
      typedContractFiles: traceabilityRow.typedContractFiles,
      method: route.method,
      path: route.path,
      status: route.status,
      source: route.source,
      evidence:
        route.source === 'swagger'
          ? 'typed_swagger_baseline'
          : 'planned_task_only',
      driftState: route.status === 'live' ? 'aligned_live' : 'planned_gap',
      notes: route.notes ?? traceabilityRow.notes,
    })),
  );

export const clientRegressionChecklist: ClientRegressionChecklistItem[] = [
  {
    check: 'Every completed client slice maps to at least one task file, contract pack, typed contract file, and mock file.',
    expected:
      'Traceability stays explicit even when a newer client task reuses an earlier domain-level contract pack.',
    owner: 'task',
    required: true,
  },
  {
    check: 'Each route row is labeled live or planned from one machine-readable source.',
    expected:
      "Live routes stay anchored to typed RouteContract entries marked source 'swagger', while planned gaps stay anchored to task-only contract rows.",
    owner: 'typed-contract',
    required: true,
  },
  {
    check: 'OpenAPI drift is surfaced instead of hidden.',
    expected:
      'When live Swagger is unreachable, the pack records that fact and falls back to checked-in typed swagger-baseline contracts rather than inventing runtime confirmation.',
    owner: 'swagger',
    required: true,
  },
  {
    check: 'Mock coverage includes the state families needed by the completed client queue.',
    expected:
      'Happy, empty, error, unauthorized, forbidden, and conflict states remain visible in the coverage registry, with non-applicable families called out plainly.',
    owner: 'mocks',
    required: true,
  },
  {
    check: 'Planned gaps remain documented without becoming live client behavior.',
    expected:
      'Inventory quantity routes, staff insurance review queue, and notification read-state persistence remain labeled as planned or gap-only until real endpoints ship.',
    owner: 'manual-follow-up',
    required: true,
  },
];

export const clientRegressionRouteSummary = {
  totalRows: clientRegressionRouteDriftMatrix.length,
  liveRows: clientRegressionRouteDriftMatrix.filter(
    (row) => row.status === 'live',
  ).length,
  plannedRows: clientRegressionRouteDriftMatrix.filter(
    (row) => row.status === 'planned',
  ).length,
  uniqueTaskIds: Array.from(
    new Set(
      clientRegressionTraceabilityMatrix.flatMap((row) => row.taskIds),
    ),
  ),
} as const;
