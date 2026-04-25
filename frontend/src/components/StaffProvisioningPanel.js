'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Power, ShieldPlus, UserCog } from 'lucide-react'

import { ApiError, createStaffAccount, updateStaffAccountStatus } from '@/lib/authClient'
import { useUser } from '@/lib/userContext'

const emptyForm = {
  password: '',
  accountType: 'staff',
  firstName: '',
  lastName: '',
  phone: '',
}

const emptyStatusForm = {
  userId: '',
  targetStatus: 'inactive',
  reason: '',
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

  if (form.password.trim().length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!form.firstName.trim()) errors.firstName = 'First name is required.'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.'
  if (form.phone.trim() && form.phone.trim().length > 30) errors.phone = 'Phone number is too long.'

  return errors
}

const buildStatusErrors = (form) => {
  const errors = {}

  if (!form.userId.trim()) errors.userId = 'User ID is required.'
  if (form.reason.trim().length > 160) errors.reason = 'Reason is too long.'

  return errors
}

const formatManagedAccountStatus = (account) =>
  account?.isActive
    ? 'Active'
    : 'Pending activation or currently deactivated'

const formatRoleLabel = (role) =>
  String(role ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatEmailPreviewName = (firstName) =>
  String(firstName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32) || 'firstname'

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
  const [lastProvisionedAccount, setLastProvisionedAccount] = useState(null)
  const [statusForm, setStatusForm] = useState(emptyStatusForm)
  const [statusErrors, setStatusErrors] = useState({})
  const [statusNotice, setStatusNotice] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)

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

  const handleStatusChange = (key, value) => {
    setStatusForm((current) => ({
      ...current,
      [key]: value,
    }))
    setStatusErrors((current) => ({
      ...current,
      [key]: '',
    }))
    setStatusNotice(null)
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
      const createdAccount = await createStaffAccount(
        {
          password: form.password,
          role: selectedAccountType.role,
          accountType: selectedAccountType.value,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
        },
        user.accessToken,
      )

      setForm(emptyForm)
      setErrors({})
      setLastProvisionedAccount(createdAccount)
      setStatusForm({
        userId: createdAccount?.id ?? '',
        targetStatus: createdAccount?.isActive ? 'inactive' : 'active',
        reason: '',
      })
      setStatusErrors({})
      setStatusNotice(null)
      setNotice({
        tone: 'success',
        text: `${selectedAccountType.label} provisioned successfully. ${createdAccount?.staffCode || 'This account'} is now pending activation through the staff Google + email OTP flow.`,
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

  const handleStatusSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = buildStatusErrors(statusForm)
    setStatusErrors(nextErrors)
    setStatusNotice(null)

    if (Object.keys(nextErrors).length) {
      return
    }

    setStatusLoading(true)
    try {
      const updatedAccount = await updateStaffAccountStatus(
        statusForm.userId.trim(),
        {
          isActive: statusForm.targetStatus === 'active',
          reason: statusForm.reason.trim() || undefined,
        },
        user.accessToken,
      )

      if (lastProvisionedAccount?.id === updatedAccount?.id) {
        setLastProvisionedAccount(updatedAccount)
      }

      setStatusNotice({
        tone: 'success',
        text: `${updatedAccount?.staffCode || updatedAccount?.email || 'Staff account'} is now ${
          updatedAccount?.isActive ? 'active' : 'inactive'
        }.`,
      })
      setStatusForm((current) => ({
        ...current,
        targetStatus: updatedAccount?.isActive ? 'inactive' : 'active',
        reason: '',
      }))
    } catch (error) {
      setStatusNotice({
        tone: 'error',
        text:
          error instanceof ApiError
            ? error.message
            : 'Unable to update the staff account status right now.',
      })
    } finally {
      setStatusLoading(false)
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
          <h2 className="mt-2 text-2xl font-black text-ink-primary">Provision And Manage Operations Accounts</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-secondary leading-6">
            Create staff, mechanic, technician, and admin identities from one protected workspace.
            New accounts stay in <span className="font-semibold text-ink-primary">pending activation</span> until
            they complete the existing Google + email OTP activation flow.
            Employee emails and staff IDs are generated automatically to prevent duplicate demo data.
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

      {lastProvisionedAccount ? (
        <div
          className="mb-5 rounded-2xl border px-4 py-4 md:px-5"
          style={{
            borderColor: 'rgba(255,255,255,0.09)',
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                Last Provisioned Account
              </p>
              <h3 className="mt-2 text-lg font-extrabold text-ink-primary">
                {lastProvisionedAccount.profile?.firstName || 'Staff'} {lastProvisionedAccount.profile?.lastName || 'Account'}
              </h3>
              <p className="mt-1 text-sm text-ink-secondary">{lastProvisionedAccount.email}</p>
            </div>
            <div
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]"
              style={{
                borderColor: lastProvisionedAccount.isActive
                  ? 'rgba(16,185,129,0.3)'
                  : 'rgba(255,184,107,0.26)',
                backgroundColor: lastProvisionedAccount.isActive
                  ? 'rgba(16,185,129,0.08)'
                  : 'rgba(255,184,107,0.08)',
                color: lastProvisionedAccount.isActive ? '#6ee7b7' : '#ffcf9a',
              }}
            >
              {formatManagedAccountStatus(lastProvisionedAccount)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-ink-secondary md:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">Staff Code</p>
              <p className="mt-1 font-semibold text-ink-primary">{lastProvisionedAccount.staffCode || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">Role</p>
              <p className="mt-1 font-semibold text-ink-primary">{formatRoleLabel(lastProvisionedAccount.role)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">User ID</p>
              <p className="mt-1 break-all font-semibold text-ink-primary">{lastProvisionedAccount.id}</p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-ink-muted">
            Mechanics currently map to the live <span className="font-semibold text-ink-primary">technician</span> permission set.
            Activating an account still requires the staff member to finish the existing Google + email OTP flow first.
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

        <div
          className="xl:col-span-2 rounded-2xl border p-4"
          style={{
            borderColor: 'rgba(240,124,0,0.16)',
            backgroundColor: 'rgba(240,124,0,0.06)',
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#ffcf9a' }}>
            Generated On Save
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="text-xs text-ink-muted">Employee email pattern</p>
              <p className="mt-1 break-all font-semibold text-ink-primary">
                {formatEmailPreviewName(form.firstName)}###.{selectedAccountType.value}@autocare.com
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Staff ID pattern</p>
              <p className="mt-1 font-semibold text-ink-primary">
                {selectedAccountType.staffCodeExample.replace('0001', '####')}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-ink-muted">
            The backend checks uniqueness before saving, so repeated names no longer block account creation during demos.
          </p>
        </div>

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
            {loading ? 'Provisioning...' : 'Create Protected Account'}
          </button>
        </div>
      </form>

      <div
        className="mt-6 rounded-2xl border p-5 md:p-6"
        style={{
          borderColor: 'rgba(255,255,255,0.09)',
          backgroundColor: 'rgba(255,255,255,0.025)',
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#f07c00' }}>
              Super Admin
            </p>
            <h3 className="mt-2 text-xl font-black text-ink-primary">Account Status Control</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">
              Use the same protected page to activate or deactivate a staff-capable account without deleting its history.
              You can paste any staff user ID, and new accounts automatically preload here after creation.
            </p>
          </div>
          <div
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
            style={{
              borderColor: 'rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(255,255,255,0.04)',
              color: '#dbe3ff',
            }}
          >
            <Power size={14} />
            Status updates
          </div>
        </div>

        {statusNotice?.text ? (
          <div
            className="mt-5 flex items-start gap-2.5 rounded-xl px-4 py-3"
            style={{
              background: statusNotice.tone === 'success' ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${statusNotice.tone === 'success' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`,
            }}
          >
            {statusNotice.tone === 'success' ? (
              <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${statusNotice.tone === 'success' ? 'text-emerald-300' : 'text-red-400'}`}>
              {statusNotice.text}
            </p>
          </div>
        ) : null}

        <form onSubmit={handleStatusSubmit} className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2" noValidate>
          <Field label="Staff User ID" error={statusErrors.userId}>
            <input
              value={statusForm.userId}
              onChange={(event) => handleStatusChange('userId', event.target.value)}
              className="w-full rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white outline-none"
              style={{ borderColor: statusErrors.userId ? 'rgba(248,113,113,0.78)' : 'rgba(255,255,255,0.09)' }}
              placeholder="a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17"
            />
          </Field>

          <Field label="Target Status">
            <div className="relative">
              <select
                value={statusForm.targetStatus}
                onChange={(event) => handleStatusChange('targetStatus', event.target.value)}
                className="w-full appearance-none rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white outline-none"
                style={{ borderColor: 'rgba(255,255,255,0.09)' }}
              >
                <option value="inactive">Set Inactive</option>
                <option value="active">Set Active</option>
              </select>
              <Power
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted"
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">
              Activating only succeeds after that staff account finishes the existing Google + email OTP flow.
            </p>
          </Field>

          <div className="xl:col-span-2">
            <Field label="Reason (Optional)" error={statusErrors.reason}>
              <input
                value={statusForm.reason}
                onChange={(event) => handleStatusChange('reason', event.target.value)}
                className="w-full rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white outline-none"
                style={{ borderColor: statusErrors.reason ? 'rgba(248,113,113,0.78)' : 'rgba(255,255,255,0.09)' }}
                placeholder="Example: handover completed, hold access pending onboarding, or temporary suspension."
              />
            </Field>
          </div>

          <div className="xl:col-span-2 flex items-center justify-between gap-4 flex-wrap pt-2">
            <p className="text-xs text-ink-muted max-w-xl leading-5">
              This control reuses the existing protected account-status endpoint. It does not delete staff history or create a new customer-facing account flow.
            </p>
            <button
              type="submit"
              disabled={statusLoading}
              className="rounded-xl px-5 py-3 text-sm font-bold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: statusLoading
                  ? 'rgba(59,79,130,0.45)'
                  : 'linear-gradient(135deg,#2d4d8f 0%,#1d315c 100%)',
                boxShadow: statusLoading ? 'none' : '0 4px 20px rgba(29,49,92,0.28)',
              }}
            >
              {statusLoading ? 'Updating...' : 'Update Account Status'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
