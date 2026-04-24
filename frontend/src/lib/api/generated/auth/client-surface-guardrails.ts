import type { ApiErrorResponse } from '../shared';
import {
  getStaffPortalAccessState,
  getStaffPortalNavigationForRole,
  isActiveStaffPortalState,
  staffPortalNavigationRules,
  staffPortalNavigationVisibilityByPath,
  staffPortalStateMessages,
  type StaffPortalAccessState,
  type StaffPortalNavigationRule,
  type StaffPortalRole,
} from './staff-web-session';

export type CanonicalClientRole =
  | 'customer'
  | 'technician'
  | 'service_adviser'
  | 'super_admin';

export type ClientSurface = 'customer-mobile' | 'staff-admin-web';

export type CustomerMobileProtectedScreen =
  | 'CompleteOnboarding'
  | 'Menu'
  | 'ManageProfile'
  | 'ChangePassword'
  | 'InsuranceInquiryScreen';

export type CustomerMobilePublicScreen =
  | 'Landing'
  | 'Register'
  | 'Login'
  | 'OTP'
  | 'ForgotPasswordEmail'
  | 'ForgotPasswordOTP'
  | 'ResetPassword'
  | 'BookingScreen'
  | 'VehicleLifecycleScreen'
  | 'StoreScreen'
  | 'ChatbotScreen';

export type CustomerMobileScreen =
  | CustomerMobileProtectedScreen
  | CustomerMobilePublicScreen;

export type CustomerMobileAccessState =
  | 'public_guest'
  | 'customer_session_active'
  | 'unauthorized_session'
  | 'staff_session_blocked'
  | 'deactivated_customer_blocked'
  | 'forbidden_navigation';

export interface ClientSurfaceNavigationMatrixEntry {
  role: CanonicalClientRole;
  surface: ClientSurface;
  access: 'allowed' | 'blocked';
  navigationTargets: string[];
  notes: string;
}

export interface StaffPortalRouteGuardDecision {
  status: 'allowed' | 'blocked';
  accessState: StaffPortalAccessState | 'path_not_listed';
  pathname: string;
  message: string;
  allowedNavigation: StaffPortalNavigationRule[];
  fallbackHref: string | null;
}

export interface CustomerMobileScreenGuardDecision {
  status: 'allowed' | 'blocked';
  accessState: CustomerMobileAccessState;
  screenName: CustomerMobileScreen;
  message: string;
}

export interface CustomerMobileSessionLike {
  userId?: string | null;
  accessToken?: string | null;
  role?: string | null;
  isActive?: boolean | null;
}

export const customerMobileProtectedScreens: CustomerMobileProtectedScreen[] = [
  'CompleteOnboarding',
  'Menu',
  'ManageProfile',
  'ChangePassword',
  'InsuranceInquiryScreen',
];

export const customerMobilePublicScreens: CustomerMobilePublicScreen[] = [
  'Landing',
  'Register',
  'Login',
  'OTP',
  'ForgotPasswordEmail',
  'ForgotPasswordOTP',
  'ResetPassword',
  'BookingScreen',
  'VehicleLifecycleScreen',
  'StoreScreen',
  'ChatbotScreen',
];

export const customerMobileStateMessages: Record<
  Exclude<CustomerMobileAccessState, 'public_guest' | 'customer_session_active'>,
  string
> = {
  unauthorized_session:
    'Sign in with a customer account before opening that mobile workspace.',
  staff_session_blocked:
    'This mobile app is for customer accounts only. Staff roles should use the web portal.',
  deactivated_customer_blocked:
    'This customer account is deactivated. Contact support if access should be restored.',
  forbidden_navigation:
    'That mobile workspace is only available to signed-in customers.',
};

export const clientSurfaceNavigationMatrix: ClientSurfaceNavigationMatrixEntry[] = [
  {
    role: 'customer',
    surface: 'customer-mobile',
    access: 'allowed',
    navigationTargets: customerMobileProtectedScreens,
    notes:
      'Customers may use the protected mobile account, onboarding retry, insurance intake, and dashboard surfaces.',
  },
  {
    role: 'customer',
    surface: 'staff-admin-web',
    access: 'blocked',
    navigationTargets: [],
    notes:
      'Customers must never remain in the staff/admin web portal after authentication succeeds.',
  },
  {
    role: 'technician',
    surface: 'staff-admin-web',
    access: 'allowed',
    navigationTargets: getStaffPortalNavigationForRole('technician').map(
      (entry) => entry.href,
    ),
    notes:
      'Technicians may use the limited staff web routes needed for assigned operational work.',
  },
  {
    role: 'technician',
    surface: 'customer-mobile',
    access: 'blocked',
    navigationTargets: [],
    notes:
      'Technician identities must not open customer-owned mobile account surfaces.',
  },
  {
    role: 'service_adviser',
    surface: 'staff-admin-web',
    access: 'allowed',
    navigationTargets: getStaffPortalNavigationForRole('service_adviser').map(
      (entry) => entry.href,
    ),
    notes:
      'Service advisers may use operational and coordination web routes but not super-admin-only pages.',
  },
  {
    role: 'service_adviser',
    surface: 'customer-mobile',
    access: 'blocked',
    navigationTargets: [],
    notes:
      'Service adviser identities must not use customer-mobile protected routes.',
  },
  {
    role: 'super_admin',
    surface: 'staff-admin-web',
    access: 'allowed',
    navigationTargets: getStaffPortalNavigationForRole('super_admin').map(
      (entry) => entry.href,
    ),
    notes:
      'Super admins may access all current staff/admin routes, including provisioning and protected administration.',
  },
  {
    role: 'super_admin',
    surface: 'customer-mobile',
    access: 'blocked',
    navigationTargets: [],
    notes:
      'Super-admin identities remain web-owned and must not consume customer-mobile protected routes.',
  },
];

