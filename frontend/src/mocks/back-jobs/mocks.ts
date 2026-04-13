import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type { BackJobResponse } from '../../lib/api/generated/back-jobs/responses';

export const backJobDetailMock: BackJobResponse = {
  id: 'd6eaf1eb-6502-44fd-b1db-2e49f37ad6c6',
  customerUserId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  vehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  originalBookingId: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  originalJobOrderId: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  returnInspectionId: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
  reworkJobOrderId: '0bbfa364-4d50-4b8e-b307-2b2e89903340',
  complaint: 'Leak returned after the previous repair.',
  status: 'in_progress',
  reviewNotes: 'Approved for warranty rework after return inspection review.',
  resolutionNotes: null,
  createdByUserId: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
  findings: [
    {
      id: 'f6adbc0a-7d37-4f14-a2b4-ef905e8ab7ac',
      backJobId: 'd6eaf1eb-6502-44fd-b1db-2e49f37ad6c6',
      category: 'engine',
      label: 'Leak still present around the original repair area',
      severity: 'high',
      notes: 'Return inspection matched the original complaint.',
      isValidated: true,
      createdAt: '2026-04-21T10:00:00.000Z',
      updatedAt: '2026-04-21T10:00:00.000Z',
    },
  ],
  createdAt: '2026-04-21T09:45:00.000Z',
  updatedAt: '2026-04-21T10:15:00.000Z',
};

export const backJobLineageConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Original job-order lineage does not match the submitted customer or vehicle.',
  source: 'swagger',
};
