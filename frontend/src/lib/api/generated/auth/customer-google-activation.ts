import { authRoutes, type GoogleSignupStartRequest, type VerifyEmailOtpRequest } from './requests';
import type { AuthSessionResponse, GoogleSignupStartResponse } from './responses';
import type { ApiErrorResponse, RouteContract } from '../shared';

export type CustomerGoogleActivationState =
  | 'google_identity_required'
  | 'starting_google_signup'
  | 'pending_email_otp'
  | 'resend_by_restart'
  | 'otp_invalid'
  | 'otp_expired'
  | 'duplicate_identity_blocked'
  | 'activation_context_mismatch'
  | 'active_session_issued'
  | 'profile_onboarding_handoff'
  | 'vehicle_onboarding_handoff'
  | 'onboarding_complete';

export type CustomerGoogleActivationTruth =
  | 'synchronous-auth-record'
  | 'client-guard'
  | 'cross-domain-handoff';

export interface CustomerGoogleActivationStateRule {
  state: CustomerGoogleActivationState;
  surface: 'customer-mobile';
  truth: CustomerGoogleActivationTruth;
  routeKey: 'googleSignupStart' | 'googleSignupVerifyEmail';
  description: string;
}

export interface CustomerGoogleActivationRoutePack {
  primaryRoutes: readonly RouteContract[];
  legacyCompatibilityRoutes: readonly RouteContract[];
  resendStrategy: {
    kind: 'restart-google-signup';
    route: RouteContract;
    notes: string;
  };
}

export interface CustomerGoogleActivationRequestPack {
  start: GoogleSignupStartRequest;
  verifyEmail: VerifyEmailOtpRequest;
}

export interface CustomerGoogleActivationResponsePack {
  start: GoogleSignupStartResponse;
  verifyEmail: AuthSessionResponse;
}

export interface CustomerGoogleActivationHandoffState {
  state: Extract<
    CustomerGoogleActivationState,
    'active_session_issued' | 'profile_onboarding_handoff' | 'vehicle_onboarding_handoff' | 'onboarding_complete'
  >;
  nextRoute: 'ProfileOnboarding' | 'VehicleOnboarding' | 'CustomerHome';
  description: string;
}

export const customerGoogleActivationRoutePack: CustomerGoogleActivationRoutePack = {
  primaryRoutes: [authRoutes.googleSignupStart, authRoutes.googleSignupVerifyEmail],
  legacyCompatibilityRoutes: [authRoutes.register, authRoutes.registerVerifyEmail],
  resendStrategy: {
    kind: 'restart-google-signup',
    route: authRoutes.googleSignupStart,
    notes:
      'There is no live resend endpoint. Mobile resend must restart Google signup, replace the stale enrollmentId, and avoid inventing backend cooldown rules.',
  },
};

