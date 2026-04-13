import type { RouteContract } from '../shared';

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RegisterVerifyEmailRequest {
  enrollmentId: string;
  otp: string;
}

export interface GoogleSignupStartRequest {
  googleIdToken: string;
}

export interface VerifyEmailOtpRequest {
  enrollmentId: string;
  otp: string;
}

export const authRoutes: Record<string, RouteContract> = {
  register: {
    method: 'POST',
    path: '/api/auth/register',
    status: 'live',
    source: 'swagger',
    notes: 'Starts password-based customer signup and sends an email OTP. Tokens are issued only after /api/auth/register/verify-email succeeds.',
  },
  registerVerifyEmail: {
    method: 'POST',
    path: '/api/auth/register/verify-email',
    status: 'live',
    source: 'swagger',
  },
  login: {
    method: 'POST',
    path: '/api/auth/login',
    status: 'live',
    source: 'swagger',
  },
  refresh: {
    method: 'POST',
    path: '/api/auth/refresh',
    status: 'live',
    source: 'swagger',
  },
  me: {
    method: 'GET',
    path: '/api/auth/me',
    status: 'live',
    source: 'swagger',
  },
  googleSignupStart: {
    method: 'POST',
    path: '/api/auth/google/signup/start',
    status: 'live',
    source: 'swagger',
  },
  googleSignupVerifyEmail: {
    method: 'POST',
    path: '/api/auth/google/signup/verify-email',
    status: 'live',
    source: 'swagger',
  },
  staffActivationStart: {
    method: 'POST',
    path: '/api/auth/staff-activation/google/start',
    status: 'live',
    source: 'swagger',
  },
  staffActivationVerifyEmail: {
    method: 'POST',
    path: '/api/auth/staff-activation/verify-email',
    status: 'live',
    source: 'swagger',
  },
};
