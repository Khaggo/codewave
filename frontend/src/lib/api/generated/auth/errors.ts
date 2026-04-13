import type { ApiErrorResponse } from '../shared';

export const authErrorCases: Record<string, ApiErrorResponse[]> = {
  register: [
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Email is already registered.',
      source: 'swagger',
    },
  ],
  registerVerifyEmail: [
    {
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Invalid OTP.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'OTP has already been used.',
      source: 'swagger',
    },
  ],
  googleSignupStart: [
    {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Invalid Google ID token.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Google identity is already linked to an account.',
      source: 'swagger',
    },
  ],
  googleSignupVerifyEmail: [
    {
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Invalid OTP.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'OTP has already been used.',
      source: 'swagger',
    },
  ],
  staffActivationVerifyEmail: [
    {
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Invalid OTP.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'OTP has already been used.',
      source: 'swagger',
    },
  ],
};
