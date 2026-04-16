import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { QualityGatesRepository } from '@main-modules/quality-gates/repositories/quality-gates.repository';
import { VehicleLifecycleRepository } from '@main-modules/vehicle-lifecycle/repositories/vehicle-lifecycle.repository';
import { VehicleLifecycleService } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle.service';
import { VehicleLifecycleSummaryProviderService } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle-summary-provider.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';
import { AI_WORKER_QUEUE_NAME } from '@shared/queue/ai-worker.constants';

describe('VehicleLifecycleService', () => {
  it('builds a timeline with booking, inspection, job-order, QA, and summary-review events', async () => {
    let projectedEvents: unknown[] = [];

    const bookingsRepository = {
      findByVehicleId: jest.fn().mockResolvedValue([
        {
          id: 'booking-1',
          statusHistory: [
            {
              id: 'history-1',
              previousStatus: null,
              nextStatus: 'pending',
              reason: 'Booking created',
              changedByUserId: 'user-1',
              changedAt: new Date('2026-04-20T09:00:00.000Z'),
            },
            {
              id: 'history-2',
              previousStatus: 'pending',
              nextStatus: 'confirmed',
              reason: 'Staff approved the booking',
              changedByUserId: 'user-2',
              changedAt: new Date('2026-04-20T10:00:00.000Z'),
            },
          ],
        },
      ]),
    };

    const inspectionsRepository = {
      findByVehicleId: jest.fn().mockResolvedValue([
        {
          id: 'inspection-1',
          inspectionType: 'completion',
          status: 'completed',
          inspectorUserId: 'user-2',
          notes: 'Vehicle condition verified.',
          createdAt: new Date('2026-04-20T11:00:00.000Z'),
        },
      ]),
    };

    const jobOrdersRepository = {
      findByVehicleId: jest.fn().mockResolvedValue([
        {
          id: 'job-order-1',
          sourceType: 'booking',
          sourceId: 'booking-1',
          customerUserId: 'customer-1',
          vehicleId: 'vehicle-1',
          serviceAdviserUserId: 'user-2',
          serviceAdviserCode: 'SA-1001',
          status: 'finalized',
          notes: 'Resolved the original startup concern.',
          createdAt: new Date('2026-04-20T12:00:00.000Z'),
          updatedAt: new Date('2026-04-20T14:00:00.000Z'),
          items: [],
          assignments: [],
          progressEntries: [],
          photos: [],
          invoiceRecord: {
            id: 'invoice-record-1',
            jobOrderId: 'job-order-1',
            summary: 'Invoice-ready after QA pass.',
            finalizedByUserId: 'user-2',
            createdAt: new Date('2026-04-20T14:30:00.000Z'),
          },
        },
      ]),
    };

    const qualityGatesRepository = {
      findByJobOrderIds: jest.fn().mockResolvedValue([
        {
          id: 'quality-gate-1',
          jobOrderId: 'job-order-1',
          status: 'passed',
          riskScore: 10,
          blockingReason: null,
          lastAuditRequestedAt: new Date('2026-04-20T13:45:00.000Z'),
          lastAuditCompletedAt: new Date('2026-04-20T14:00:00.000Z'),
          findings: [],
          overrides: [],
          updatedAt: new Date('2026-04-20T14:00:00.000Z'),
        },
      ]),
    };

    const vehicleLifecycleRepository = {
      replaceForVehicle: jest.fn().mockImplementation(async (_vehicleId: string, events: unknown[]) => {
        projectedEvents = events;
        return events;
      }),
      findByVehicleId: jest.fn().mockImplementation(async () => projectedEvents),
      listSummariesByVehicleId: jest.fn().mockResolvedValue([
        {
          id: 'summary-1',
          vehicleId: 'vehicle-1',
          status: 'approved',
          reviewNotes: 'Approved for customer visibility.',
          reviewedByUserId: 'user-2',
          reviewedAt: new Date('2026-04-20T15:00:00.000Z'),
        },
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        { provide: VehicleLifecycleRepository, useValue: vehicleLifecycleRepository },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: InspectionsRepository, useValue: inspectionsRepository },
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: QualityGatesRepository, useValue: qualityGatesRepository },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
        { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    const result = await service.findByVehicleId('vehicle-1');

    expect(bookingsRepository.findByVehicleId).toHaveBeenCalledWith('vehicle-1');
    expect(inspectionsRepository.findByVehicleId).toHaveBeenCalledWith('vehicle-1');
    expect(jobOrdersRepository.findByVehicleId).toHaveBeenCalledWith('vehicle-1');
    expect(qualityGatesRepository.findByJobOrderIds).toHaveBeenCalledWith(['job-order-1']);
    expect(vehicleLifecycleRepository.replaceForVehicle).toHaveBeenCalled();
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'booking_created',
          eventCategory: 'administrative',
          verified: false,
          sourceType: 'booking',
        }),
        expect.objectContaining({
          eventType: 'inspection_completion_completed',
          eventCategory: 'verified',
          verified: true,
          inspectionId: 'inspection-1',
          sourceType: 'inspection',
        }),
        expect.objectContaining({
          eventType: 'job_order_created',
          sourceType: 'job_order',
        }),
        expect.objectContaining({
          eventType: 'job_order_finalized',
          sourceType: 'job_order',
        }),
        expect.objectContaining({
          eventType: 'quality_gate_passed',
          sourceType: 'quality_gate',
        }),
        expect.objectContaining({
          eventType: 'lifecycle_summary_approved',
          sourceType: 'lifecycle_summary',
          actorUserId: 'user-2',
        }),
      ]),
    );
  });

  it('rejects verified lifecycle events without inspection evidence', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        {
          provide: VehicleLifecycleRepository,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
          },
        },
        {
          provide: InspectionsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JobOrdersRepository,
          useValue: {
            findByVehicleId: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: QualityGatesRepository,
          useValue: {
            findByJobOrderIds: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
        { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(
      service.appendVehicleTimelineEvent({
        vehicleId: 'vehicle-1',
        eventType: 'manual_verification',
        eventCategory: 'verified',
        sourceType: 'manual',
        sourceId: 'manual-1',
        occurredAt: new Date('2026-04-20T12:00:00.000Z'),
        verified: true,
        dedupeKey: 'manual:manual-1:verified',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inspection references that belong to another vehicle', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        {
          provide: VehicleLifecycleRepository,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
          },
        },
        {
          provide: InspectionsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
            findById: jest.fn().mockResolvedValue({
              id: 'inspection-1',
              vehicleId: 'vehicle-2',
            }),
          },
        },
        {
          provide: JobOrdersRepository,
          useValue: {
            findByVehicleId: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: QualityGatesRepository,
          useValue: {
            findByJobOrderIds: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
        { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(
      service.appendVehicleTimelineEvent({
        vehicleId: 'vehicle-1',
        eventType: 'manual_verification',
        eventCategory: 'verified',
        sourceType: 'manual',
        sourceId: 'manual-1',
        occurredAt: new Date('2026-04-20T12:00:00.000Z'),
        verified: true,
        inspectionId: 'inspection-1',
        dedupeKey: 'manual:manual-1:verified',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propagates not found when the vehicle does not exist', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        {
          provide: VehicleLifecycleRepository,
          useValue: {
            replaceForVehicle: jest.fn(),
            findByVehicleId: jest.fn(),
            listSummariesByVehicleId: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockRejectedValue(new NotFoundException('Vehicle not found')),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
          },
        },
        {
          provide: InspectionsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
          },
        },
        {
          provide: JobOrdersRepository,
          useValue: {
            findByVehicleId: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: QualityGatesRepository,
          useValue: {
            findByJobOrderIds: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
        { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(service.findByVehicleId('missing-vehicle-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('queues lifecycle summary generation with reviewer-gated visibility', async () => {
    const vehicleLifecycleRepository = {
      replaceForVehicle: jest.fn().mockResolvedValue(undefined),
      listSummariesByVehicleId: jest.fn().mockResolvedValue([]),
      createSummary: jest.fn().mockResolvedValue({
        id: 'summary-1',
        vehicleId: 'vehicle-1',
        requestedByUserId: 'reviewer-1',
        summaryText: 'Lifecycle summary generation is queued and awaiting worker execution.',
        status: 'queued',
        generationJob: {
          queueName: 'ai-worker-jobs',
          jobName: 'generate-vehicle-lifecycle-summary',
          jobId: 'vehicle-lifecycle-summary:vehicle-1:2026-05-10T08:30:00.000Z',
          status: 'queued',
          requestedAt: '2026-05-10T08:30:00.000Z',
          attemptsAllowed: 3,
          attemptNumber: 0,
          startedAt: null,
          completedAt: null,
          failedAt: null,
          lastError: null,
        },
        customerVisible: false,
        customerVisibleAt: null,
        reviewNotes: null,
        reviewedByUserId: null,
        reviewedAt: null,
        provenance: {
          provider: 'ai-worker-placeholder',
          model: 'queued-summary-generation',
          promptVersion: 'vehicle-lifecycle.summary.v1',
          evidenceRefs: ['booking:1'],
          evidenceSummary:
            'Lifecycle evidence is queued for AI worker processing and remains hidden from customers until human review completes.',
        },
        createdAt: new Date('2026-05-10T08:30:00.000Z'),
        updatedAt: new Date('2026-05-10T08:30:00.000Z'),
      }),
    };

    const bookingsRepository = {
      findByVehicleId: jest.fn().mockResolvedValue([
        {
          id: 'booking-1',
          statusHistory: [
            {
              id: 'history-1',
              previousStatus: null,
              nextStatus: 'pending',
              reason: 'Booking created',
              changedByUserId: 'reviewer-1',
              changedAt: new Date('2026-05-10T08:00:00.000Z'),
            },
          ],
        },
      ]),
    };

    const inspectionsRepository = {
      findByVehicleId: jest.fn().mockResolvedValue([]),
    };

    const summaryProvider = {
      generate: jest.fn(),
    };

    const aiWorkerQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        { provide: VehicleLifecycleRepository, useValue: vehicleLifecycleRepository },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'vehicle-1',
              year: 2023,
              make: 'Toyota',
              model: 'Vios',
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'reviewer-1',
              role: 'service_adviser',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: InspectionsRepository, useValue: inspectionsRepository },
        { provide: JobOrdersRepository, useValue: { findByVehicleId: jest.fn().mockResolvedValue([]) } },
        { provide: QualityGatesRepository, useValue: { findByJobOrderIds: jest.fn().mockResolvedValue([]) } },
        { provide: VehicleLifecycleSummaryProviderService, useValue: summaryProvider },
        { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: aiWorkerQueue },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    const result = await service.generateLifecycleSummary('vehicle-1', {
      userId: 'reviewer-1',
      role: 'service_adviser',
    });

    expect(summaryProvider.generate).not.toHaveBeenCalled();
    expect(vehicleLifecycleRepository.createSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'vehicle-1',
        requestedByUserId: 'reviewer-1',
        status: 'queued',
      }),
    );
    expect(aiWorkerQueue.add).toHaveBeenCalledWith(
      'generate-vehicle-lifecycle-summary',
      expect.objectContaining({
        summaryId: 'summary-1',
        requestedAt: expect.any(String),
      }),
      expect.objectContaining({
        attempts: 3,
        jobId: expect.stringContaining('vehicle-lifecycle-summary:vehicle-1:'),
      }),
    );
    expect(result.status).toBe('queued');
    expect(result.customerVisible).toBe(false);
  });

  it('stores review metadata when approving a lifecycle summary', async () => {
    const vehicleLifecycleRepository = {
      listSummariesByVehicleId: jest.fn().mockResolvedValue([]),
      findSummaryById: jest.fn().mockResolvedValue({
        id: 'summary-1',
        vehicleId: 'vehicle-1',
        status: 'pending_review',
      }),
      reviewSummary: jest.fn().mockResolvedValue({
        id: 'summary-1',
        vehicleId: 'vehicle-1',
        requestedByUserId: 'reviewer-1',
        summaryText: 'Approved summary',
        status: 'approved',
        customerVisible: true,
        customerVisibleAt: new Date('2026-05-10T09:00:00.000Z'),
        reviewNotes: 'Approved for customer visibility.',
        reviewedByUserId: 'reviewer-1',
        reviewedAt: new Date('2026-05-10T09:00:00.000Z'),
        provenance: {
          provider: 'local-summary-adapter',
          model: 'timeline-summary-v1',
          promptVersion: 'vehicle-lifecycle.summary.v1',
          evidenceRefs: ['booking:1'],
          evidenceSummary: 'Safe timeline evidence only.',
        },
        createdAt: new Date('2026-05-10T08:30:00.000Z'),
        updatedAt: new Date('2026-05-10T09:00:00.000Z'),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        { provide: VehicleLifecycleRepository, useValue: vehicleLifecycleRepository },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'reviewer-1',
              role: 'service_adviser',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: JobOrdersRepository, useValue: { findByVehicleId: jest.fn().mockResolvedValue([]) } },
        { provide: QualityGatesRepository, useValue: { findByJobOrderIds: jest.fn().mockResolvedValue([]) } },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
        { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    const result = await service.reviewLifecycleSummary(
      'vehicle-1',
      'summary-1',
      {
        decision: 'approved',
        reviewNotes: 'Approved for customer visibility.',
      },
      {
        userId: 'reviewer-1',
        role: 'service_adviser',
      },
    );

    expect(vehicleLifecycleRepository.reviewSummary).toHaveBeenCalledWith(
      'summary-1',
      expect.objectContaining({
        status: 'approved',
        reviewedByUserId: 'reviewer-1',
        customerVisible: true,
      }),
    );
    expect(result.reviewedByUserId).toBe('reviewer-1');
    expect(result.customerVisible).toBe(true);
  });

  it('rejects lifecycle summary generation from non-reviewer roles', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        {
          provide: VehicleLifecycleRepository,
          useValue: {
            createSummary: jest.fn(),
            listSummariesByVehicleId: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn(),
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
        { provide: BookingsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: JobOrdersRepository, useValue: { findByVehicleId: jest.fn().mockResolvedValue([]) } },
        { provide: QualityGatesRepository, useValue: { findByJobOrderIds: jest.fn().mockResolvedValue([]) } },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
        { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(
      service.generateLifecycleSummary('vehicle-1', {
        userId: 'technician-1',
        role: 'technician',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects re-reviewing a lifecycle summary that already has a decision', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        {
          provide: VehicleLifecycleRepository,
          useValue: {
            listSummariesByVehicleId: jest.fn().mockResolvedValue([]),
            findSummaryById: jest.fn().mockResolvedValue({
              id: 'summary-1',
              vehicleId: 'vehicle-1',
              status: 'approved',
            }),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'reviewer-1',
              role: 'super_admin',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: JobOrdersRepository, useValue: { findByVehicleId: jest.fn().mockResolvedValue([]) } },
        { provide: QualityGatesRepository, useValue: { findByJobOrderIds: jest.fn().mockResolvedValue([]) } },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
        { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(
      service.reviewLifecycleSummary(
        'vehicle-1',
        'summary-1',
        {
          decision: 'rejected',
          reviewNotes: 'Needs revision.',
        },
        {
          userId: 'reviewer-1',
          role: 'super_admin',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