export const getStaffPortalRouteGuardDecision = ({
  pathname,
  sessionUser,
}: {
  pathname: string;
  sessionUser?: { role?: string | null; isActive?: boolean | null } | null;
}): StaffPortalRouteGuardDecision => {
  const accessState = getStaffPortalAccessState(sessionUser);
  const allowedNavigation = getStaffPortalNavigationForRole(sessionUser?.role);

  if (!isActiveStaffPortalState(accessState)) {
    return {
      status: 'blocked',
      accessState,
      pathname,
      message:
        staffPortalStateMessages[accessState] ??
        'That web workspace is unavailable for the current session.',
      allowedNavigation,
      fallbackHref: null,
    };
  }

  const visibleTo = staffPortalNavigationVisibilityByPath[pathname];
  if (!visibleTo) {
    return {
      status: 'allowed',
      accessState: 'path_not_listed',
      pathname,
      message: '',
      allowedNavigation,
      fallbackHref: null,
    };
  }

  if (visibleTo.includes(sessionUser?.role as StaffPortalRole)) {
    return {
      status: 'allowed',
      accessState,
      pathname,
      message: '',
      allowedNavigation,
      fallbackHref: null,
    };
  }

  return {
    status: 'blocked',
    accessState: 'forbidden_navigation',
    pathname,
    message: staffPortalStateMessages.forbidden_navigation,
    allowedNavigation,
    fallbackHref: allowedNavigation[0]?.href ?? null,
  };
};

export const getCustomerMobileAccessState = (
  session: CustomerMobileSessionLike | null | undefined,
): CustomerMobileAccessState => {
  if (!session?.accessToken || !session?.userId) {
    return 'unauthorized_session';
  }

  if (session.role && session.role !== 'customer') {
    return 'staff_session_blocked';
  }

  if (session.isActive === false) {
    return 'deactivated_customer_blocked';
  }

  return 'customer_session_active';
};

export const getCustomerMobileScreenGuardDecision = ({
  screenName,
  session,
}: {
  screenName: CustomerMobileScreen;
  session?: CustomerMobileSessionLike | null;
}): CustomerMobileScreenGuardDecision => {
  if (customerMobilePublicScreens.includes(screenName as CustomerMobilePublicScreen)) {
    return {
      status: 'allowed',
      accessState: 'public_guest',
      screenName,
      message: '',
    };
  }

  const accessState = getCustomerMobileAccessState(session);
  if (accessState === 'customer_session_active') {
    return {
      status: 'allowed',
      accessState,
      screenName,
      message: '',
    };
  }

  return {
    status: 'blocked',
    accessState,
    screenName,
    message:
      customerMobileStateMessages[accessState] ??
      customerMobileStateMessages.forbidden_navigation,
  };
};

export const customerMobileBlockedStateErrors: Record<
  'unauthorized' | 'staff' | 'deactivated' | 'forbidden',
  ApiErrorResponse
> = {
  unauthorized: {
    statusCode: 401,
    code: 'UNAUTHORIZED',
    message: customerMobileStateMessages.unauthorized_session,
    source: 'task',
  },
  staff: {
    statusCode: 403,
    code: 'FORBIDDEN',
    message: customerMobileStateMessages.staff_session_blocked,
    source: 'task',
  },
  deactivated: {
    statusCode: 403,
    code: 'FORBIDDEN',
    message: customerMobileStateMessages.deactivated_customer_blocked,
    source: 'task',
  },
  forbidden: {
    statusCode: 403,
    code: 'FORBIDDEN',
    message: customerMobileStateMessages.forbidden_navigation,
    source: 'task',
  },
};

export const clientSurfaceGuardrailContractSources = [
  'docs/architecture/rbac-policy.md',
  'docs/architecture/tasks/05-client-integration/T529-client-rbac-navigation-and-surface-guardrails.md',
  'docs/team-flow-customer-mobile-lifecycle.md',
  'docs/team-flow-staff-admin-web-lifecycle.md',
  'frontend/src/lib/api/generated/auth/staff-web-session.ts',
  'frontend/src/components/layout/AppShell.js',
  'mobile/src/lib/authClient.js',
  'mobile/App.js',
] as const;

export const clientSurfaceGuardrailMatrixSources = {
  staffPortalNavigationRules,
  customerMobileProtectedScreens,
  customerMobilePublicScreens,
} as const;
