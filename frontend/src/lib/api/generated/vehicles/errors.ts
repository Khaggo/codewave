import type { ApiErrorResponse } from '../shared';

export const vehiclesErrorCases: Record<string, ApiErrorResponse[]> = {
  createVehicle: [
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The submitted vehicle payload is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'User not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Vehicle plate number already exists.',
      source: 'swagger',
    },
  ],
  getVehicleById: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Vehicle not found.',
      source: 'swagger',
    },
  ],
  updateVehicle: [
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The submitted vehicle update payload is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Vehicle not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Vehicle plate number already exists.',
      source: 'swagger',
    },
  ],
  listVehiclesByUser: [],
};
