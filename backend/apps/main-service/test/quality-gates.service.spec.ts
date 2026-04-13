import { ConflictException, ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';

import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { QUALITY_GATES_QUEUE_NAME } from '@main-modules/quality-gates/quality-gates.constants';
import { QualityGatesRepository } from '@main-modules/quality-gates/repositories/quality-gates.repository';
import { QualityGateDiscrepancyEngineService } from '@main-modules/quality-gates/services/quality-gate-discrepancy-engine.service';
import { QualityGateSemanticAuditorService } from '@main-modules/quality-gates/services/quality-gate-semantic-auditor.service';
import { QualityGatesService } from '@main-modules/quality-gates/services/quality-gates.service';
import { UsersService } from '@main-modules/users/services/users.service';

describe('QualityGatesService', () => {
  it('starts a pending quality gate and queues an audit for ready-for-QA job orders', async () => {
    const qualityGatesRepository = {
      upsertPending: jest.fn().mockResolvedValue({
        id: 'quality-gate-1',
        jobOrderId: 'job-order-1',
        status: 'pending',
      }),
    };

    const qualityGatesQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        QualityGatesService,
        QualityGateDiscrepancyEngineService,
        QualityGateSemanticAuditorService,
        { provide: QualityGatesRepository, useValue: qualityGatesRepository },
        {
          provide: JobOrdersRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'job-order-1',
              status: 'ready_for_qa',
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn().mockResolvedValue([]) } },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: getQueueToken(QUALITY_GATES_QUEUE_NAME), useValue: qualityGatesQueue },
      ],
    }).compile();

    const service = moduleRef.get(QualityGatesService);

    const result = await service.beginQualityGate('job-order-1');

    expect(qualityGatesRepository.upsertPending).toHaveBeenCalledWith('job-order-1');
    expect(qualityGatesQueue.add).toHaveBeenCalledWith(
      'run-quality-gate-audit',
      { jobOrderId: 'job-order-1' },
      expect.objectContaining({
        jobId: 'quality-gate:job-order-1',
      }),
    );
    expect(result.status).toBe('pending');
  });

  it('marks the quality gate as blocked when the job order still has incomplete work items', async () => {
    const bookingsRepository = {
      findOptionalById: jest.fn().mockResolvedValue({
        id: 'booking-1',
        notes: 'Engine rattling noise during cold start.',
        requestedServices: [
          {
            service: {
              name: 'Engine Diagnostics',
            },
          },
        ],
      }),
    };

    const qualityGatesRepository = {
      findOptionalByJobOrderId: jest.fn().mockResolvedValue(null),
      upsertPending: jest.fn().mockResolvedValue({
        id: 'quality-gate-1',
        jobOrderId: 'job-order-1',
        status: 'pending',
      }),
      completeAudit: jest.fn().mockResolvedValue({
        id: 'quality-gate-1',
        jobOrderId: 'job-order-1',
        status: 'blocked',
        riskScore: 85,
        findings: [
          {
            code: 'incomplete_work_items',
          },
        ],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        QualityGatesService,
        QualityGateDiscrepancyEngineService,
        { provide: QualityGatesRepository, useValue: qualityGatesRepository },
        {
          provide: JobOrdersRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'job-order-1',
              sourceType: 'booking',
              sourceId: 'booking-1',
              status: 'ready_for_qa',
              vehicleId: 'vehicle-1',
              items: [{ id: 'item-1', isCompleted: false }],
              progressEntries: [],
              assignments: [],
              photos: [],
              notes: null,
            }),
          },
        },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn().mockResolvedValue([]) } },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        QualityGateSemanticAuditorService,
        { provide: getQueueToken(QUALITY_GATES_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(QualityGatesService);

    const result = await service.runQualityGateAudit('job-order-1');

    expect(qualityGatesRepository.completeAudit).toHaveBeenCalledWith(
      'job-order-1',
      expect.objectContaining({
        status: 'blocked',
        riskScore: 85,
        findings: expect.arrayContaining([
          expect.objectContaining({
            code: 'incomplete_work_items',
          }),
        ]),
      }),
    );
    expect(result.status).toBe('blocked');
  });

  it('adds a Gate 1 semantic finding with provenance when the completed work supports the concern narrative', async () => {
    const qualityGatesRepository = {
      findOptionalByJobOrderId: jest.fn().mockResolvedValue({
        id: 'quality-gate-1',
        jobOrderId: 'job-order-1',
        status: 'pending',
      }),
      completeAudit: jest.fn().mockResolvedValue({
        id: 'quality-gate-1',
        jobOrderId: 'job-order-1',
        status: 'passed',
        riskScore: 10,
        findings: [
          {
            gate: 'gate_1',
            code: 'semantic_resolution_supported',
          },
        ],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        QualityGatesService,
        QualityGateDiscrepancyEngineService,
        QualityGateSemanticAuditorService,
        { provide: QualityGatesRepository, useValue: qualityGatesRepository },
        {
          provide: JobOrdersRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'job-order-1',
              sourceType: 'booking',
              sourceId: 'booking-1',
              status: 'ready_for_qa',
              vehicleId: 'vehicle-1',
              items: [
                {
                  id: 'item-1',
                  name: 'Resolve engine rattling noise',
                  description: 'Inspect the drive belt and cold-start pulleys.',
                  isCompleted: true,
                },
              ],
              progressEntries: [
                {
                  message: 'Completed the engine rattle diagnosis and cold-start belt inspection.',
                },
              ],
              assignments: [],
              photos: [],
              notes: 'Customer concern resolved during cold-start engine check.',
            }),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            findOptionalById: jest.fn().mockResolvedValue({
              id: 'booking-1',
              notes: 'Engine rattling noise during cold start.',
              requestedServices: [
                {
                  service: {
                    name: 'Engine Diagnostics',
                  },
                },
              ],
            }),
          },
        },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn().mockResolvedValue([]) } },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: getQueueToken(QUALITY_GATES_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(QualityGatesService);

    await service.runQualityGateAudit('job-order-1');

    expect(qualityGatesRepository.completeAudit).toHaveBeenCalledWith(
      'job-order-1',
      expect.objectContaining({
        status: 'passed',
        findings: expect.arrayContaining([
          expect.objectContaining({
            gate: 'gate_1',
            code: 'semantic_resolution_supported',
            provenance: expect.objectContaining({
              provider: 'local-rule-auditor',
              promptVersion: 'quality-gates.gate1.v1',
              recommendation: 'supported',
              matchedKeywords: expect.arrayContaining(['engine', 'rattl', 'cold']),
            }),
          }),
        ]),
      }),
    );
  });

  it('blocks the quality gate when a verified high-severity completion finding is not reflected in the completed work record', async () => {
    const qualityGatesRepository = {
      findOptionalByJobOrderId: jest.fn().mockResolvedValue({
        id: 'quality-gate-1',
        jobOrderId: 'job-order-1',
        status: 'pending',
      }),
      completeAudit: jest.fn().mockResolvedValue({
        id: 'quality-gate-1',
        jobOrderId: 'job-order-1',
        status: 'blocked',
        riskScore: 75,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        QualityGatesService,
        QualityGateDiscrepancyEngineService,
        QualityGateSemanticAuditorService,
        { provide: QualityGatesRepository, useValue: qualityGatesRepository },
        {
          provide: JobOrdersRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'job-order-1',
              sourceType: 'booking',
              sourceId: 'booking-1',
              vehicleId: 'vehicle-1',
              status: 'ready_for_qa',
              items: [
                {
                  id: 'item-1',
                  name: 'Inspect engine rattle',
                  description: 'Checked pulleys and belt tension.',
                  isCompleted: true,
                },
              ],
              progressEntries: [
                {
                  message: 'Engine rattle inspection completed and released for QA.',
                },
              ],
              assignments: [],
              photos: [],
              notes: 'QA should confirm the vehicle is ready for release.',
            }),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            findOptionalById: jest.fn().mockResolvedValue({
              id: 'booking-1',
              notes: 'Engine rattling noise during cold start.',
              requestedServices: [
                {
                  service: {
                    name: 'Engine Diagnostics',
                  },
                },
              ],
            }),
          },
        },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn() } },
        {
          provide: InspectionsRepository,
          useValue: {
            findByVehicleId: jest.fn().mockResolvedValue([
              {
                id: 'inspection-1',
                bookingId: 'booking-1',
                inspectionType: 'completion',
                status: 'completed',
                notes: 'Final brake and fluid check before release.',
                createdAt: new Date('2026-06-10T08:30:00.000Z'),
                findings: [
                  {
                    id: 'finding-1',
                    category: 'brakes',
                    label: 'Brake fluid leak at front line',
                    severity: 'high',
                    notes: 'Leak remains visible on final inspection.',
                    isVerified: true,
                  },
                ],
              },
            ]),
          },
        },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: getQueueToken(QUALITY_GATES_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(QualityGatesService);

    await service.runQualityGateAudit('job-order-1');

    expect(qualityGatesRepository.completeAudit).toHaveBeenCalledWith(
      'job-order-1',
      expect.objectContaining({
        status: 'blocked',
        riskScore: 75,
        findings: expect.arrayContaining([
          expect.objectContaining({
            gate: 'gate_2',
            code: 'verified_high_severity_unresolved',
            provenance: expect.objectContaining({
              provider: 'local-rule-engine',
              ruleId: 'gate_2.verified_high_severity_unresolved',
              evidenceRefs: expect.arrayContaining(['inspection:inspection-1', 'inspection-finding:finding-1']),
              riskContribution: 75,
            }),
          }),
        ]),
      }),
    );
  });

  it('prevents release when the quality gate remains blocked', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        QualityGatesService,
        QualityGateDiscrepancyEngineService,
        QualityGateSemanticAuditorService,
        {
          provide: QualityGatesRepository,
          useValue: {
            findOptionalByJobOrderId: jest.fn().mockResolvedValue({
              id: 'quality-gate-1',
              jobOrderId: 'job-order-1',
              status: 'blocked',
            }),
          },
        },
        {
          provide: JobOrdersRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'job-order-1',
              status: 'ready_for_qa',
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn().mockResolvedValue([]) } },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: getQueueToken(QUALITY_GATES_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(QualityGatesService);

    await expect(service.assertReleaseAllowed('job-order-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows a super admin to override a blocked quality gate with an audit reason', async () => {
    const qualityGatesRepository = {
      findOptionalByJobOrderId: jest.fn().mockResolvedValue({
        id: 'quality-gate-1',
        jobOrderId: 'job-order-1',
        status: 'blocked',
      }),
      createOverride: jest.fn().mockResolvedValue({
        id: 'quality-gate-1',
        jobOrderId: 'job-order-1',
        status: 'overridden',
        overrides: [
          {
            actorUserId: 'super-admin-1',
            actorRole: 'super_admin',
            reason: 'Supervisor reviewed the evidence and approved release.',
          },
        ],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        QualityGatesService,
        QualityGateDiscrepancyEngineService,
        QualityGateSemanticAuditorService,
        { provide: QualityGatesRepository, useValue: qualityGatesRepository },
        {
          provide: JobOrdersRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'job-order-1',
              status: 'ready_for_qa',
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn().mockResolvedValue([]) } },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'super-admin-1',
              role: 'super_admin',
              isActive: true,
            }),
          },
        },
        { provide: getQueueToken(QUALITY_GATES_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(QualityGatesService);

    const result = await service.overrideBlockedGate(
      'job-order-1',
      {
        reason: 'Supervisor reviewed the evidence and approved release.',
      },
      {
        userId: 'super-admin-1',
        role: 'super_admin',
      },
    );

    expect(qualityGatesRepository.createOverride).toHaveBeenCalledWith('job-order-1', {
      actorUserId: 'super-admin-1',
      actorRole: 'super_admin',
      reason: 'Supervisor reviewed the evidence and approved release.',
    });
    expect(result.status).toBe('overridden');
  });

  it('rejects manual override attempts from non-super-admin staff', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        QualityGatesService,
        QualityGateDiscrepancyEngineService,
        QualityGateSemanticAuditorService,
        { provide: QualityGatesRepository, useValue: { findOptionalByJobOrderId: jest.fn() } },
        {
          provide: JobOrdersRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn().mockResolvedValue([]) } },
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
        { provide: getQueueToken(QUALITY_GATES_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(QualityGatesService);

    await expect(
      service.overrideBlockedGate(
        'job-order-1',
        {
          reason: 'Trying to bypass QA without approval.',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