export const customerGoogleActivationStateRules: CustomerGoogleActivationStateRule[] = [
  {
    state: 'google_identity_required',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'googleSignupStart',
    description: 'Customer must supply a valid Google ID token before activation can begin.',
  },
  {
    state: 'starting_google_signup',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'googleSignupStart',
    description: 'The client is submitting Google proof and waiting for a pending activation enrollment.',
  },
  {
    state: 'pending_email_otp',
    surface: 'customer-mobile',
    truth: 'synchronous-auth-record',
    routeKey: 'googleSignupStart',
    description: 'Auth created or resumed a pending activation and sent an email OTP tied to the latest enrollmentId.',
  },
  {
    state: 'resend_by_restart',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'googleSignupStart',
    description: 'Resend is modeled as a fresh start request, not as a hidden resend API or backend countdown contract.',
  },
  {
    state: 'otp_invalid',
    surface: 'customer-mobile',
    truth: 'synchronous-auth-record',
    routeKey: 'googleSignupVerifyEmail',
    description: 'The submitted OTP does not match the active enrollment challenge.',
  },
  {
    state: 'otp_expired',
    surface: 'customer-mobile',
    truth: 'synchronous-auth-record',
    routeKey: 'googleSignupVerifyEmail',
    description: 'The pending enrollment exists but its OTP has expired and the user must restart activation.',
  },
  {
    state: 'duplicate_identity_blocked',
    surface: 'customer-mobile',
    truth: 'synchronous-auth-record',
    routeKey: 'googleSignupStart',
    description: 'The Google identity or email is already linked to another AUTOCARE account and the flow must stop.',
  },
  {
    state: 'activation_context_mismatch',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'googleSignupVerifyEmail',
    description: 'The local OTP screen no longer matches the latest enrollment context and the flow must be restarted rather than guessing server-side behavior.',
  },
  {
    state: 'active_session_issued',
    surface: 'customer-mobile',
    truth: 'synchronous-auth-record',
    routeKey: 'googleSignupVerifyEmail',
    description: 'OTP verification succeeded and auth issued an active customer session with tokens.',
  },
  {
    state: 'profile_onboarding_handoff',
    surface: 'customer-mobile',
    truth: 'cross-domain-handoff',
    routeKey: 'googleSignupVerifyEmail',
    description: 'The active session continues into customer profile completion in the users domain.',
  },
  {
    state: 'vehicle_onboarding_handoff',
    surface: 'customer-mobile',
    truth: 'cross-domain-handoff',
    routeKey: 'googleSignupVerifyEmail',
    description: 'The active session continues into first-vehicle capture in the vehicles domain.',
  },
  {
    state: 'onboarding_complete',
    surface: 'customer-mobile',
    truth: 'cross-domain-handoff',
    routeKey: 'googleSignupVerifyEmail',
    description: 'Profile and first-vehicle handoff steps are complete and the customer can enter the home surface.',
  },
];

export const customerGoogleActivationDuplicateIdentityError: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Google identity is already linked to an account.',
  source: 'task',
};

export const customerGoogleActivationEmailRegisteredError: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Email is already registered.',
  source: 'task',
};

export const customerGoogleActivationInvalidOtpError: ApiErrorResponse = {
  statusCode: 400,
  code: 'BAD_REQUEST',
  message: 'Invalid OTP.',
  source: 'swagger',
};

export const customerGoogleActivationExpiredOtpError: ApiErrorResponse = {
  statusCode: 400,
  code: 'BAD_REQUEST',
  message: 'OTP has expired.',
  source: 'task',
};

export const customerGoogleActivationEnrollmentMissingError: ApiErrorResponse = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'OTP enrollment not found.',
  source: 'swagger',
};

export const customerGoogleActivationMismatchError: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message:
    'Activation session no longer matches the latest enrollment context. Restart Google signup to request a new code.',
  source: 'task',
};

export const customerGoogleActivationErrorCases = {
  start: [
    customerGoogleActivationEmailRegisteredError,
    customerGoogleActivationDuplicateIdentityError,
  ],
  verify: [
    customerGoogleActivationInvalidOtpError,
    customerGoogleActivationExpiredOtpError,
    customerGoogleActivationEnrollmentMissingError,
  ],
  localGuards: [customerGoogleActivationMismatchError],
} as const;

export const customerGoogleActivationHandoffStates: CustomerGoogleActivationHandoffState[] = [
  {
    state: 'active_session_issued',
    nextRoute: 'ProfileOnboarding',
    description: 'Successful OTP verification issues tokens and hands the customer into profile completion.',
  },
  {
    state: 'profile_onboarding_handoff',
    nextRoute: 'VehicleOnboarding',
    description: 'Profile completion keeps the active session and advances into first-vehicle capture.',
  },
  {
    state: 'vehicle_onboarding_handoff',
    nextRoute: 'CustomerHome',
    description: 'Vehicle capture completes the activation continuation and unlocks the customer home surface.',
  },
  {
    state: 'onboarding_complete',
    nextRoute: 'CustomerHome',
    description: 'The customer can safely continue into booking, insurance, loyalty, and other active-session flows.',
  },
];
