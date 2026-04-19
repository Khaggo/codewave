import type { ApiErrorResponse } from '../shared';

export const usersErrorCases: Record<string, ApiErrorResponse[]> = {
  createUser: [
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The submitted user payload is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'A user with the same email already exists.',
      source: 'swagger',
    },
  ],
  getUserById: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'User not found.',
      source: 'swagger',
    },
  ],
  updateUser: [
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The submitted update payload is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'User not found.',
      source: 'swagger',
    },
  ],
  listAddresses: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'User not found.',
      source: 'swagger',
    },
  ],
  addAddress: [
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The submitted address payload is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'User not found.',
      source: 'swagger',
    },
  ],
  updateAddress: [
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The submitted address update payload is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Address not found.',
      source: 'swagger',
    },
  ],
};

