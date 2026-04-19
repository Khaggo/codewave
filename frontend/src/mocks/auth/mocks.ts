import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import {
  customerGoogleActivationDuplicateIdentityError,
  customerGoogleActivationEmailRegisteredError,
  customerGoogleActivationEnrollmentMissingError,
  customerGoogleActivationErrorCases,
  customerGoogleActivationExpiredOtpError,
  customerGoogleActivationHandoffStates,
  customerGoogleActivationMismatchError,
  customerGoogleActivationRoutePack,
  customerGoogleActivationStateRules,
} from '../../lib/api/generated/auth/customer-google-activation';
import { sharedIdentityStateGlossary } from '../../lib/api/generated/auth/identity-foundation';
import {
  staffPortalBlockedStateErrors,
  staffPortalNavigationRules,
  staffPortalRoleCapabilities,
  staffPortalSessionRoutes,
  staffPortalStateRules,
} from '../../lib/api/generated/auth/staff-web-session';
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

export const deactivatedAuthSessionMock: AuthSessionResponse = {
  accessToken: 'access-token-deactivated',
  refreshToken: 'refresh-token-deactivated',
  user: {
    id: 'b7137c9a-cb5d-4d37-b313-cbf779ce9d3a',
    email: 'deactivated.staff@example.com',
    role: 'service_adviser',
    staffCode: 'SA-0098',
    isActive: false,
  },
};

export const technicianAuthSessionMock: AuthSessionResponse = {
  accessToken: 'access-token-technician',
  refreshToken: 'refresh-token-technician',
  user: {
    id: 'technician-user-1',
    email: 'technician@example.com',
    role: 'technician',
    staffCode: 'TECH-0021',
    isActive: true,
  },
};

export const serviceAdviserAuthSessionMock: AuthSessionResponse = {
  accessToken: 'access-token-adviser',
  refreshToken: 'refresh-token-adviser',
  user: {
    id: 'service-adviser-user-1',
    email: 'service.adviser@example.com',
    role: 'service_adviser',
    staffCode: 'SA-0048',
    isActive: true,
  },
};

export const superAdminAuthSessionMock: AuthSessionResponse = {
  accessToken: 'access-token-super-admin',
  refreshToken: 'refresh-token-super-admin',
  user: {
    id: 'super-admin-user-1',
    email: 'super.admin@example.com',
    role: 'super_admin',
    staffCode: 'SA-9001',
    isActive: true,
  },
};

export const sharedIdentityStateGlossaryMock = sharedIdentityStateGlossary;

export const customerGoogleActivationRoutePackMock = customerGoogleActivationRoutePack;

export const customerGoogleActivationStateRulesMock = customerGoogleActivationStateRules;

export const customerGoogleActivationStartMock = googleSignupStartMock;

export const customerGoogleActivationDuplicateIdentityMock =
  customerGoogleActivationDuplicateIdentityError;

export const customerGoogleActivationEmailRegisteredMock =
  customerGoogleActivationEmailRegisteredError;

export const customerGoogleActivationExpiredOtpMock = customerGoogleActivationExpiredOtpError;

export const customerGoogleActivationEnrollmentMissingMock =
  customerGoogleActivationEnrollmentMissingError;

export const customerGoogleActivationMismatchMock = customerGoogleActivationMismatchError;

export const customerGoogleActivationErrorCasesMock = customerGoogleActivationErrorCases;

export const customerGoogleActivationHandoffMock = customerGoogleActivationHandoffStates;

export const staffPortalSessionRoutesMock = staffPortalSessionRoutes;

export const staffPortalStateRulesMock = staffPortalStateRules;

export const staffPortalNavigationRulesMock = staffPortalNavigationRules;

export const staffPortalRoleCapabilitiesMock = staffPortalRoleCapabilities;

export const staffPortalBlockedStateErrorsMock = staffPortalBlockedStateErrors;
