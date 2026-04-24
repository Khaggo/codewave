import type { ApiErrorResponse } from '../shared';

export const inspectionsErrorCases: Record<string, ApiErrorResponse[]> = {
  createInspection: [
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The inspection payload is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Completion inspections require at least one finding',
      source: 'swagger',
    },
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Vehicle or booking not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Booking does not belong to the target vehicle',
      source: 'swagger',
    },
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Your role does not have access to the inspection workspace in the staff portal.',
      source: 'task',
    },
  ],
  listInspectionsByVehicle: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Vehicle not found.',
      source: 'swagger',
    },
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Your role does not have access to the inspection workspace in the staff portal.',
      source: 'task',
    },
  ],
};
