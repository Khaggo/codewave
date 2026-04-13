import type { ApiErrorResponse } from '../shared';

export const backJobsErrorCases: Record<string, ApiErrorResponse[]> = {
  createBackJob: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only service advisers or super admins can open back-job cases.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Original job-order lineage does not match the submitted customer or vehicle.',
      source: 'swagger',
    },
  ],
  getBackJobById: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only the owning customer or staff reviewers can access this case.',
      source: 'swagger',
    },
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Back job not found.',
      source: 'swagger',
    },
  ],
  updateBackJobStatus: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only service advisers or super admins can review back-job status.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'The requested back-job transition or evidence linkage is not allowed.',
      source: 'swagger',
    },
  ],
  getVehicleBackJobs: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only the owning customer or staff reviewers can access this history.',
      source: 'swagger',
    },
  ],
};
