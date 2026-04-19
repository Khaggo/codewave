'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Eye, EyeOff, Lock, Mail, ShieldCheck, UserCog } from 'lucide-react'

import { ApiError, loginAccount } from '@/lib/authClient'

const emptyLoginForm = {
  email: '',
  password: '',
}

const fieldBaseClasses =
  'w-full rounded-xl border bg-[rgba(255,255,255,0.05)] px-10 py-3 text-sm text-white placeholder-[rgba(255,255,255,0.22)] outline-none transition-all duration-150'

const validateEmail = (value) => /\S+@\S+\.\S+/.test(value)

const buildLoginErrors = (form) => {
  const errors = {}

  if (!validateEmail(form.email.trim())) errors.email = 'Enter a valid staff email address.'
  if (!form.password.trim()) errors.password = 'Password is required.'

  return errors
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

export default function Login({ onAuthenticated, initialError }) {
  const [loginForm, setLoginForm] = useState(emptyLoginForm)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(
    initialError
      ? {
          tone: 'error',
          text: initialError,
        }
      : null,
  )
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!initialError) {
      return
    }

    setNotice({
      tone: 'error',
      text: initialError,
    })
  }, [initialError])

  const handleApiError = (error, fallback) => {
    if (error instanceof ApiError) {
      setNotice({ tone: 'error', text: error.message })
      return
    }

    setNotice({ tone: 'error', text: fallback })
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

      const result = await onAuthenticated(session)
      if (result?.ok === false) {
        setNotice({
          tone: 'error',
          text: result.message,
        })
      }
    } catch (error) {
      handleApiError(error, 'Unable to sign in right now.')
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
          style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.88) 0%, rgba(10,6,0,0.78) 50%, rgba(0,0,0,0.84) 100%)' }}
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
                Staff & Admin Access
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-12 py-8">
          <div className="w-10 h-1 rounded-full mb-6" style={{ background: 'linear-gradient(90deg,#f07c00,#b3541e)' }} />
          <h1 className="text-5xl font-black text-white leading-[1.08] tracking-tight">
            Run operations,
            <br />
            manage staff,
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg,#f07c00 0%,#c9951a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              from one control center.
            </span>
          </h1>
          <p className="mt-5 text-base font-medium leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.60)' }}>
            This web portal is for service advisers, technicians, and super admins. Customer accounts should use the mobile app instead.
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
              <UserCog size={18} style={{ color: '#f07c00' }} />
              <p className="text-sm font-bold text-white">Portal Rules</p>
            </div>
            <ul className="space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.66)' }}>
              <li>Customer self-registration is not available on the web portal.</li>
              <li>Staff accounts are provisioned by super admins inside the dashboard.</li>
              <li>Normal staff login uses email and password without OTP after activation.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex-1 lg:w-[42%] flex items-center justify-center px-6 py-10" style={{ background: '#111111' }}>
        <div className="w-full max-w-[390px]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#f07c00' }}>
            Admin Access Portal
          </p>
          <h2 className="text-3xl font-black text-white leading-tight">Staff Login</h2>
          <p className="text-sm mt-2 mb-8" style={{ color: 'rgba(255,255,255,0.42)' }}>
            Sign in with your staff credentials to open the Cruisers Crib operations workspace.
          </p>

          {notice?.text ? (
            <div
              className="flex items-start gap-2.5 mb-5 rounded-xl px-4 py-3"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.18)',
              }}
            >
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{notice.text}</p>
            </div>
          ) : null}

          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            <InputField
              label="Staff Email"
              icon={Mail}
              value={loginForm.email}
              onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="staff@example.com"
              autoComplete="email"
              error={errors.email}
            />
            <InputField
              label="Password"
              icon={Lock}
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              error={errors.password}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
        </div>
      </div>
    </div>
  )
}
