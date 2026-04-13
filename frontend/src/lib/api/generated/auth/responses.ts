export interface AuthUserResponse {
  id: string;
  email: string;
  role: string;
  staffCode?: string | null;
  isActive: boolean;
}

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
}

export interface AuthenticatedUserResponse {
  userId: string;
  email: string;
  role: string;
}

export interface GoogleSignupStartResponse {
  enrollmentId: string;
  userId: string;
  maskedEmail: string;
  otpExpiresAt: string;
  status: string;
}
