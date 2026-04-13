'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import {
  ApiError,
  loginAccount,
  registerAccount,
  verifyRegistrationOtp,
} from '@/lib/authClient'

const emptyLoginForm = {
  email: '',
  password: '',
}

const emptyRegisterForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

const fieldBaseClasses =
  'w-full rounded-xl border bg-[rgba(255,255,255,0.05)] px-10 py-3 text-sm text-white placeholder-[rgba(255,255,255,0.22)] outline-none transition-all duration-150'

const validateEmail = (value) => /\S+@\S+\.\S+/.test(value)

const buildRegisterErrors = (form) => {
  const errors = {}

  if (!form.firstName.trim()) errors.firstName = 'First name is required.'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.'
  if (!validateEmail(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (form.phone && form.phone.trim().length > 30) errors.phone = 'Phone number is too long.'
  if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.'

  return errors
}

const buildLoginErrors = (form) => {
  const errors = {}

  if (!validateEmail(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!form.password.trim()) errors.password = 'Password is required.'

  return errors
}

const formatExpiry = (value) => {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toLocaleString()
}

const InputField = ({
  label,
  icon: Icon,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  error,
  trailing,
}) => (
  <div>
    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
      {label}
    </label>
    <div className="relative">
      <Icon
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'rgba(255,255,255,0.25)' }}
      />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${fieldBaseClasses} ${trailing ? 'pr-11' : 'pr-4'}`}
        style={{ borderColor: error ? 'rgba(248,113,113,0.78)' : 'rgba(255,255,255,0.09)' }}
      />
      {trailing}
    </div>
    {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
  </div>
)

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [loginForm, setLoginForm] = useState(emptyLoginForm)
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm)
  const [otpCode, setOtpCode] = useState('')
  const [pendingEnrollment, setPendingEnrollment] = useState(null)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const otpExpiryLabel = useMemo(
    () => formatExpiry(pendingEnrollment?.otpExpiresAt),
    [pendingEnrollment],
  )

  const handleApiError = (error, fallback) => {
    if (error instanceof ApiError) {
      setNotice({ tone: 'error', text: error.message })
      return
    }

    setNotice({ tone: 'error', text: fallback })
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setErrors({})
    setNotice(null)
    setOtpCode('')
    if (nextMode !== 'verify') {
      setPendingEnrollment(null)
    }
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = buildLoginErrors(loginForm)
    setErrors(nextErrors)
    setNotice(null)

    if (Object.keys(nextErrors).length) {
      return
    }

    setLoading(true)
    try {
      const session = await loginAccount({
        email: loginForm.email.trim(),
        password: loginForm.password,
      })

      onAuthenticated(session)
    } catch (error) {
      handleApiError(error, 'Unable to sign in right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = buildRegisterErrors(registerForm)
    setErrors(nextErrors)
    setNotice(null)

    if (Object.keys(nextErrors).length) {
      return
    }

    setLoading(true)
    try {
      const enrollment = await registerAccount({
        email: registerForm.email.trim(),
        password: registerForm.password,
        firstName: registerForm.firstName.trim(),
        lastName: registerForm.lastName.trim(),
        phone: registerForm.phone.trim() || undefined,
      })

      setPendingEnrollment(enrollment)
      setOtpCode('')
      setErrors({})
      setMode('verify')
      setNotice({
        tone: 'success',
        text: `Verification code sent to ${enrollment.maskedEmail}. Two-factor verification is only required for account creation.`,
      })
    } catch (error) {
      handleApiError(error, 'Unable to start registration right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySubmit = async (event) => {
    event.preventDefault()
    const normalizedOtp = otpCode.trim()
    const nextErrors = {}

    if (!normalizedOtp || normalizedOtp.length < 4) {
      nextErrors.otp = 'Enter the verification code sent to your email.'
    }

    setErrors(nextErrors)
    setNotice(null)

    if (Object.keys(nextErrors).length || !pendingEnrollment?.enrollmentId) {
      return
    }

    setLoading(true)
    try {
      const session = await verifyRegistrationOtp({
        enrollmentId: pendingEnrollment.enrollmentId,
        otp: normalizedOtp,
      })

      onAuthenticated(session)
    } catch (error) {
      handleApiError(error, 'Unable to verify the registration code right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0a]">
      <div
        className="hidden lg:flex lg:w-[58%] flex-col justify-between relative overflow-hidden"
        style={{
          backgroundImage: 'url(/21352.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.84) 0%, rgba(10,6,0,0.72) 50%, rgba(0,0,0,0.80) 100%)' }}
        />
        <div
          className="absolute top-0 right-0 w-[480px] h-[480px] pointer-events-none"
          style={{ background: 'radial-gradient(circle at top right, rgba(179,84,30,0.18) 0%, transparent 65%)' }}
        />

        <div className="relative z-10 px-12 pt-12">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#f07c00,#b3541e)', boxShadow: '0 0 24px rgba(240,124,0,0.35)' }}
            >
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-white tracking-tight leading-none">AUTOCARE PORTAL</p>
              <p
                className="text-[9px] font-bold uppercase tracking-[0.22em] mt-0.5"
                style={{ color: 'rgba(240,124,0,0.75)' }}
              >
                Customer Access
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-12 py-8">
          <div className="w-10 h-1 rounded-full mb-6" style={{ background: 'linear-gradient(90deg,#f07c00,#b3541e)' }} />
          <h1 className="text-5xl font-black text-white leading-[1.08] tracking-tight">
            Register once,
            <br />
            verify once,
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg,#f07c00 0%,#c9951a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              sign in normally.
            </span>
          </h1>
          <p className="mt-5 text-base font-medium leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.60)' }}>
            Account creation uses email verification for extra protection. After activation, regular login only needs your email and password.
          </p>
        </div>

        <div className="relative z-10 px-12 pb-12">
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 size={18} style={{ color: '#f07c00' }} />
              <p className="text-sm font-bold text-white">Authentication Rules</p>
            </div>
            <ul className="space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.66)' }}>
              <li>Registration requires email OTP verification before the account becomes active.</li>
              <li>Login does not ask for OTP after the account is verified.</li>
              <li>JWT access and refresh tokens are issued only after activation or successful login.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex-1 lg:w-[42%] flex items-center justify-center px-6 py-10" style={{ background: '#111111' }}>
        <div className="w-full max-w-[390px]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#f07c00' }}>
            Account Access
          </p>
          <h2 className="text-3xl font-black text-white leading-tight">
            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Verify Registration'}
          </h2>
          <p className="text-sm mt-2 mb-8" style={{ color: 'rgba(255,255,255,0.42)' }}>
            {mode === 'login'
              ? 'Use your email and password. OTP is only required when creating a new account.'
              : mode === 'register'
                ? 'Create your account, then confirm the email verification code before the first session starts.'
                : 'Enter the email verification code sent during account creation to activate the account.'}
          </p>

          {mode !== 'verify' && (
            <div
              className="flex p-1 rounded-xl mb-6"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {[
                { key: 'login', label: 'Sign In' },
                { key: 'register', label: 'Register' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => switchMode(item.key)}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${mode === item.key ? 'text-white' : 'text-ink-muted'}`}
                  style={mode === item.key ? { background: 'linear-gradient(135deg,#f07c00,#b3541e)' } : {}}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {notice?.text ? (
            <div
              className="flex items-start gap-2.5 mb-5 rounded-xl px-4 py-3"
              style={{
                background: notice.tone === 'success' ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${notice.tone === 'success' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`,
              }}
            >
              {notice.tone === 'success' ? (
                <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${notice.tone === 'success' ? 'text-emerald-300' : 'text-red-400'}`}>{notice.text}</p>
            </div>
          ) : null}

          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
              <InputField
                label="Email Address"
                icon={Mail}
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email}
              />
              <InputField
                label="Password"
                icon={Lock}
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                type={showLoginPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                error={errors.password}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((value) => !value)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-150 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading
                    ? 'rgba(179,84,30,0.5)'
                    : 'linear-gradient(135deg,#f07c00 0%,#b3541e 100%)',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(179,84,30,0.35)',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="First Name"
                  icon={UserRound}
                  value={registerForm.firstName}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, firstName: event.target.value }))}
                  placeholder="Jane"
                  autoComplete="given-name"
                  error={errors.firstName}
                />
                <InputField
                  label="Last Name"
                  icon={UserRound}
                  value={registerForm.lastName}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, lastName: event.target.value }))}
                  placeholder="Doe"
                  autoComplete="family-name"
                  error={errors.lastName}
                />
              </div>
              <InputField
                label="Email Address"
                icon={Mail}
                value={registerForm.email}
                onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email}
              />
              <InputField
                label="Phone Number"
                icon={Phone}
                value={registerForm.phone}
                onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+639171234567"
                autoComplete="tel"
                error={errors.phone}
              />
              <InputField
                label="Password"
                icon={Lock}
                value={registerForm.password}
                onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                type={showRegisterPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                error={errors.password}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((value) => !value)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                  >
                    {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <InputField
                label="Confirm Password"
                icon={Lock}
                value={registerForm.confirmPassword}
                onChange={(event) => setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repeat your password"
                autoComplete="new-password"
                error={errors.confirmPassword}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-150 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading
                    ? 'rgba(179,84,30,0.5)'
                    : 'linear-gradient(135deg,#f07c00 0%,#b3541e 100%)',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(179,84,30,0.35)',
                }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          {mode === 'verify' && (
            <form onSubmit={handleVerifySubmit} className="space-y-4" noValidate>
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} style={{ color: '#f07c00' }} />
                  <p className="text-sm font-semibold text-white">Email Verification Required</p>
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.60)' }}>
                  We sent a verification code to <span className="font-semibold text-white">{pendingEnrollment?.maskedEmail ?? 'your email'}</span>.
                </p>
                {otpExpiryLabel ? (
                  <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.42)' }}>
                    Code expires at {otpExpiryLabel}.
                  </p>
                ) : null}
              </div>

              <InputField
                label="Verification Code"
                icon={ShieldCheck}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="123456"
                autoComplete="one-time-code"
                error={errors.otp}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-150 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading
                    ? 'rgba(179,84,30,0.5)'
                    : 'linear-gradient(135deg,#f07c00 0%,#b3541e 100%)',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(179,84,30,0.35)',
                }}
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full text-sm font-semibold text-ink-secondary hover:text-white transition-colors"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
