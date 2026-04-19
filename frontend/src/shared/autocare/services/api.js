// ─────────────────────────────────────────────────────────────────────────────
//  @autocare/shared — API client for Flask backend
//  Thin wrapper matching the endpoints in docs/flask-auth-reference.py.
//  Used by both Web and Mobile apps.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'http://localhost:5000/api';

let baseUrl = DEFAULT_BASE_URL;

export function setBaseUrl(url) {
  baseUrl = url.replace(/\/+$/, '');
}

async function request(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ── Auth endpoints ──────────────────────────────────────────────────────────

export const auth = {
  register: (form) =>
    request('POST', '/auth/register', { body: form }),

  login: ({ email, password }) =>
    request('POST', '/auth/login', { body: { email, password } }),

  verifyOtp: ({ email, otp }) =>
    request('POST', '/auth/verify-otp', { body: { email, otp } }),

  resendOtp: ({ email }) =>
    request('POST', '/auth/resend-otp', { body: { email } }),

  changePassword: ({ currentPassword, newPassword, otp }, token) =>
    request('PUT', '/auth/change-password', {
      body: { current_password: currentPassword, new_password: newPassword, otp },
      token,
    }),

  updateProfile: (profileData, token) =>
    request('PUT', '/auth/profile', { body: profileData, token }),
};
