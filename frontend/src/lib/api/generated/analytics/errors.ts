import type { ApiErrorResponse } from '../shared';

export const analyticsForbiddenError: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Only service advisers or super admins can access admin analytics dashboards.',
  source: 'swagger',
};

export const analyticsUnauthorizedError: ApiErrorResponse = {
  statusCode: 401,
  code: 'UNAUTHORIZED',
  message: 'Missing or invalid access token.',
  source: 'swagger',
};
