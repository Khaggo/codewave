import { authRoutes } from './requests';
import type { ApiErrorResponse, RouteContract } from '../shared';

export type StaffPortalRole = 'technician' | 'service_adviser' | 'super_admin';

export type StaffPortalAccessState =
  | 'unauthenticated'
  | 'login_submitting'
  | 'session_restoring'
  | 'technician_session_active'
  | 'service_adviser_session_active'
  | 'super_admin_session_active'
  | 'customer_blocked'
  | 'pending_staff_blocked'
  | 'deactivated_staff_blocked'
  | 'forbidden_navigation'
  | 'session_restore_failed';

export type StaffPortalTruth = 'synchronous-auth-record' | 'client-guard';

export interface StaffPortalStateRule {
  state: StaffPortalAccessState;
  surface: 'staff-admin-web';
  truth: StaffPortalTruth;
  routeKeys: Array<'login' | 'refresh' | 'me'>;
  allowedRoles: StaffPortalRole[];
  description: string;
}

export interface StaffPortalNavigationRule {
  key: string;
  href: string;
  label: string;
  visibleTo: StaffPortalRole[];
  notes: string;
}

export const staffPortalRoles: StaffPortalRole[] = ['technician', 'service_adviser', 'super_admin'];

export const staffPortalSessionRoutes: RouteContract[] = [
  authRoutes.login,
  authRoutes.refresh,
  authRoutes.me,
];

export const staffPortalNavigationRules: StaffPortalNavigationRule[] = [
  {
    key: 'dashboard',
    href: '/',
    label: 'Dashboard',
    visibleTo: ['technician', 'service_adviser', 'super_admin'],
    notes: 'Shared staff landing surface after a valid session is established.',
  },
  {
    key: 'vehicle-records',
    href: '/vehicles',
    label: 'Vehicle Records',
    visibleTo: ['technician', 'service_adviser', 'super_admin'],
    notes: 'All staff roles may view operational vehicle context needed for assigned work and service coordination.',
  },
  {
    key: 'bookings',
    href: '/bookings',
    label: 'Bookings',
    visibleTo: ['service_adviser', 'super_admin'],
    notes: 'Booking schedule and queue visibility stays adviser/admin only.',
  },
  {
    key: 'back-jobs',
    href: '/backjobs',
    label: 'Back-Jobs',
    visibleTo: ['service_adviser', 'super_admin'],
    notes: 'Back-job review and release coordination remain adviser/admin workflows.',
  },
  {
    key: 'service-timeline',
    href: '/timeline',
    label: 'Service Timeline',
    visibleTo: ['service_adviser', 'super_admin'],
    notes: 'Reviewed customer-safe timeline visibility remains adviser/admin owned in this phase.',
  },
  {
    key: 'insurance',
    href: '/insurance',
    label: 'Insurance',
    visibleTo: ['service_adviser', 'super_admin'],
    notes: 'Insurance review remains adviser/admin only.',
  },
  {
    key: 'inventory',
    href: '/shop',
    label: 'Inventory',
    visibleTo: ['service_adviser', 'super_admin'],
    notes: 'Current inventory visibility is operational and backoffice-facing, not technician-facing.',
  },
  {
    key: 'loyalty-management',
    href: '/loyalty',
    label: 'Loyalty Management',
    visibleTo: ['service_adviser', 'super_admin'],
    notes: 'Customer loyalty administration remains adviser/admin visible.',
  },
  {
    key: 'qa-audit',
    href: '/admin/qa-audit',
    label: 'QA Audit',
    visibleTo: ['service_adviser', 'super_admin'],
    notes: 'Quality-gate review belongs to advisers and super admins, while override authority remains super-admin controlled.',
  },
  {
    key: 'summary-review',
    href: '/admin/summaries',
    label: 'Analytics & Summaries',
    visibleTo: ['service_adviser', 'super_admin'],
    notes:
      'Admin analytics plus lifecycle summary review remain adviser/admin visible from the shared summaries hub.',
  },
  {
    key: 'user-admin',
    href: '/admin/users',
    label: 'User Creation',
    visibleTo: ['super_admin'],
    notes: 'Super admins provision staff, mechanic, technician, and admin identities from this protected page.',
  },
  {
    key: 'catalog-admin',
    href: '/admin/catalog',
    label: 'Catalog Admin',
    visibleTo: ['super_admin'],
    notes: 'Catalog administration is a super-admin-only web surface in the current phase.',
  },
  {
    key: 'inventory-admin',
    href: '/admin/inventory',
    label: 'Inventory Admin',
    visibleTo: ['super_admin'],
    notes: 'Inventory administration is a super-admin-only web surface in the current phase.',
  },
  {
    key: 'appointments-admin',
    href: '/admin/appointments',
    label: 'Appointments Admin',
    visibleTo: ['service_adviser', 'super_admin'],
    notes: 'Appointment oversight is adviser/admin visible.',
  },
  {
    key: 'job-orders-admin',
    href: '/admin/job-orders',
    label: 'Job Orders',
    visibleTo: ['service_adviser', 'super_admin'],
    notes: 'Job-order booking handoff and operational workbench remain adviser/admin owned in this slice.',
  },
  {
    key: 'settings',
    href: '/settings',
    label: 'Settings',
    visibleTo: ['technician', 'service_adviser', 'super_admin'],
    notes: 'All staff roles may manage their own web-session settings.',
  },
];

