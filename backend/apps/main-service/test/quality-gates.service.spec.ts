import { ConflictException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';

import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { QUALITY_GATES_QUEUE_NAME } from '@main-modules/quality-gates/quality-gates.constants';
import { QualityGatesRepository } from '@main-modules/quality-gates/repositories/quality-gates.repository';
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
        { provide: QualityGatesRepository, useValue: qualityGatesRepository },
        {
          provide: JobOrdersRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'job-order-1',
              status: 'ready_for_qa',
              items: [{ id: 'item-1', isCompleted: false }],
              progressEntries: [],
              assignments: [],
            }),
          },
        },
        { provide: UsersService, useValue: { findById: jest.fn() } },
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

  it('prevents release when the quality gate remains blocked', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        QualityGatesService,
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
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: getQueueToken(QUALITY_GATES_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(QualityGatesService);

    await expect(service.assertReleaseAllowed('job-order-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
