'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ShieldPlus, UserCog } from 'lucide-react'

import { ApiError, createStaffAccount } from '@/lib/authClient'
import { useUser } from '@/lib/userContext'

const emptyForm = {
  email: '',
  password: '',
  accountType: 'staff',
  staffCode: '',
  firstName: '',
  lastName: '',
  phone: '',
}

const accountTypeOptions = [
  {
    value: 'staff',
    label: 'Staff',
    role: 'service_adviser',
    roleLabel: 'Service Adviser',
    helper: 'Front-desk and coordination access for bookings, customers, and daily operations.',
    staffCodeExample: 'STA-0001',
  },
  {
    value: 'mechanic',
    label: 'Mechanic',
    role: 'technician',
    roleLabel: 'Technician Access',
    helper: 'Mechanics currently use technician permissions in the live system.',
    staffCodeExample: 'MEC-0001',
  },
  {
    value: 'technician',
    label: 'Technician',
    role: 'technician',
    roleLabel: 'Technician Access',
    helper: 'Assigned technical work, workshop progress, and execution-focused access.',
    staffCodeExample: 'TEC-0001',
  },
  {
    value: 'admin',
    label: 'Admin',
    role: 'super_admin',
    roleLabel: 'Super Admin',
    helper: 'Protected backoffice administration and sensitive override authority.',
    staffCodeExample: 'ADM-0001',
  },
]

const buildErrors = (form) => {
  const errors = {}

  if (!/\S+@\S+\.\S+/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (form.password.trim().length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!form.staffCode.trim()) errors.staffCode = 'Staff code is required.'
  if (!form.firstName.trim()) errors.firstName = 'First name is required.'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.'
  if (form.phone.trim() && form.phone.trim().length > 30) errors.phone = 'Phone number is too long.'

  return errors
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-[0.18em] mb-1.5 text-ink-muted">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  )
}

export default function StaffProvisioningPanel() {
  const user = useUser()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)

  const canProvision = user?.role === 'super_admin'

  const selectedAccountType = useMemo(
    () => accountTypeOptions.find((option) => option.value === form.accountType) ?? accountTypeOptions[0],
    [form.accountType],
  )

  if (!canProvision) {
    return null
  }

  const handleChange = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
    setErrors((current) => ({
      ...current,
      [key]: '',
    }))
    setNotice(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = buildErrors(form)
    setErrors(nextErrors)
    setNotice(null)

    if (Object.keys(nextErrors).length) {
      return
    }

    setLoading(true)
    try {
      await createStaffAccount(
        {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: selectedAccountType.role,
          staffCode: form.staffCode.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
        },
        user.accessToken,
      )

      setForm(emptyForm)
      setErrors({})
      setNotice({
        tone: 'success',
        text: `${selectedAccountType.label} provisioned successfully. The account is now pending activation through the staff Google + email OTP flow.`,
      })
    } catch (error) {
      setNotice({
        tone: 'error',
        text:
          error instanceof ApiError
            ? error.message
            : 'Unable to provision the staff account right now.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="rounded-2xl border p-5 md:p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(17,17,19,0.98) 0%, rgba(26,16,0,0.92) 100%)',
        borderColor: 'rgba(240,124,0,0.14)',
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#f07c00' }}>
            Super Admin
          </p>
          <h2 className="mt-2 text-2xl font-black text-ink-primary">Provision Operations Account</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-secondary leading-6">
            Create staff, mechanic, technician, and admin identities from one protected workspace.
            New accounts stay in <span className="font-semibold text-ink-primary">pending activation</span> until
            they complete the existing Google + email OTP activation flow.
          </p>
        </div>
        <div
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
          style={{
            borderColor: 'rgba(240,124,0,0.18)',
            backgroundColor: 'rgba(240,124,0,0.08)',
            color: '#ffcf9a',
          }}
        >
          <ShieldPlus size={14} />
          Protected provisioning
        </div>
      </div>

      {notice?.text ? (
        <div
          className="mb-5 flex items-start gap-2.5 rounded-xl px-4 py-3"
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
          <p className={`text-sm ${notice.tone === 'success' ? 'text-emerald-300' : 'text-red-400'}`}>
            {notice.text}
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-2 gap-4" noValidate>
        <Field label="First Name" error={errors.firstName}>
          <input
            value={form.firstName}
            onChange={(event) => handleChange('firstName', event.target.value)}
            className="w-full rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white outline-none"
            style={{ borderColor: errors.firstName ? 'rgba(248,113,113,0.78)' : 'rgba(255,255,255,0.09)' }}
            placeholder="Maria"
          />
        </Field>

        <Field label="Last Name" error={errors.lastName}>
          <input
            value={form.lastName}
            onChange={(event) => handleChange('lastName', event.target.value)}
            className="w-full rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white outline-none"
            style={{ borderColor: errors.lastName ? 'rgba(248,113,113,0.78)' : 'rgba(255,255,255,0.09)' }}
            placeholder="Santos"
          />
        </Field>

        <Field label="Email Address" error={errors.email}>
          <input
            value={form.email}
            onChange={(event) => handleChange('email', event.target.value)}
            className="w-full rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white outline-none"
            style={{ borderColor: errors.email ? 'rgba(248,113,113,0.78)' : 'rgba(255,255,255,0.09)' }}
            placeholder="service.adviser@example.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Password" error={errors.password}>
          <input
            type="password"
            value={form.password}
            onChange={(event) => handleChange('password', event.target.value)}
            className="w-full rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white outline-none"
            style={{ borderColor: errors.password ? 'rgba(248,113,113,0.78)' : 'rgba(255,255,255,0.09)' }}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
          />
        </Field>

        <Field label="Staff Code" error={errors.staffCode}>
          <input
            value={form.staffCode}
            onChange={(event) => handleChange('staffCode', event.target.value.toUpperCase())}
            className="w-full rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white outline-none"
            style={{ borderColor: errors.staffCode ? 'rgba(248,113,113,0.78)' : 'rgba(255,255,255,0.09)' }}
            placeholder={selectedAccountType.staffCodeExample}
          />
        </Field>

        <Field label="Account Type">
          <div className="relative">
            <select
              value={form.accountType}
              onChange={(event) => handleChange('accountType', event.target.value)}
              className="w-full appearance-none rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white outline-none"
              style={{ borderColor: 'rgba(255,255,255,0.09)' }}
            >
              {accountTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <UserCog
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted"
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            Backend access: <span className="font-semibold text-ink-primary">{selectedAccountType.roleLabel}</span>. {selectedAccountType.helper}
          </p>
        </Field>

        <Field label="Phone Number" error={errors.phone}>
          <input
            value={form.phone}
            onChange={(event) => handleChange('phone', event.target.value)}
            className="w-full rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white outline-none"
            style={{ borderColor: errors.phone ? 'rgba(248,113,113,0.78)' : 'rgba(255,255,255,0.09)' }}
            placeholder="+639171234567"
            autoComplete="tel"
          />
        </Field>

        <div className="xl:col-span-2 flex items-center justify-between gap-4 flex-wrap pt-2">
          <p className="text-xs text-ink-muted max-w-xl leading-5">
            Staff sign-in uses the same login endpoint as the admin portal, and the selected
            account type maps into the current protected role model without creating a separate
            customer-facing flow.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl px-5 py-3 text-sm font-bold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? 'rgba(179,84,30,0.5)'
                : 'linear-gradient(135deg,#f07c00 0%,#b3541e 100%)',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(179,84,30,0.35)',
            }}
          >
            {loading ? 'Provisioning...' : 'Create Pending Account'}
          </button>
        </div>
      </form>
    </section>
  )
}
