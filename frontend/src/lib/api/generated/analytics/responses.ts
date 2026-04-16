export interface AnalyticsStatusCountResponse {
  status?: string;
  severity?: string;
  count: number;
}

export interface AnalyticsServiceDemandEntryResponse {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  lastBookedAt?: string;
  sourceBookingIds: string[];
}

export interface AnalyticsPeakHourEntryResponse {
  timeSlotId: string;
  label: string;
  startTime: string;
  endTime: string;
  bookingCount: number;
  averageFillPercent: number;
  sourceBookingIds: string[];
}

export interface DashboardAnalyticsResponse {
  refreshedAt: string;
  refreshJobId: string;
  totals: {
    totalBookings: number;
    activeBookings: number;
    finalizedServiceInvoices: number;
    insuranceOpenInquiries: number;
    openBackJobs: number;
  };
  sales: {
    finalizedInvoiceCount: number;
    bookingInvoiceCount: number;
    backJobInvoiceCount: number;
    latestInvoiceReference?: string | null;
  };
  insurance: {
    totalInquiries: number;
    openInquiries: number;
    needsDocuments: number;
    approvedForRecord: number;
    rejected: number;
  };
  serviceDemandPreview: AnalyticsServiceDemandEntryResponse[];
  peakHoursPreview: AnalyticsPeakHourEntryResponse[];
}

export interface OperationsAnalyticsResponse {
  refreshedAt: string;
  refreshJobId: string;
  bookingStatuses: AnalyticsStatusCountResponse[];
  jobOrderStatuses: AnalyticsStatusCountResponse[];
  peakHours: AnalyticsPeakHourEntryResponse[];
  serviceDemand: AnalyticsServiceDemandEntryResponse[];
  serviceAdviserLoad: Array<{
    serviceAdviserUserId: string;
    serviceAdviserCode: string;
    jobOrderCount: number;
    finalizedCount: number;
  }>;
}

export interface BackJobsAnalyticsResponse {
  refreshedAt: string;
  refreshJobId: string;
  totals: {
    totalBackJobs: number;
    openBackJobs: number;
    resolvedBackJobs: number;
    validatedFindings: number;
  };
  statuses: Array<Required<Pick<AnalyticsStatusCountResponse, 'status' | 'count'>>>;
  severities: Array<Required<Pick<AnalyticsStatusCountResponse, 'severity' | 'count'>>>;
  repeatSources: Array<{
    originalJobOrderId: string;
    backJobCount: number;
    unresolvedCount: number;
    sourceBackJobIds: string[];
  }>;
}

export interface LoyaltyAnalyticsResponse {
  refreshedAt: string;
  refreshJobId: string;
  totals: {
    accountCount: number;
    totalPointsBalance: number;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    redemptionCount: number;
  };
  transactionTypes: Array<{
    transactionType: string;
    count: number;
    netPointsDelta: number;
  }>;
  topRewards: Array<{
    rewardId: string;
    rewardName: string;
    rewardStatus: string;
    redemptionCount: number;
    sourceRedemptionIds: string[];
  }>;
}

export interface InvoiceAgingAnalyticsResponse {
  refreshedAt: string;
  refreshJobId: string;
  totals: {
    trackedInvoices: number;
    scheduledReminderRules: number;
    processedReminderRules: number;
    cancelledReminderRules: number;
  };
  agingBuckets: Array<{
    bucket: 'due_today_or_future' | 'overdue_1_7' | 'overdue_8_30' | 'overdue_31_plus';
    count: number;
  }>;
  trackedInvoicePolicies: Array<{
    invoiceId: string;
    latestReminderStatus: string;
    latestScheduledFor: string;
    reminderRuleIds: string[];
  }>;
}

export interface AuditTrailAnalyticsEntryResponse {
  auditType: 'staff_admin_action' | 'quality_gate_override' | 'release_decision';
  action: string;
  occurredAt: string;
  actorUserId: string | null;
  actorRole: string | null;
  reason: string | null;
  summary: string;
  sourceDomain: string;
  sourceId: string;
  targetEntityType: string;
  targetEntityId: string;
  relatedEntityIds: string[];
}

export interface AuditTrailAnalyticsResponse {
  refreshedAt: string;
  refreshJobId: string;
  totals: {
    totalSensitiveActions: number;
    staffAdminActions: number;
    qualityGateOverrides: number;
    releaseDecisions: number;
  };
  entries: AuditTrailAnalyticsEntryResponse[];
}
