import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { AuthRepository } from '@main-modules/auth/repositories/auth.repository';
import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InsuranceRepository } from '@main-modules/insurance/repositories/insurance.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { LoyaltyRepository } from '@main-modules/loyalty/repositories/loyalty.repository';
import { NotificationsRepository } from '@main-modules/notifications/repositories/notifications.repository';
import { QualityGatesRepository } from '@main-modules/quality-gates/repositories/quality-gates.repository';
import { UsersService } from '@main-modules/users/services/users.service';

import { AnalyticsRepository } from '../repositories/analytics.repository';
import { analyticsSnapshotTypeEnum, AnalyticsSnapshotPayload, AnalyticsSourceCounts } from '../schemas/analytics.schema';

type AnalyticsActor = {
  userId: string;
  role: string;
};

type SnapshotType = (typeof analyticsSnapshotTypeEnum.enumValues)[number];

type AnalyticsSourceState = {
  bookings: Awaited<ReturnType<BookingsRepository['listForAnalytics']>>;
  jobOrders: Awaited<ReturnType<JobOrdersRepository['listForAnalytics']>>;
  insuranceInquiries: Awaited<ReturnType<InsuranceRepository['listForAnalytics']>>;
  backJobs: Awaited<ReturnType<BackJobsRepository['listForAnalytics']>>;
  loyaltyAccounts: Awaited<ReturnType<LoyaltyRepository['listAccountsForAnalytics']>>;
  loyaltyTransactions: Awaited<ReturnType<LoyaltyRepository['listTransactionsForAnalytics']>>;
  rewardRedemptions: Awaited<ReturnType<LoyaltyRepository['listRewardRedemptionsForAnalytics']>>;
  rewards: Awaited<ReturnType<LoyaltyRepository['listRewards']>>;
  invoiceReminderRules: Awaited<ReturnType<NotificationsRepository['listReminderRulesForAnalytics']>>;
  staffAdminAuditLogs: Awaited<ReturnType<AuthRepository['listStaffAdminAuditLogsForAnalytics']>>;
  qualityGateOverrides: Awaited<ReturnType<QualityGatesRepository['listOverridesForAnalytics']>>;
};

type AnalyticsRefreshResult = {
  refreshJob: Awaited<ReturnType<AnalyticsRepository['markRefreshJobCompleted']>>;
  sectionTimestamps: Partial<Record<SnapshotType, string | null>>;
};

const ANALYTICS_STALE_WINDOW_MS = 15 * 60 * 1000;

const SNAPSHOT_TYPES = [...analyticsSnapshotTypeEnum.enumValues];