export const staffPortalNavigationVisibilityByPath = Object.fromEntries(
  staffPortalNavigationRules.map((entry) => [entry.href, entry.visibleTo]),
) as Record<string, StaffPortalRole[]>;

export const staffPortalRoleCapabilities: Record<StaffPortalRole, string[]> = {
  technician: [
    'sign in to the staff portal',
    'restore an existing staff session',
    'view operational vehicle context',
    'access assigned-work dashboard states',
  ],
  service_adviser: [
    'all technician capabilities',
    'review booking schedule and queue states',
    'coordinate insurance, back-job, and lifecycle review flows',
    'prepare operational release readiness',
  ],
  super_admin: [
    'all service adviser capabilities',
    'access staff provisioning and backoffice administration routes',
    'approve sensitive override and audit-visible administrative actions',
  ],
};

export const staffPortalStateRules: StaffPortalStateRule[] = [
  {
    state: 'unauthenticated',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKeys: ['login'],
    allowedRoles: [],
    description: 'No staff session is present, so the web portal must show the staff login surface.',
  },
  {
    state: 'login_submitting',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKeys: ['login'],
    allowedRoles: [],
    description: 'The login request is in flight and the client should prevent duplicate submit.',
  },
  {
    state: 'session_restoring',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKeys: ['refresh', 'me'],
    allowedRoles: [],
    description: 'The portal is validating or refreshing a previously stored session before showing staff navigation.',
  },
  {
    state: 'technician_session_active',
    surface: 'staff-admin-web',
    truth: 'synchronous-auth-record',
    routeKeys: ['login', 'refresh', 'me'],
    allowedRoles: ['technician'],
    description: 'The authenticated session belongs to an active technician and the portal must hide adviser/admin-only routes.',
  },
  {
    state: 'service_adviser_session_active',
    surface: 'staff-admin-web',
    truth: 'synchronous-auth-record',
    routeKeys: ['login', 'refresh', 'me'],
    allowedRoles: ['service_adviser'],
    description: 'The authenticated session belongs to an active service adviser and the portal may show adviser-owned navigation.',
  },
  {
    state: 'super_admin_session_active',
    surface: 'staff-admin-web',
    truth: 'synchronous-auth-record',
    routeKeys: ['login', 'refresh', 'me'],
    allowedRoles: ['super_admin'],
    description: 'The authenticated session belongs to an active super admin and the portal may show all web-admin navigation.',
  },
  {
    state: 'customer_blocked',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKeys: ['login', 'refresh', 'me'],
    allowedRoles: [],
    description: 'Customer identities must never remain inside the staff/admin portal after authentication.',
  },
  {
    state: 'pending_staff_blocked',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKeys: ['login'],
    allowedRoles: [],
    description: 'Pending staff accounts must complete Google verification plus email OTP activation before they can behave like a normal web session.',
  },
  {
    state: 'deactivated_staff_blocked',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKeys: ['login', 'refresh', 'me'],
    allowedRoles: [],
    description: 'Deactivated staff accounts must be removed from the portal and shown a distinct blocked state.',
  },
  {
    state: 'forbidden_navigation',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKeys: ['me'],
    allowedRoles: [],
    description: 'The session is valid, but the current role must not see or act on the requested web workspace.',
  },
  {
    state: 'session_restore_failed',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKeys: ['refresh'],
    allowedRoles: [],
    description: 'A stale or invalid stored session could not be restored and the portal must fall back to login.',
  },
];

