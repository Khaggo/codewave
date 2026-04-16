import type {
  AuditTrailAnalyticsResponse,
  BackJobsAnalyticsResponse,
  DashboardAnalyticsResponse,
  InvoiceAgingAnalyticsResponse,
  LoyaltyAnalyticsResponse,
  OperationsAnalyticsResponse,
} from '../../lib/api/generated/analytics/responses';

export const dashboardAnalyticsMock: DashboardAnalyticsResponse = {
  refreshedAt: '2026-07-14T11:30:00.000Z',
  refreshJobId: 'analytics-refresh-job-1',
  totals: {
    totalBookings: 14,
    activeBookings: 6,
    finalizedServiceInvoices: 9,
    insuranceOpenInquiries: 3,
    openBackJobs: 2,
  },
  sales: {
    finalizedInvoiceCount: 9,
    bookingInvoiceCount: 7,
    backJobInvoiceCount: 2,
    latestInvoiceReference: 'INV-20260714-009',
  },
  insurance: {
    totalInquiries: 5,
    openInquiries: 3,
    needsDocuments: 1,
    approvedForRecord: 1,
    rejected: 1,
  },
  serviceDemandPreview: [
    {
      serviceId: 'service-1',
      serviceName: 'Oil Change',
      bookingCount: 6,
      sourceBookingIds: ['booking-1', 'booking-4', 'booking-6'],
    },
    {
      serviceId: 'service-2',
      serviceName: 'Brake Inspection',
      bookingCount: 4,
      sourceBookingIds: ['booking-2', 'booking-5'],
    },
  ],
  peakHoursPreview: [
    {
      timeSlotId: 'slot-1',
      label: 'Morning Slot',
      startTime: '09:00',
      endTime: '10:00',
      bookingCount: 5,
      averageFillPercent: 83.33,
      sourceBookingIds: ['booking-1', 'booking-3', 'booking-7'],
    },
  ],
};

export const operationsAnalyticsMock: OperationsAnalyticsResponse = {
  refreshedAt: '2026-07-14T11:30:00.000Z',
  refreshJobId: 'analytics-refresh-job-1',
  bookingStatuses: [
    { status: 'confirmed', count: 5 },
    { status: 'pending', count: 3 },
    { status: 'completed', count: 6 },
  ],
  jobOrderStatuses: [
    { status: 'finalized', count: 4 },
    { status: 'ready_for_qa', count: 1 },
  ],
  peakHours: [
    {
      timeSlotId: 'slot-1',
      label: 'Morning Slot',
      startTime: '09:00',
      endTime: '10:00',
      bookingCount: 5,
      averageFillPercent: 83.33,
      sourceBookingIds: ['booking-1', 'booking-3', 'booking-7'],
    },
  ],
  serviceDemand: [
    {
      serviceId: 'service-1',
      serviceName: 'Oil Change',
      bookingCount: 6,
      lastBookedAt: '2026-07-14T10:30:00.000Z',
      sourceBookingIds: ['booking-1', 'booking-4', 'booking-6'],
    },
  ],
  serviceAdviserLoad: [
    {
      serviceAdviserUserId: 'service-adviser-1',
      serviceAdviserCode: 'SA-7001',
      jobOrderCount: 4,
      finalizedCount: 3,
    },
  ],
};

export const backJobsAnalyticsMock: BackJobsAnalyticsResponse = {
  refreshedAt: '2026-07-14T11:30:00.000Z',
  refreshJobId: 'analytics-refresh-job-1',
  totals: {
    totalBackJobs: 3,
    openBackJobs: 2,
    resolvedBackJobs: 1,
    validatedFindings: 2,
  },
  statuses: [
    { status: 'reported', count: 1 },
    { status: 'in_progress', count: 1 },
    { status: 'resolved', count: 1 },
  ],
  severities: [
    { severity: 'high', count: 2 },
    { severity: 'medium', count: 1 },
  ],
  repeatSources: [
    {
      originalJobOrderId: 'job-order-1',
      backJobCount: 2,
      unresolvedCount: 1,
      sourceBackJobIds: ['back-job-1', 'back-job-3'],
    },
  ],
};