@Injectable()
export class AnalyticsService {
  private snapshotRefreshInFlight: Promise<AnalyticsRefreshResult> | null = null;

  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
    private readonly bookingsRepository: BookingsRepository,
    private readonly jobOrdersRepository: JobOrdersRepository,
    private readonly insuranceRepository: InsuranceRepository,
    private readonly backJobsRepository: BackJobsRepository,
    private readonly loyaltyRepository: LoyaltyRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly qualityGatesRepository: QualityGatesRepository,
  ) {}

  async getDashboard(actor: AnalyticsActor) {
    await this.assertAnalyticsActor(actor);
    const snapshot = await this.ensureSnapshot('dashboard', actor.userId);
    return snapshot.payload;
  }

  async getOperations(actor: AnalyticsActor) {
    await this.assertAnalyticsActor(actor);
    const snapshot = await this.ensureSnapshot('operations', actor.userId);
    return snapshot.payload;
  }

  async getBackJobs(actor: AnalyticsActor) {
    await this.assertAnalyticsActor(actor);
    const snapshot = await this.ensureSnapshot('back_jobs', actor.userId);
    return snapshot.payload;
  }

  async getLoyalty(actor: AnalyticsActor) {
    await this.assertAnalyticsActor(actor);
    const snapshot = await this.ensureSnapshot('loyalty', actor.userId);
    return snapshot.payload;
  }

  async getInvoiceAging(actor: AnalyticsActor) {
    await this.assertAnalyticsActor(actor);
    const snapshot = await this.ensureSnapshot('invoice_aging', actor.userId);
    return snapshot.payload;
  }

  async getAuditTrail(actor: AnalyticsActor) {
    await this.assertAnalyticsActor(actor);
    const snapshot = await this.ensureSnapshot('audit_trail', actor.userId);
    return snapshot.payload;
  }

  async triggerManualRefresh(actor: AnalyticsActor) {
    await this.assertAnalyticsActor(actor);
    return this.refreshSnapshotsOnce({
      requestedByUserId: actor.userId,
      triggerSource: 'manual_refresh',
    });
  }

  async refreshAnalyticsSnapshot(payload?: {
    snapshotTypes?: SnapshotType[];
    requestedByUserId?: string | null;
    triggerSource?: 'bootstrap_read' | 'manual_refresh' | 'integration_refresh';
  }): Promise<AnalyticsRefreshResult> {
    const snapshotTypes = payload?.snapshotTypes?.length ? payload.snapshotTypes : SNAPSHOT_TYPES;
    const refreshJob = await this.analyticsRepository.createRefreshJob({
      snapshotTypes,
      requestedByUserId: payload?.requestedByUserId ?? null,
      triggerSource: payload?.triggerSource ?? 'manual_refresh',
    });

    try {
      const sourceState = await this.loadSourceState();
      const sourceCounts = this.buildSourceCounts(sourceState);

      for (const snapshotType of snapshotTypes) {
        await this.analyticsRepository.upsertSnapshot({
          snapshotType,
          payload: this.buildSnapshotPayload(snapshotType, sourceState, refreshJob.id),
          sourceCounts,
          refreshJobId: refreshJob.id,
        });
      }

      const completedRefreshJob = await this.analyticsRepository.markRefreshJobCompleted(
        refreshJob.id,
        sourceCounts,
      );

      return {
        refreshJob: completedRefreshJob,
        sectionTimestamps: await this.buildSectionTimestamps(snapshotTypes),
      };
    } catch (error) {
      await this.analyticsRepository.markRefreshJobFailed(
        refreshJob.id,
        error instanceof Error ? error.message : 'Unknown analytics refresh failure',
      );
      throw error;
    }
  }

  private async ensureSnapshot(snapshotType: SnapshotType, requestedByUserId?: string | null) {
    const existingSnapshot = await this.analyticsRepository.findSnapshotByType(snapshotType);
    if (existingSnapshot && !this.isSnapshotStale(existingSnapshot.generatedAt)) {
      return existingSnapshot;
    }

    await this.refreshSnapshotsOnce({
      snapshotTypes: existingSnapshot ? SNAPSHOT_TYPES : [snapshotType],
      requestedByUserId: requestedByUserId ?? null,
      triggerSource: existingSnapshot ? 'integration_refresh' : 'bootstrap_read',
    });

    const refreshedSnapshot = await this.analyticsRepository.findSnapshotByType(snapshotType);
    if (!refreshedSnapshot) {
      throw new NotFoundException('Analytics snapshot not found');
    }

    return refreshedSnapshot;
  }

  private isSnapshotStale(generatedAt: Date | string | null | undefined) {
    if (!generatedAt) {
      return true;
    }

    const snapshotTime = new Date(generatedAt).getTime();
    if (Number.isNaN(snapshotTime)) {
      return true;
    }

    return Date.now() - snapshotTime > ANALYTICS_STALE_WINDOW_MS;
  }

  private async refreshSnapshotsOnce(payload?: {
    snapshotTypes?: SnapshotType[];
    requestedByUserId?: string | null;
    triggerSource?: 'bootstrap_read' | 'manual_refresh' | 'integration_refresh';
  }) {
    if (!this.snapshotRefreshInFlight) {
      this.snapshotRefreshInFlight = this.refreshAnalyticsSnapshot(payload).finally(() => {
        this.snapshotRefreshInFlight = null;
      });
    }

    return this.snapshotRefreshInFlight;
  }

  private async buildSectionTimestamps(snapshotTypes: SnapshotType[]) {
    const entries = await Promise.all(
      snapshotTypes.map(async (snapshotType) => {
        const snapshot = await this.analyticsRepository.findSnapshotByType(snapshotType);
        return [snapshotType, snapshot?.generatedAt?.toISOString?.() ?? null] as const;
      }),
    );

    return Object.fromEntries(entries);
  }

  private async loadSourceState(): Promise<AnalyticsSourceState> {
    const [
      staffAdminAuditLogs,
      bookings,
      jobOrders,
      insuranceInquiries,
      backJobs,
      loyaltyAccounts,
      loyaltyTransactions,
      rewardRedemptions,
      rewards,
      invoiceReminderRules,
      qualityGateOverrides,
    ] = await Promise.all([
      this.authRepository.listStaffAdminAuditLogsForAnalytics(),
      this.bookingsRepository.listForAnalytics(),
      this.jobOrdersRepository.listForAnalytics(),
      this.insuranceRepository.listForAnalytics(),
      this.backJobsRepository.listForAnalytics(),
      this.loyaltyRepository.listAccountsForAnalytics(),
      this.loyaltyRepository.listTransactionsForAnalytics(),
      this.loyaltyRepository.listRewardRedemptionsForAnalytics(),
      this.loyaltyRepository.listRewards({ includeInactive: true }),
      this.notificationsRepository.listReminderRulesForAnalytics('invoice_aging'),
      this.qualityGatesRepository.listOverridesForAnalytics(),
    ]);

    return {
      staffAdminAuditLogs,
      bookings,
      jobOrders,
      insuranceInquiries,
      backJobs,
      loyaltyAccounts,
      loyaltyTransactions,
      rewardRedemptions,
      rewards,
      invoiceReminderRules,
      qualityGateOverrides,
    };
  }

  private buildSourceCounts(sourceState: AnalyticsSourceState): AnalyticsSourceCounts {
    return {
      bookings: sourceState.bookings.length,
      jobOrders: sourceState.jobOrders.length,
      insuranceInquiries: sourceState.insuranceInquiries.length,
      backJobs: sourceState.backJobs.length,
      loyaltyAccounts: sourceState.loyaltyAccounts.length,
      loyaltyTransactions: sourceState.loyaltyTransactions.length,
      rewardRedemptions: sourceState.rewardRedemptions.length,
      invoiceReminderRules: sourceState.invoiceReminderRules.length,
      staffAdminAuditLogs: sourceState.staffAdminAuditLogs.length,
      qualityGateOverrides: sourceState.qualityGateOverrides.length,
    };
  }

  private buildSnapshotPayload(
    snapshotType: SnapshotType,
    sourceState: AnalyticsSourceState,
    refreshJobId: string,
  ): AnalyticsSnapshotPayload {
    switch (snapshotType) {
      case 'dashboard':
        return this.buildDashboardPayload(sourceState, refreshJobId);
      case 'operations':
        return this.buildOperationsPayload(sourceState, refreshJobId);
      case 'back_jobs':
        return this.buildBackJobsPayload(sourceState, refreshJobId);
      case 'loyalty':
        return this.buildLoyaltyPayload(sourceState, refreshJobId);
      case 'invoice_aging':
        return this.buildInvoiceAgingPayload(sourceState, refreshJobId);
      case 'audit_trail':
        return this.buildAuditTrailPayload(sourceState, refreshJobId);
      default:
        return {
          refreshedAt: new Date().toISOString(),
          refreshJobId,
        };
    }
  }

  private buildDashboardPayload(sourceState: AnalyticsSourceState, refreshJobId: string) {
    const bookingStatuses = this.countBy(sourceState.bookings, (booking) => booking.status);
    const openInsuranceStatuses = new Set(['submitted', 'under_review', 'needs_documents']);
    const openBackJobStatuses = new Set([
      'reported',
      'inspected',
      'approved_for_rework',
      'in_progress',
    ]);
    const invoiceRecords = sourceState.jobOrders
      .filter((jobOrder) => jobOrder.invoiceRecord)
      .map((jobOrder) => jobOrder.invoiceRecord!);

    return {
      refreshedAt: new Date().toISOString(),
      refreshJobId,
      totals: {
        totalBookings: sourceState.bookings.length,
        activeBookings:
          (bookingStatuses.pending ?? 0) +
          (bookingStatuses.confirmed ?? 0) +
          (bookingStatuses.rescheduled ?? 0),
        finalizedServiceInvoices: invoiceRecords.length,
        insuranceOpenInquiries: sourceState.insuranceInquiries.filter((inquiry) =>
          openInsuranceStatuses.has(inquiry.status),
        ).length,
        openBackJobs: sourceState.backJobs.filter((backJob) => openBackJobStatuses.has(backJob.status))
          .length,
      },
      sales: {
        finalizedInvoiceCount: invoiceRecords.length,
        bookingInvoiceCount: invoiceRecords.filter((invoiceRecord) => invoiceRecord.sourceType === 'booking')
          .length,
        backJobInvoiceCount: invoiceRecords.filter((invoiceRecord) => invoiceRecord.sourceType === 'back_job')
          .length,
        latestInvoiceReference: (
          invoiceRecords.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]
            ?.invoiceReference ?? null
        ),
      },
      insurance: {
        totalInquiries: sourceState.insuranceInquiries.length,
        openInquiries: sourceState.insuranceInquiries.filter((inquiry) =>
          openInsuranceStatuses.has(inquiry.status),
        ).length,
        needsDocuments: sourceState.insuranceInquiries.filter(
          (inquiry) => inquiry.status === 'needs_documents',
        ).length,
        approvedForRecord: sourceState.insuranceInquiries.filter(
          (inquiry) => inquiry.status === 'approved_for_record',
        ).length,
        rejected: sourceState.insuranceInquiries.filter((inquiry) => inquiry.status === 'rejected').length,
      },
      serviceDemandPreview: this.buildServiceDemand(sourceState.bookings).slice(0, 5),
      peakHoursPreview: this.buildPeakHours(sourceState.bookings).slice(0, 5),
    };
  }

  private buildOperationsPayload(sourceState: AnalyticsSourceState, refreshJobId: string) {
    const bookingStatuses = this.toSortedCounts(this.countBy(sourceState.bookings, (booking) => booking.status));
    const jobOrderStatuses = this.toSortedCounts(
      this.countBy(sourceState.jobOrders, (jobOrder) => jobOrder.status),
    );
    const serviceAdviserLoadMap = new Map<
      string,
      {
        serviceAdviserUserId: string;
        serviceAdviserCode: string;
        jobOrderCount: number;
        finalizedCount: number;
      }
    >();

    for (const jobOrder of sourceState.jobOrders) {
      const key = `${jobOrder.serviceAdviserUserId}:${jobOrder.serviceAdviserCode}`;
      const existingEntry = serviceAdviserLoadMap.get(key) ?? {
        serviceAdviserUserId: jobOrder.serviceAdviserUserId,
        serviceAdviserCode: jobOrder.serviceAdviserCode,
        jobOrderCount: 0,
        finalizedCount: 0,
      };

      existingEntry.jobOrderCount += 1;
      if (jobOrder.status === 'finalized') {
        existingEntry.finalizedCount += 1;
      }

      serviceAdviserLoadMap.set(key, existingEntry);
    }

    return {
      refreshedAt: new Date().toISOString(),
      refreshJobId,
      bookingStatuses,
      jobOrderStatuses,
      peakHours: this.buildPeakHours(sourceState.bookings),
      serviceDemand: this.buildServiceDemand(sourceState.bookings),
      serviceAdviserLoad: Array.from(serviceAdviserLoadMap.values()).sort(
        (left, right) => right.jobOrderCount - left.jobOrderCount,
      ),
    };
  }

  private buildBackJobsPayload(sourceState: AnalyticsSourceState, refreshJobId: string) {
    const closedStatuses = new Set(['resolved', 'closed', 'rejected']);
    const repeatSourcesMap = new Map<
      string,
      { originalJobOrderId: string; backJobCount: number; unresolvedCount: number; sourceBackJobIds: string[] }
    >();

    for (const backJob of sourceState.backJobs) {
      const existingEntry = repeatSourcesMap.get(backJob.originalJobOrderId) ?? {
        originalJobOrderId: backJob.originalJobOrderId,
        backJobCount: 0,
        unresolvedCount: 0,
        sourceBackJobIds: [],
      };

      existingEntry.backJobCount += 1;
      if (!closedStatuses.has(backJob.status)) {
        existingEntry.unresolvedCount += 1;
      }
      existingEntry.sourceBackJobIds.push(backJob.id);
      repeatSourcesMap.set(backJob.originalJobOrderId, existingEntry);
    }

    return {
      refreshedAt: new Date().toISOString(),
      refreshJobId,
      totals: {
        totalBackJobs: sourceState.backJobs.length,
        openBackJobs: sourceState.backJobs.filter((backJob) => !closedStatuses.has(backJob.status)).length,
        resolvedBackJobs: sourceState.backJobs.filter((backJob) =>
          ['resolved', 'closed'].includes(backJob.status),
        ).length,
        validatedFindings: sourceState.backJobs.flatMap((backJob) => backJob.findings).filter(
          (finding) => finding.isValidated,
        ).length,
      },
      statuses: this.toSortedCounts(this.countBy(sourceState.backJobs, (backJob) => backJob.status)),
      severities: this.toSortedCounts(
        this.countBy(
          sourceState.backJobs.flatMap((backJob) => backJob.findings),
          (finding) => finding.severity,
        ),
        'severity',
      ),
      repeatSources: Array.from(repeatSourcesMap.values())
        .sort((left, right) => right.backJobCount - left.backJobCount)
        .slice(0, 10),
    };
  }

  private buildLoyaltyPayload(sourceState: AnalyticsSourceState, refreshJobId: string) {
    const transactionTypeMap = new Map<
      string,
      {
        transactionType: string;
        count: number;
        netPointsDelta: number;
      }
    >();
    const rewardMap = new Map(sourceState.rewards.map((reward) => [reward.id, reward]));
    const rewardUsageMap = new Map<
      string,
      {
        rewardId: string;
        rewardName: string;
        rewardStatus: string;
        redemptionCount: number;
        sourceRedemptionIds: string[];
      }
    >();

    for (const transaction of sourceState.loyaltyTransactions) {
      const existingEntry = transactionTypeMap.get(transaction.transactionType) ?? {
        transactionType: transaction.transactionType,
        count: 0,
        netPointsDelta: 0,
      };

      existingEntry.count += 1;
      existingEntry.netPointsDelta += transaction.pointsDelta;
      transactionTypeMap.set(transaction.transactionType, existingEntry);
    }

    for (const redemption of sourceState.rewardRedemptions) {
      const reward = rewardMap.get(redemption.rewardId);
      const existingEntry = rewardUsageMap.get(redemption.rewardId) ?? {
        rewardId: redemption.rewardId,
        rewardName: reward?.name ?? redemption.rewardNameSnapshot,
        rewardStatus: reward?.status ?? 'inactive',
        redemptionCount: 0,
        sourceRedemptionIds: [],
      };

      existingEntry.redemptionCount += 1;
      existingEntry.sourceRedemptionIds.push(redemption.id);
      rewardUsageMap.set(redemption.rewardId, existingEntry);
    }

    return {
      refreshedAt: new Date().toISOString(),
      refreshJobId,
      totals: {
        accountCount: sourceState.loyaltyAccounts.length,
        totalPointsBalance: sourceState.loyaltyAccounts.reduce(
          (sum, account) => sum + account.pointsBalance,
          0,
        ),
        totalPointsEarned: sourceState.loyaltyAccounts.reduce(
          (sum, account) => sum + account.lifetimePointsEarned,
          0,
        ),
        totalPointsRedeemed: sourceState.loyaltyAccounts.reduce(
          (sum, account) => sum + account.lifetimePointsRedeemed,
          0,
        ),
        redemptionCount: sourceState.rewardRedemptions.length,
      },
      transactionTypes: Array.from(transactionTypeMap.values()).sort((left, right) => right.count - left.count),
      topRewards: Array.from(rewardUsageMap.values())
        .sort((left, right) => right.redemptionCount - left.redemptionCount)
        .slice(0, 10),
    };
  }

  private buildInvoiceAgingPayload(sourceState: AnalyticsSourceState, refreshJobId: string) {
    const now = new Date();
    const bucketCounts = new Map<string, number>([
      ['due_today_or_future', 0],
      ['overdue_1_7', 0],
      ['overdue_8_30', 0],
      ['overdue_31_plus', 0],
    ]);
    const trackedInvoicesMap = new Map<
      string,
      {
        invoiceId: string;
        latestReminderStatus: string;
        latestScheduledFor: string;
        reminderRuleIds: string[];
      }
    >();

    for (const reminderRule of sourceState.invoiceReminderRules) {
      const bucket = this.getAgingBucket(reminderRule.scheduledFor, now);
      bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);

      const existingEntry = trackedInvoicesMap.get(reminderRule.sourceId);
      if (!existingEntry || existingEntry.latestScheduledFor < reminderRule.scheduledFor.toISOString()) {
        trackedInvoicesMap.set(reminderRule.sourceId, {
          invoiceId: reminderRule.sourceId,
          latestReminderStatus: reminderRule.status,
          latestScheduledFor: reminderRule.scheduledFor.toISOString(),
          reminderRuleIds: existingEntry
            ? [...existingEntry.reminderRuleIds, reminderRule.id]
            : [reminderRule.id],
        });
        continue;
      }

      existingEntry.reminderRuleIds.push(reminderRule.id);
    }

    return {
      refreshedAt: new Date().toISOString(),
      refreshJobId,
      totals: {
        trackedInvoices: trackedInvoicesMap.size,
        scheduledReminderRules: sourceState.invoiceReminderRules.filter(
          (reminderRule) => reminderRule.status === 'scheduled',
        ).length,
        processedReminderRules: sourceState.invoiceReminderRules.filter(
          (reminderRule) => reminderRule.status === 'processed',
        ).length,
        cancelledReminderRules: sourceState.invoiceReminderRules.filter(
          (reminderRule) => reminderRule.status === 'cancelled',
        ).length,
      },
      agingBuckets: Array.from(bucketCounts.entries()).map(([bucket, count]) => ({
        bucket,
        count,
      })),
      trackedInvoicePolicies: Array.from(trackedInvoicesMap.values()).sort((left, right) =>
        right.latestScheduledFor.localeCompare(left.latestScheduledFor),
      ),
    };
  }

  private buildAuditTrailPayload(sourceState: AnalyticsSourceState, refreshJobId: string) {
    const entries = [
      ...sourceState.staffAdminAuditLogs.map((auditLog) => ({
        auditType: 'staff_admin_action' as const,
        action: auditLog.action,
        occurredAt: auditLog.createdAt.toISOString(),
        actorUserId: auditLog.actorUserId,
        actorRole: auditLog.actorRole,
        reason: auditLog.reason,
        summary:
          auditLog.action === 'staff_account_provisioned'
            ? `Super admin provisioned ${auditLog.targetRole} staff account ${auditLog.targetStaffCode ?? auditLog.targetEmail}.`
            : `Super admin ${auditLog.nextIsActive ? 'activated' : 'deactivated'} staff account ${auditLog.targetStaffCode ?? auditLog.targetEmail}.`,
        sourceDomain: 'main-service.auth',
        sourceId: auditLog.id,
        targetEntityType: 'user',
        targetEntityId: auditLog.targetUserId ?? auditLog.id,
        relatedEntityIds: auditLog.targetUserId ? [auditLog.targetUserId] : [],
      })),
      ...sourceState.qualityGateOverrides.map((override) => ({
        auditType: 'quality_gate_override' as const,
        action: 'quality_gate_overridden',
        occurredAt: override.createdAt.toISOString(),
        actorUserId: override.actorUserId,
        actorRole: override.actorRole,
        reason: override.reason,
        summary: `Super admin overrode blocked QA for job order ${override.qualityGate.jobOrderId}.`,
        sourceDomain: 'main-service.quality-gates',
        sourceId: override.id,
        targetEntityType: 'quality_gate',
        targetEntityId: override.qualityGateId,
        relatedEntityIds: [override.qualityGate.jobOrderId],
      })),
      ...sourceState.jobOrders
        .filter((jobOrder) => jobOrder.invoiceRecord)
        .map((jobOrder) => ({
          auditType: 'release_decision' as const,
          action: 'service_invoice_finalized',
          occurredAt: jobOrder.invoiceRecord!.createdAt.toISOString(),
          actorUserId: jobOrder.invoiceRecord!.finalizedByUserId,
          actorRole: null,
          reason: jobOrder.invoiceRecord!.summary ?? null,
          summary: `Service release was finalized for job order ${jobOrder.id} as invoice ${jobOrder.invoiceRecord!.invoiceReference}.`,
          sourceDomain: 'main-service.job-orders',
          sourceId: jobOrder.invoiceRecord!.id,
          targetEntityType: 'job_order',
          targetEntityId: jobOrder.id,
          relatedEntityIds: [jobOrder.invoiceRecord!.id],
        })),
    ]
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    return {
      refreshedAt: new Date().toISOString(),
      refreshJobId,
      totals: {
        totalSensitiveActions: entries.length,
        staffAdminActions: sourceState.staffAdminAuditLogs.length,
        qualityGateOverrides: sourceState.qualityGateOverrides.length,
        releaseDecisions: sourceState.jobOrders.filter((jobOrder) => jobOrder.invoiceRecord).length,
      },
      entries,
    };
  }

  private buildServiceDemand(bookings: AnalyticsSourceState['bookings']) {
    const serviceDemandMap = new Map<
      string,
      {
        serviceId: string;
        serviceName: string;
        bookingCount: number;
        lastBookedAt: string;
        sourceBookingIds: string[];
      }
    >();

    for (const booking of bookings) {
      for (const requestedService of booking.requestedServices) {
        const existingEntry = serviceDemandMap.get(requestedService.serviceId) ?? {
          serviceId: requestedService.serviceId,
          serviceName: requestedService.service.name,
          bookingCount: 0,
          lastBookedAt: booking.createdAt.toISOString(),
          sourceBookingIds: [],
        };

        existingEntry.bookingCount += 1;
        if (existingEntry.lastBookedAt < booking.createdAt.toISOString()) {
          existingEntry.lastBookedAt = booking.createdAt.toISOString();
        }
        existingEntry.sourceBookingIds.push(booking.id);
        serviceDemandMap.set(requestedService.serviceId, existingEntry);
      }
    }

    return Array.from(serviceDemandMap.values()).sort((left, right) => right.bookingCount - left.bookingCount);
  }

  private buildPeakHours(bookings: AnalyticsSourceState['bookings']) {
    const slotUsageMap = new Map<
      string,
      {
        timeSlotId: string;
        label: string;
        startTime: string;
        endTime: string;
        bookingCount: number;
        capacity: number;
        distinctDates: Set<string>;
        sourceBookingIds: string[];
      }
    >();

    for (const booking of bookings) {
      const existingEntry = slotUsageMap.get(booking.timeSlotId) ?? {
        timeSlotId: booking.timeSlotId,
        label: booking.timeSlot.label,
        startTime: booking.timeSlot.startTime,
        endTime: booking.timeSlot.endTime,
        bookingCount: 0,
        capacity: booking.timeSlot.capacity,
        distinctDates: new Set<string>(),
        sourceBookingIds: [],
      };

      existingEntry.bookingCount += 1;
      existingEntry.distinctDates.add(booking.scheduledDate);
      existingEntry.sourceBookingIds.push(booking.id);
      slotUsageMap.set(booking.timeSlotId, existingEntry);
    }

    return Array.from(slotUsageMap.values())
      .map((slotUsage) => ({
        timeSlotId: slotUsage.timeSlotId,
        label: slotUsage.label,
        startTime: slotUsage.startTime,
        endTime: slotUsage.endTime,
        bookingCount: slotUsage.bookingCount,
        averageFillPercent: this.roundToTwo(
          slotUsage.distinctDates.size
            ? (slotUsage.bookingCount / (slotUsage.capacity * slotUsage.distinctDates.size)) * 100
            : 0,
        ),
        sourceBookingIds: slotUsage.sourceBookingIds,
      }))
      .sort((left, right) => right.bookingCount - left.bookingCount);
  }

  private getAgingBucket(scheduledFor: Date, now: Date) {
    const diffInDays = Math.floor((now.getTime() - scheduledFor.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays <= 0) {
      return 'due_today_or_future';
    }

    if (diffInDays <= 7) {
      return 'overdue_1_7';
    }

    if (diffInDays <= 30) {
      return 'overdue_8_30';
    }

    return 'overdue_31_plus';
  }

  private countBy<T>(items: T[], getKey: (item: T) => string) {
    return items.reduce<Record<string, number>>((accumulator, item) => {
      const key = getKey(item);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
  }

  private toSortedCounts(counts: Record<string, number>, keyName: 'status' | 'severity' = 'status') {
    return Object.entries(counts)
      .map(([key, count]) => ({
        [keyName]: key,
        count,
      }))
      .sort((left, right) => right.count - left.count);
  }

  private roundToTwo(value: number) {
    return Math.round(value * 100) / 100;
  }

  private async assertAnalyticsActor(actor: AnalyticsActor) {
    const resolvedActor = await this.usersService.findById(actor.userId);
    if (!resolvedActor || !resolvedActor.isActive) {
      throw new NotFoundException('Analytics actor not found');
    }

    if (!['service_adviser', 'super_admin'].includes(resolvedActor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can access analytics dashboards');
    }

    return resolvedActor;
  }
}
