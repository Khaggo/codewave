import { ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';

import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { QualityGatesRepository } from '@main-modules/quality-gates/repositories/quality-gates.repository';
import { QualityGateDiscrepancyEngineService } from '@main-modules/quality-gates/services/quality-gate-discrepancy-engine.service';
import { QualityGateSemanticAuditorService } from '@main-modules/quality-gates/services/quality-gate-semantic-auditor.service';
import { QualityGatesService } from '@main-modules/quality-gates/services/quality-gates.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { AI_WORKER_QUEUE_NAME } from '@shared/queue/ai-worker.constants';
import { ServiceTest as Test } from './helpers/main-service-unit-test-module';

describe('QualityGatesService authorization', () => {
  it('rejects manual override attempts from non-super-admin staff', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        QualityGatesService,
        QualityGateDiscrepancyEngineService,
        QualityGateSemanticAuditorService,
        { provide: QualityGatesRepository, useValue: { findOptionalByJobOrderId: jest.fn() } },
        { provide: JobOrdersRepository, useValue: { findById: jest.fn() } },
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
        { provide: AutocareEventBusService, useValue: { publish: jest.fn() } },
        { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(QualityGatesService);

    await expect(
      service.overrideBlockedGate(
        'job-order-1',
        { reason: 'Trying to bypass QA without approval.' },
        { userId: 'adviser-1', role: 'service_adviser' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
