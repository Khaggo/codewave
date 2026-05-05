import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';

import { BackJobsRepository } from '../src/modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '../src/modules/bookings/repositories/bookings.repository';
import { InsuranceRepository } from '../src/modules/insurance/repositories/insurance.repository';
import { JobOrdersRepository } from '../src/modules/job-orders/repositories/job-orders.repository';
import { LoyaltyRepository } from '../src/modules/loyalty/repositories/loyalty.repository';
import { NotificationsRepository } from '../src/modules/notifications/repositories/notifications.repository';
import { QualityGatesRepository } from '../src/modules/quality-gates/repositories/quality-gates.repository';
import { AuthRepository } from '../src/modules/auth/repositories/auth.repository';
import { UsersService } from '../src/modules/users/services/users.service';
import { AnalyticsRepository } from '../src/modules/analytics/repositories/analytics.repository';
import { AnalyticsService } from '../src/modules/analytics/services/analytics.service';

describe('AnalyticsService', () => {
  it('rebuilds analytics snapshots from derived source records', async () => {
    const analyticsRepository = {
      createRefreshJob: jest.fn().mockResolvedValue({ id: 'refresh-job-1' }),
      upsertSnapshot: jest.fn().mockResolvedValue(undefined),
      markRefreshJobCompleted: jest.fn().mockResolvedValue({
        id: 'refresh-job-1',
        status: 'completed',
      }),
      markRefreshJobFailed: jest.fn(),
      findSnapshotByType: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsRepository, useValue: analyticsRepository },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'adviser-1',
              role: 'service_adviser',
              isActive: true,
            }),
          },
        },
        {
          provide: AuthRepository,
          useValue: {
            listStaffAdminAuditLogsForAnalytics: jest.fn().mockResolvedValue([
              {
                id: 'audit-1',
                action: 'staff_account_status_changed',
                actorUserId: 'admin-1',
                actorRole: 'super_admin',
                targetUserId: 'staff-1',
                targetRole: 'service_adviser',
                targetEmail: 'staff@example.com',
                targetStaffCode: 'SA-1001',
                previousIsActive: true,
                nextIsActive: false,
                reason: 'HR review hold.',
                createdAt: new Date('2026-04-16T12:00:00.000Z'),
              },
            ]),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            listForAnalytics: jest.fn().mockResolvedValue([
              {
                id: 'booking-1',
                status: 'confirmed',
                timeSlotId: 'slot-1',
                scheduledDate: '2026-04-16',
                createdAt: new Date('2026-04-16T08:30:00.000Z'),
                timeSlot: {
                  id: 'slot-1',
                  label: 'Morning Slot',
                  startTime: '09:00',
                  endTime: '10:00',
                  capacity: 2,
                },
                requestedServices: [
                  {
                    serviceId: 'service-1',
                    service: {
                      id: 'service-1',
                      name: 'Oil Change',
                    },
                  },
                ],
              },
            ]),
          },
        },
        {
          provide: JobOrdersRepository,
          useValue: {
            listForAnalytics: jest.fn().mockResolvedValue([
              {
                id: 'job-order-1',
                status: 'finalized',
                serviceAdviserUserId: 'adviser-1',
                serviceAdviserCode: 'SA-1001',
                createdAt: new Date('2026-04-16T09:00:00.000Z'),
                invoiceRecord: {
                  id: 'invoice-record-1',
                  sourceType: 'booking',
                  invoiceReference: 'INV-0001',
                  createdAt: new Date('2026-04-16T11:00:00.000Z'),
                },
              },
            ]),
          },
        },
        {
          provide: InsuranceRepository,
          useValue: {
            listForAnalytics: jest.fn().mockResolvedValue([
              {
                id: 'insurance-1',
                status: 'needs_documents',
                createdAt: new Date('2026-04-16T09:30:00.000Z'),
                documents: [],
              },
            ]),
          },
        },
        {
          provide: BackJobsRepository,
          useValue: {
            listForAnalytics: jest.fn().mockResolvedValue([
              {
                id: 'back-job-1',
                originalJobOrderId: 'job-order-1',
                status: 'reported',
                createdAt: new Date('2026-04-16T10:00:00.000Z'),
                findings: [
                  {
                    id: 'finding-1',
                    severity: 'high',
                    isValidated: true,
                  },
                ],
              },
            ]),
          },
        },
        {
          provide: LoyaltyRepository,
          useValue: {
            listAccountsForAnalytics: jest.fn().mockResolvedValue([
              {
                id: 'account-1',
                pointsBalance: 50,
                lifetimePointsEarned: 100,
                lifetimePointsRedeemed: 50,
              },
            ]),
            listTransactionsForAnalytics: jest.fn().mockResolvedValue([
              {
                id: 'transaction-1',
                transactionType: 'accrual',
                pointsDelta: 100,
              },
              {
                id: 'transaction-2',
                transactionType: 'redemption',
                pointsDelta: -50,
              },
            ]),
            listRewardRedemptionsForAnalytics: jest.fn().mockResolvedValue([
              {
                id: 'redemption-1',
                rewardId: 'reward-1',
                rewardNameSnapshot: 'Free Car Wash',
              },
            ]),
            listRewards: jest.fn().mockResolvedValue([
              {
                id: 'reward-1',
                name: 'Free Car Wash',
                status: 'active',
              },
            ]),
          },
        },
        {
          provide: NotificationsRepository,
          useValue: {
            listReminderRulesForAnalytics: jest.fn().mockResolvedValue([
              {
                id: 'rule-1',
                sourceId: 'invoice-1',
                status: 'scheduled',
                scheduledFor: new Date('2026-04-10T09:00:00.000Z'),
              },
            ]),
          },
        },
        {
          provide: QualityGatesRepository,
          useValue: {
            listOverridesForAnalytics: jest.fn().mockResolvedValue([
              {
                id: 'override-1',
                qualityGateId: 'quality-gate-1',
                actorUserId: 'admin-1',
                actorRole: 'super_admin',
                reason: 'Supervisor approved release after documented review.',
                createdAt: new Date('2026-04-16T11:30:00.000Z'),
                qualityGate: {
                  id: 'quality-gate-1',
                  jobOrderId: 'job-order-1',
                },
              },
            ]),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(AnalyticsService);
    const result = await service.refreshAnalyticsSnapshot({
      snapshotTypes: ['dashboard', 'invoice_aging', 'audit_trail'],
      requestedByUserId: 'adviser-1',
      triggerSource: 'manual_refresh',
    });

    expect(analyticsRepository.createRefreshJob).toHaveBeenCalledWith({
      snapshotTypes: ['dashboard', 'invoice_aging', 'audit_trail'],
      requestedByUserId: 'adviser-1',
      triggerSource: 'manual_refresh',
    });
    expect(analyticsRepository.upsertSnapshot).toHaveBeenCalledTimes(3);
    expect(analyticsRepository.upsertSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotType: 'dashboard',
        payload: expect.objectContaining({
          totals: expect.objectContaining({
            totalBookings: 1,
            finalizedServiceInvoices: 1,
            insuranceOpenInquiries: 1,
            openBackJobs: 1,
          }),
          serviceDemandPreview: expect.arrayContaining([
            expect.objectContaining({
              serviceId: 'service-1',
            }),
          ]),
        }),
      }),
    );
    expect(analyticsRepository.upsertSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotType: 'invoice_aging',
        payload: expect.objectContaining({
          totals: expect.objectContaining({
            trackedInvoices: 1,
            scheduledReminderRules: 1,
          }),
        }),
      }),
    );
    expect(analyticsRepository.upsertSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotType: 'audit_trail',
        payload: expect.objectContaining({
          totals: expect.objectContaining({
            totalSensitiveActions: 3,
            staffAdminActions: 1,
            qualityGateOverrides: 1,
            releaseDecisions: 1,
          }),
          entries: expect.arrayContaining([
            expect.objectContaining({
              auditType: 'staff_admin_action',
              action: 'staff_account_status_changed',
            }),
            expect.objectContaining({
              auditType: 'quality_gate_override',
              action: 'quality_gate_overridden',
            }),
            expect.objectContaining({
              auditType: 'release_decision',
              action: 'service_invoice_finalized',
            }),
          ]),
        }),
      }),
    );
    expect(analyticsRepository.markRefreshJobCompleted).toHaveBeenCalledWith(
      'refresh-job-1',
      expect.objectContaining({
        bookings: 1,
        jobOrders: 1,
        insuranceInquiries: 1,
        backJobs: 1,
        loyaltyAccounts: 1,
        loyaltyTransactions: 2,
        rewardRedemptions: 1,
        invoiceReminderRules: 1,
        staffAdminAuditLogs: 1,
        qualityGateOverrides: 1,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        refreshJob: expect.objectContaining({
          id: 'refresh-job-1',
          status: 'completed',
        }),
        sectionTimestamps: expect.objectContaining({
          dashboard: null,
          invoice_aging: null,
          audit_trail: null,
        }),
      }),
    );
  });

  it('rejects technician access to admin analytics', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: AnalyticsRepository,
          useValue: {
            findSnapshotByType: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'technician-1',
              role: 'technician',
              isActive: true,
            }),
          },
        },
        {
          provide: AuthRepository,
          useValue: {
            listStaffAdminAuditLogsForAnalytics: jest.fn(),
          },
        },
        { provide: BookingsRepository, useValue: { listForAnalytics: jest.fn() } },
        { provide: JobOrdersRepository, useValue: { listForAnalytics: jest.fn() } },
        { provide: InsuranceRepository, useValue: { listForAnalytics: jest.fn() } },
        { provide: BackJobsRepository, useValue: { listForAnalytics: jest.fn() } },
        {
          provide: LoyaltyRepository,
          useValue: {
            listAccountsForAnalytics: jest.fn(),
            listTransactionsForAnalytics: jest.fn(),
            listRewardRedemptionsForAnalytics: jest.fn(),
            listRewards: jest.fn(),
          },
        },
        {
          provide: NotificationsRepository,
          useValue: {
            listReminderRulesForAnalytics: jest.fn(),
          },
        },
        {
          provide: QualityGatesRepository,
          useValue: {
            listOverridesForAnalytics: jest.fn(),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(AnalyticsService);

    await expect(
      service.getDashboard({
        userId: 'technician-1',
        role: 'technician',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
