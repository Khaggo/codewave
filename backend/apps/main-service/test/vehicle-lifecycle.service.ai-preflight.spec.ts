import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';

import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { QualityGatesRepository } from '@main-modules/quality-gates/repositories/quality-gates.repository';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehicleLifecycleRepository } from '@main-modules/vehicle-lifecycle/repositories/vehicle-lifecycle.repository';
import { VehicleLifecycleService } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle.service';
import {
  AI_SUMMARY_UNAVAILABLE_CODE,
  AiSummaryConfig,
} from '@main-modules/vehicle-lifecycle/services/ai-summary-config';
import { VehicleLifecycleSummaryProviderService } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle-summary-provider.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';
import { AI_WORKER_QUEUE_NAME } from '@shared/queue/ai-worker.constants';

describe('VehicleLifecycleService AI preflight', () => {
  it('returns AI_SUMMARY_UNAVAILABLE before creating a draft when disabled', async () => {
    const repository = {
      createSummary: jest.fn(),
    };
    const disabledConfig: AiSummaryConfig = {
      provider: 'disabled',
      baseUrl: null,
      model: null,
      apiKey: null,
      timeoutMs: 50,
      maxOutputChars: 1_200,
      maxEvidenceEvents: 50,
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        { provide: VehicleLifecycleRepository, useValue: repository },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'reviewer-1',
              isActive: true,
            }),
          },
        },
        { provide: VehiclesService, useValue: { findById: jest.fn() } },
        { provide: BookingsRepository, useValue: {} },
        { provide: InspectionsRepository, useValue: {} },
        { provide: JobOrdersRepository, useValue: {} },
        { provide: QualityGatesRepository, useValue: {} },
        {
          provide: VehicleLifecycleSummaryProviderService,
          useValue: new VehicleLifecycleSummaryProviderService(disabledConfig),
        },
        { provide: getQueueToken(AI_WORKER_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(
      service.generateLifecycleSummary('vehicle-1', {
        userId: 'reviewer-1',
        role: 'service_adviser',
      }),
    ).rejects.toMatchObject({
      response: {
        code: AI_SUMMARY_UNAVAILABLE_CODE,
      },
      status: 503,
    });
    expect(repository.createSummary).not.toHaveBeenCalled();
  });
});