export const staffPortalStateMessages: Record<
  Exclude<
    StaffPortalAccessState,
    'login_submitting' | 'session_restoring' | 'technician_session_active' | 'service_adviser_session_active' | 'super_admin_session_active'
  >,
  string
> = {
  unauthenticated: '',
  customer_blocked: 'This web portal is for staff and admin accounts only.',
  pending_staff_blocked:
    'This staff account is still pending activation. Complete the Google + email OTP activation flow first.',
  deactivated_staff_blocked:
    'This staff account is deactivated. Contact a super admin if access should be restored.',
  forbidden_navigation: 'Your role does not have access to that workspace in the staff portal.',
  session_restore_failed: 'Your previous session expired or is no longer valid. Please sign in again.',
};

export const staffPortalBlockedStateErrors: Record<
  'customer' | 'pending' | 'deactivated' | 'forbidden' | 'restoreFailed',
  ApiErrorResponse
> = {
  customer: {
    statusCode: 403,
    code: 'FORBIDDEN',
    message: staffPortalStateMessages.customer_blocked,
    source: 'task',
  },
  pending: {
    statusCode: 403,
    code: 'FORBIDDEN',
    message: staffPortalStateMessages.pending_staff_blocked,
    source: 'task',
  },
  deactivated: {
    statusCode: 403,
    code: 'FORBIDDEN',
    message: staffPortalStateMessages.deactivated_staff_blocked,
    source: 'task',
  },
  forbidden: {
    statusCode: 403,
    code: 'FORBIDDEN',
    message: staffPortalStateMessages.forbidden_navigation,
    source: 'task',
  },
  restoreFailed: {
    statusCode: 401,
    code: 'UNAUTHORIZED',
    message: staffPortalStateMessages.session_restore_failed,
    source: 'task',
  },
};

export const isStaffPortalRole = (role?: string | null): role is StaffPortalRole =>
  role === 'technician' || role === 'service_adviser' || role === 'super_admin';

export const getStaffPortalAccessState = (sessionUser?: { role?: string | null; isActive?: boolean | null } | null): StaffPortalAccessState => {
  if (!sessionUser?.role) {
    return 'unauthenticated';
  }

  if (!isStaffPortalRole(sessionUser.role)) {
    return 'customer_blocked';
  }

  if (sessionUser.isActive === false) {
    return 'deactivated_staff_blocked';
  }

  if (sessionUser.role === 'technician') {
    return 'technician_session_active';
  }

  if (sessionUser.role === 'service_adviser') {
    return 'service_adviser_session_active';
  }

  return 'super_admin_session_active';
};

export const isActiveStaffPortalState = (
  state: StaffPortalAccessState,
): state is Extract<
  StaffPortalAccessState,
  'technician_session_active' | 'service_adviser_session_active' | 'super_admin_session_active'
> =>
  state === 'technician_session_active' ||
  state === 'service_adviser_session_active' ||
  state === 'super_admin_session_active';

export const getStaffPortalNavigationForRole = (role?: string | null) =>
  isStaffPortalRole(role)
    ? staffPortalNavigationRules.filter((entry) => entry.visibleTo.includes(role))
    : [];
