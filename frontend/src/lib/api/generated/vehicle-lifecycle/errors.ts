import type { ApiErrorResponse } from '../shared';

export const lifecycleSummaryForbiddenError: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Only service advisers or super admins can manage lifecycle summaries.',
  source: 'swagger',
};

export const lifecycleSummaryConflictError: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Vehicle lifecycle summary is not ready for review or has already been reviewed.',
  source: 'swagger',
};
