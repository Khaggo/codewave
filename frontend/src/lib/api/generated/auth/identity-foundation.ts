import { authRoutes } from './requests';
import { usersRoutes } from '../users/requests';

export type IdentitySurface = 'customer-mobile' | 'staff-admin-web' | 'cross-surface';

export type AccountLifecycleState = 'pending_activation' | 'active' | 'deactivated';

export type IdentityOwnership = 'auth-session' | 'user-profile' | 'user-addresses';

export interface IdentityRouteSurfaceEntry {
  surfaces: readonly IdentitySurface[];
  lifecycleStates: readonly AccountLifecycleState[];
  ownership: IdentityOwnership;
  notes: string;
}

export interface SharedIdentityState {
  key: string;
  surface: IdentitySurface;
  lifecycleState: AccountLifecycleState;
  ownership: IdentityOwnership;
  description: string;
}

export const authRouteSurfaceMap = {
  register: {
    surfaces: ['customer-mobile'],
    lifecycleStates: ['pending_activation'],
    ownership: 'auth-session',
    notes: 'Legacy password-first registration remains live during migration.',
  },
  registerVerifyEmail: {
    surfaces: ['customer-mobile'],
    lifecycleStates: ['active'],
    ownership: 'auth-session',
    notes: 'Completes registration by issuing tokens after valid email OTP.',
  },
  login: {
    surfaces: ['customer-mobile', 'staff-admin-web'],
    lifecycleStates: ['active'],
    ownership: 'auth-session',
    notes: 'Login serves both customer and staff sessions but surface access differs by role.',
  },
  refresh: {
    surfaces: ['customer-mobile', 'staff-admin-web'],
    lifecycleStates: ['active'],
    ownership: 'auth-session',
    notes: 'Refresh maintains active sessions only.',
  },
  me: {
    surfaces: ['customer-mobile', 'staff-admin-web'],
    lifecycleStates: ['active'],
    ownership: 'auth-session',
    notes: 'Returns the authenticated identity projection.',
  },
  googleSignupStart: {
    surfaces: ['customer-mobile'],
    lifecycleStates: ['pending_activation'],
    ownership: 'auth-session',
    notes: 'Starts Google-backed customer signup and email OTP issuance.',
  },
  googleSignupVerifyEmail: {
    surfaces: ['customer-mobile'],
    lifecycleStates: ['active'],
    ownership: 'auth-session',
    notes: 'Completes Google-backed customer signup after email OTP verification.',
  },
  staffActivationStart: {
    surfaces: ['staff-admin-web'],
    lifecycleStates: ['pending_activation'],
    ownership: 'auth-session',
    notes: 'Starts pending staff activation with Google identity proof and email OTP.',
  },
  staffActivationVerifyEmail: {
    surfaces: ['staff-admin-web'],
    lifecycleStates: ['active'],
    ownership: 'auth-session',
    notes: 'Completes staff activation after email OTP verification.',
  },
} as const satisfies Record<keyof typeof authRoutes, IdentityRouteSurfaceEntry>;

export const userRouteSurfaceMap = {
  createUser: {
    surfaces: ['cross-surface'],
    lifecycleStates: ['pending_activation', 'active'],
    ownership: 'user-profile',
    notes: 'User identity record creation underlies customer and staff flows.',
  },
  getUserById: {
    surfaces: ['customer-mobile', 'staff-admin-web'],
    lifecycleStates: ['active', 'deactivated'],
    ownership: 'user-profile',
    notes: 'Surface usage depends on role and account visibility.',
  },
  updateUser: {
    surfaces: ['customer-mobile', 'staff-admin-web'],
    lifecycleStates: ['active'],
    ownership: 'user-profile',
    notes: 'Profile updates remain user-owned rather than auth-owned.',
  },
  listAddresses: {
    surfaces: ['customer-mobile'],
    lifecycleStates: ['active'],
    ownership: 'user-addresses',
    notes: 'Addresses are customer-facing and primarily mobile-owned in this phase.',
  },
  addAddress: {
    surfaces: ['customer-mobile'],
    lifecycleStates: ['active'],
    ownership: 'user-addresses',
    notes: 'Address creation supports customer profile and later service flows.',
  },
  updateAddress: {
    surfaces: ['customer-mobile'],
    lifecycleStates: ['active'],
    ownership: 'user-addresses',
    notes: 'Address updates preserve default-address rules from the users domain.',
  },
} as const satisfies Record<keyof typeof usersRoutes, IdentityRouteSurfaceEntry>;

export const sharedIdentityStateGlossary: SharedIdentityState[] = [
  {
    key: 'customer_pending_activation',
    surface: 'customer-mobile',
    lifecycleState: 'pending_activation',
    ownership: 'auth-session',
    description: 'Customer has started signup but has not completed email OTP verification.',
  },
  {
    key: 'customer_active_session',
    surface: 'customer-mobile',
    lifecycleState: 'active',
    ownership: 'auth-session',
    description: 'Customer session is active and can proceed into profile, vehicle, and booking flows.',
  },
  {
    key: 'staff_pending_activation',
    surface: 'staff-admin-web',
    lifecycleState: 'pending_activation',
    ownership: 'auth-session',
    description: 'Staff identity exists but activation is not yet complete.',
  },
  {
    key: 'staff_active_session',
    surface: 'staff-admin-web',
    lifecycleState: 'active',
    ownership: 'auth-session',
    description: 'Staff session is active and web navigation is gated by role.',
  },
  {
    key: 'deactivated_account',
    surface: 'cross-surface',
    lifecycleState: 'deactivated',
    ownership: 'auth-session',
    description: 'The account exists but must not be treated as an active usable session.',
  },
  {
    key: 'active_user_profile',
    surface: 'cross-surface',
    lifecycleState: 'active',
    ownership: 'user-profile',
    description: 'Profile ownership belongs to users and may be read or updated once the account is active.',
  },
  {
    key: 'active_user_addresses',
    surface: 'customer-mobile',
    lifecycleState: 'active',
    ownership: 'user-addresses',
    description: 'Address ownership belongs to users and supports customer-facing profile flows.',
  },
];

