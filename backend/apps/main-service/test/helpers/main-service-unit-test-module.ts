import { Test as NestTest } from '@nestjs/testing';

import { StaffWorkQueuesService } from '@main-modules/staff-work-queues/services/staff-work-queues.service';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';

const staffWorkQueuesProvider = () => ({
  provide: StaffWorkQueuesService,
  useValue: {
    completeClaim: jest.fn().mockResolvedValue(null),
  },
});

const inspectionsRepositoryProvider = () => ({
  provide: InspectionsRepository,
  useValue: {
    findById: jest.fn().mockResolvedValue(null),
  },
});

export const ServiceTest = {
  createTestingModule(
    metadata: Parameters<typeof NestTest.createTestingModule>[0],
  ) {
    return NestTest.createTestingModule({
      ...metadata,
      providers: [
        staffWorkQueuesProvider(),
        inspectionsRepositoryProvider(),
        ...(metadata.providers ?? []),
      ],
    });
  },
};
