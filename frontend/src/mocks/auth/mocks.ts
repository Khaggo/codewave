import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type {
  AuthSessionResponse,
  AuthenticatedUserResponse,
  GoogleSignupStartResponse,
  RegisterStartResponse,
} from '../../lib/api/generated/auth/responses';

export const registerStartMock: RegisterStartResponse = {
  enrollmentId: 'aa94ac26-0c26-4d61-aad8-c50af70b5384',
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  maskedEmail: 'cu***@example.com',
  otpExpiresAt: '2026-04-13T18:45:00.000Z',
  status: 'pending_activation',
};

export const googleSignupStartMock: GoogleSignupStartResponse = {
  enrollmentId: 'f9e31f73-32d9-4c2f-8f8c-6cc5acbff1da',
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  maskedEmail: 'gi***@example.com',
  otpExpiresAt: '2026-04-13T18:45:00.000Z',
  status: 'pending_activation',
};

export const staffActivationStartMock: GoogleSignupStartResponse = {
  enrollmentId: '9b72ab7c-0527-4b29-9321-ec825fddf5e8',
  userId: '5a74bb08-9b6a-4c08-8b97-3b6a3a1b2d88',
  maskedEmail: 'st***@example.com',
  otpExpiresAt: '2026-04-13T18:50:00.000Z',
  status: 'pending_activation',
};

export const authSessionMock: AuthSessionResponse = {
  accessToken: 'access-token-placeholder',
  refreshToken: 'refresh-token-placeholder',
  user: {
    id: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
    email: 'customer@example.com',
    role: 'customer',
    staffCode: null,
    isActive: true,
  },
};

export const authenticatedUserMock: AuthenticatedUserResponse = {
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  email: 'customer@example.com',
  role: 'customer',
};

export const authInvalidOtpMock: ApiErrorResponse = {
  statusCode: 400,
  code: 'BAD_REQUEST',
  message: 'Invalid OTP.',
  source: 'swagger',
};
