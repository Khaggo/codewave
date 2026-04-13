import type { ApiErrorResponse } from '../shared';

export const qualityGatesErrorCases: Record<string, ApiErrorResponse[]> = {
  getJobOrderQualityGate: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only assigned technicians or staff reviewers can access this quality gate.',
      source: 'swagger',
    },
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Job order or quality-gate actor not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'The job order has not entered QA yet.',
      source: 'swagger',
    },
  ],
  overrideJobOrderQualityGate: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only super admins can approve manual quality-gate overrides.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'The quality gate is unavailable or is not currently blocked.',
      source: 'swagger',
    },
  ],
};