export const loyaltyAnalyticsMock: LoyaltyAnalyticsResponse = {
  refreshedAt: '2026-07-14T11:30:00.000Z',
  refreshJobId: 'analytics-refresh-job-1',
  totals: {
    accountCount: 8,
    totalPointsBalance: 720,
    totalPointsEarned: 1350,
    totalPointsRedeemed: 630,
    redemptionCount: 5,
  },
  transactionTypes: [
    {
      transactionType: 'accrual',
      count: 18,
      netPointsDelta: 1350,
    },
    {
      transactionType: 'redemption',
      count: 5,
      netPointsDelta: -630,
    },
  ],
  topRewards: [
    {
      rewardId: 'reward-1',
      rewardName: 'Free car wash',
      rewardStatus: 'active',
      redemptionCount: 3,
      sourceRedemptionIds: ['redemption-1', 'redemption-3', 'redemption-5'],
    },
  ],
};

export const invoiceAgingAnalyticsMock: InvoiceAgingAnalyticsResponse = {
  refreshedAt: '2026-07-14T11:30:00.000Z',
  refreshJobId: 'analytics-refresh-job-1',
  totals: {
    trackedInvoices: 3,
    scheduledReminderRules: 2,
    processedReminderRules: 1,
    cancelledReminderRules: 0,
  },
  agingBuckets: [
    {
      bucket: 'overdue_1_7',
      count: 1,
    },
    {
      bucket: 'overdue_8_30',
      count: 1,
    },
    {
      bucket: 'overdue_31_plus',
      count: 1,
    },
    {
      bucket: 'due_today_or_future',
      count: 0,
    },
  ],
  trackedInvoicePolicies: [
    {
      invoiceId: 'invoice-aging-1',
      latestReminderStatus: 'scheduled',
      latestScheduledFor: '2026-07-01T09:00:00.000Z',
      reminderRuleIds: ['rule-1'],
    },
  ],
};

export const auditTrailAnalyticsMock: AuditTrailAnalyticsResponse = {
  refreshedAt: '2026-07-16T08:45:00.000Z',
  refreshJobId: 'analytics-refresh-job-2',
  totals: {
    totalSensitiveActions: 3,
    staffAdminActions: 1,
    qualityGateOverrides: 1,
    releaseDecisions: 1,
  },
  entries: [
    {
      auditType: 'staff_admin_action',
      action: 'staff_account_provisioned',
      occurredAt: '2026-07-16T08:15:00.000Z',
      actorUserId: 'super-admin-1',
      actorRole: 'super_admin',
      reason: null,
      summary: 'Super admin provisioned service_adviser staff account SA-7110.',
      sourceDomain: 'main-service.auth',
      sourceId: 'staff-admin-audit-1',
      targetEntityType: 'user',
      targetEntityId: 'staff-user-1',
      relatedEntityIds: ['staff-user-1'],
    },
    {
      auditType: 'quality_gate_override',
      action: 'quality_gate_overridden',
      occurredAt: '2026-07-16T08:30:00.000Z',
      actorUserId: 'super-admin-1',
      actorRole: 'super_admin',
      reason: 'Supervisor approved release after documenting the brake-line exception.',
      summary: 'Super admin overrode blocked QA for job order job-order-17.',
      sourceDomain: 'main-service.quality-gates',
      sourceId: 'override-17',
      targetEntityType: 'quality_gate',
      targetEntityId: 'quality-gate-17',
      relatedEntityIds: ['job-order-17'],
    },
    {
      auditType: 'release_decision',
      action: 'service_invoice_finalized',
      occurredAt: '2026-07-16T08:40:00.000Z',
      actorUserId: 'service-adviser-1',
      actorRole: null,
      reason: 'Invoice-ready release after documented QA override.',
      summary: 'Service release was finalized for job order job-order-17 as invoice INV-20260716-017.',
      sourceDomain: 'main-service.job-orders',
      sourceId: 'invoice-record-17',
      targetEntityType: 'job_order',
      targetEntityId: 'job-order-17',
      relatedEntityIds: ['invoice-record-17'],
    },
  ],
};
