'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Power, RefreshCw, ShieldPlus, UserCog } from 'lucide-react'

import {
  ApiError,
  createStaffAccount,
  listStaffAccounts,
  updateStaffAccountStatus,
} from '@/lib/authClient'
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
    helper: 'Front-desk access for bookings, customer coordination, and daily operations.',
    staffCodeExample: 'STA-####',
  },
  {
    value: 'mechanic',
    label: 'Mechanic',
    role: 'technician',
    roleLabel: 'Technician Access',
    helper: 'Mechanic label for workshop accounts that currently use technician permissions.',
    staffCodeExample: 'MEC-####',
  },
  {
    value: 'technician',
    label: 'Technician',
    role: 'technician',
    roleLabel: 'Technician Access',
    helper: 'Assigned technical work, workshop progress, and execution-focused access.',
    staffCodeExample: 'TEC-####',
  },
  {
    value: 'admin',
    label: 'Admin',
    role: 'super_admin',
    roleLabel: 'Admin',
    helper: 'Protected backoffice administration and sensitive override authority.',
    staffCodeExample: 'ADM-####',
  },
]

const groupedAccountTypes = [
  { value: 'staff', label: 'Staff' },
  { value: 'mechanic', label: 'Mechanics' },
  { value: 'technician', label: 'Technicians' },
  { value: 'admin', label: 'Admins' },
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

  if (!form.userId.trim()) errors.userId = 'Choose a staff account.'
  if (form.reason.trim().length > 160) errors.reason = 'Reason is too long.'

  return errors
}

const formatEmailPreviewName = (firstName) =>
  String(firstName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32) || 'firstname'

function Field({ label, error, children, helper }) {
  return (
    <div>
      <label className="label uppercase tracking-[0.18em]">{label}</label>
      {children}
      {helper ? <p className="mt-1.5 text-xs leading-5 text-ink-muted">{helper}</p> : null}
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  )
}

function Notice({ notice }) {
  if (!notice?.text) return null

  const isSuccess = notice.tone === 'success'

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        isSuccess
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
          : 'border-red-500/25 bg-red-500/10 text-red-300'
      }`}
    >
      {isSuccess ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
      <p>{notice.text}</p>
    </div>
  )
}

function SectionShell({ title, description, children, action }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-surface-border bg-surface-raised/70 px-5 py-4">
        <div>
          <p className="card-title">{title}</p>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function StaffAccountOption({ account }) {
  const status = account.isActive ? 'Active' : 'Inactive'
  const staffCode = account.staffCode ? ` - ${account.staffCode}` : ''
  return `${account.displayName || account.email}${staffCode} (${status})`
}

export default function StaffProvisioningPanel() {
  const user = useUser()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastProvisionedAccount, setLastProvisionedAccount] = useState(null)
  const [managedAccounts, setManagedAccounts] = useState([])
  const [directoryState, setDirectoryState] = useState({ status: 'idle', message: '' })
  const [statusForm, setStatusForm] = useState(emptyStatusForm)
  const [statusErrors, setStatusErrors] = useState({})
  const [statusNotice, setStatusNotice] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusActionTargetId, setStatusActionTargetId] = useState('')

  const canProvision = user?.role === 'super_admin'
  const selectedAccountType = useMemo(
    () => accountTypeOptions.find((option) => option.value === form.accountType) ?? accountTypeOptions[0],
    [form.accountType],
  )
  const selectedStatusAccount = managedAccounts.find((account) => account.id === statusForm.userId)

  const loadManagedAccounts = async () => {
    if (!user?.accessToken || !canProvision) return

    setDirectoryState({ status: 'loading', message: '' })
    try {
      const accounts = await listStaffAccounts(user.accessToken)
      setManagedAccounts(accounts)
      setDirectoryState({
        status: 'success',
        message: accounts.length ? '' : 'No staff-capable accounts are available yet.',
      })
    } catch (error) {
      setDirectoryState({
        status: 'error',
        message:
          error instanceof ApiError
            ? error.message
            : 'Unable to load the staff account directory.',
      })
    }
  }

  useEffect(() => {
    void loadManagedAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accessToken, canProvision])

  if (!canProvision) {
    return null
  }

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    setNotice(null)
  }

  const handleStatusChange = (key, value) => {
    setStatusForm((current) => ({ ...current, [key]: value }))
    setStatusErrors((current) => ({ ...current, [key]: '' }))
    setStatusNotice(null)
  }

  const handleSelectStatusAccount = (accountId) => {
    const account = managedAccounts.find((item) => item.id === accountId)

    setStatusForm((current) => ({
      ...current,
      userId: accountId,
      targetStatus: account?.isActive ? 'inactive' : 'active',
    }))
    setStatusErrors((current) => ({ ...current, userId: '' }))
    setStatusNotice(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = buildErrors(form)
    setErrors(nextErrors)
    setNotice(null)

    if (Object.keys(nextErrors).length) return

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
      setNotice({
        tone: 'success',
        text: `${selectedAccountType.label} account created. Use ${createdAccount?.email} with the password you entered to sign in now.`,
      })
      await loadManagedAccounts()
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

  const applyStatusChange = async ({ userId, isActive, reason }) => {
    setStatusLoading(true)
    setStatusActionTargetId(userId)
    try {
      const updatedAccount = await updateStaffAccountStatus(
        userId,
        {
          isActive,
          reason,
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
      setStatusForm({
        userId: updatedAccount?.id ?? '',
        targetStatus: updatedAccount?.isActive ? 'inactive' : 'active',
        reason: '',
      })
      await loadManagedAccounts()
      return updatedAccount
    } catch (error) {
      setStatusNotice({
        tone: 'error',
        text:
          error instanceof ApiError
            ? error.message
            : 'Unable to update the staff account status right now.',
      })
      return null
    } finally {
      setStatusLoading(false)
      setStatusActionTargetId('')
    }
  }

  const handleStatusSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = buildStatusErrors(statusForm)
    setStatusErrors(nextErrors)
    setStatusNotice(null)

    if (Object.keys(nextErrors).length) return

    await applyStatusChange({
      userId: statusForm.userId.trim(),
      isActive: statusForm.targetStatus === 'active',
      reason: statusForm.reason.trim() || undefined,
    })
  }

  const handleQuickStatusToggle = async (account) => {
    setStatusErrors({})
    setStatusNotice(null)
    setStatusForm({
      userId: account.id,
      targetStatus: account.isActive ? 'inactive' : 'active',
      reason: '',
    })

    await applyStatusChange({
      userId: account.id,
      isActive: !account.isActive,
      reason: account.isActive
        ? 'Deactivated from User Administration directory.'
        : 'Reactivated from User Administration directory.',
    })
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
      <SectionShell
        title="Provision Operations Accounts"
        description="Create staff, mechanic, technician, and admin identities from one protected workspace. Emails and staff IDs are generated automatically, and new accounts can sign in immediately with the password you set."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs font-semibold text-ink-secondary">
            <ShieldPlus size={14} />
            Protected provisioning
          </div>
        }
      >
        <Notice notice={notice} />

        {lastProvisionedAccount ? (
          <div className="mt-5 rounded-2xl border border-surface-border bg-surface-raised px-4 py-4 md:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  Last Created Account
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-ink-primary">
                  {lastProvisionedAccount.displayName || 'Staff Account'}
                </h3>
                <p className="mt-1 text-sm text-ink-secondary">{lastProvisionedAccount.email}</p>
              </div>
              <span className={`badge ${lastProvisionedAccount.isActive ? 'badge-green' : 'badge-gray'}`}>
                {lastProvisionedAccount.isActive ? 'Ready to login' : 'Inactive'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-ink-secondary md:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">Staff ID</p>
                <p className="mt-1 font-semibold text-ink-primary">{lastProvisionedAccount.staffCode || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">Role</p>
                <p className="mt-1 font-semibold text-ink-primary">{lastProvisionedAccount.roleLabel}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">Login Email</p>
                <p className="mt-1 break-all font-semibold text-ink-primary">{lastProvisionedAccount.email}</p>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2" noValidate>
          <Field label="First Name" error={errors.firstName}>
            <input
              value={form.firstName}
              onChange={(event) => handleChange('firstName', event.target.value)}
              className="input"
              placeholder="Maria"
            />
          </Field>

          <Field label="Last Name" error={errors.lastName}>
            <input
              value={form.lastName}
              onChange={(event) => handleChange('lastName', event.target.value)}
              className="input"
              placeholder="Santos"
            />
          </Field>

          <Field label="Password" error={errors.password}>
            <input
              type="password"
              value={form.password}
              onChange={(event) => handleChange('password', event.target.value)}
              className="input"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
          </Field>

          <Field
            label="Account Type"
            helper={`Backend access: ${selectedAccountType.roleLabel}. ${selectedAccountType.helper}`}
          >
            <div className="relative">
              <select
                value={form.accountType}
                onChange={(event) => handleChange('accountType', event.target.value)}
                className="select"
              >
                {accountTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <UserCog
                size={16}
                className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-ink-muted"
              />
            </div>
          </Field>

          <Field label="Phone Number" error={errors.phone}>
            <input
              value={form.phone}
              onChange={(event) => handleChange('phone', event.target.value)}
              className="input"
              placeholder="+639171234567"
              autoComplete="tel"
            />
          </Field>

          <div className="card-raised p-4 xl:col-span-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">
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
                <p className="mt-1 font-semibold text-ink-primary">{selectedAccountType.staffCodeExample}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 xl:col-span-2">
            <p className="max-w-xl text-xs leading-5 text-ink-muted">
              Staff sign-in uses the same staff/admin login page. No customer web registration is created here.
            </p>
            <button type="submit" disabled={loading} className="ops-action-primary min-w-[156px]">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldPlus size={14} />}
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </SectionShell>

      <SectionShell
        title="Account Status Control"
        description="Choose a staff-capable account from the directory and activate or deactivate access without deleting its history. Admin accounts appear as Admin, not Super Admin."
        action={
          <button
            type="button"
            onClick={loadManagedAccounts}
            className="ops-action-secondary min-w-[148px]"
            disabled={directoryState.status === 'loading'}
          >
            {directoryState.status === 'loading' ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh Accounts
          </button>
        }
      >
        {directoryState.message ? (
          <div className={`rounded-xl border px-4 py-3 text-xs ${
            directoryState.status === 'error'
              ? 'border-red-500/25 bg-red-500/10 text-red-300'
              : 'border-surface-border bg-surface-raised text-ink-muted'
          }`}>
            {directoryState.message}
          </div>
        ) : null}

        <div className="mt-5">
          <Notice notice={statusNotice} />
        </div>

        <form onSubmit={handleStatusSubmit} className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2" noValidate>
          <Field label="Staff Account" error={statusErrors.userId}>
            <select
              value={statusForm.userId}
              onChange={(event) => handleSelectStatusAccount(event.target.value)}
              className="select"
            >
              <option value="">Choose an account</option>
              {groupedAccountTypes.map((group) => {
                const groupAccounts = managedAccounts.filter((account) => account.accountType === group.value)
                if (!groupAccounts.length) return null

                return (
                  <optgroup key={group.value} label={group.label}>
                    {groupAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {StaffAccountOption({ account })}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </Field>

          <Field
            label="Target Status"
            helper={
              selectedStatusAccount
                ? `${selectedStatusAccount.displayName || selectedStatusAccount.email} is currently ${
                    selectedStatusAccount.isActive ? 'active' : 'inactive'
                  }.`
                : 'Choose an account first.'
            }
          >
            <div className="relative">
              <select
                value={statusForm.targetStatus}
                onChange={(event) => handleStatusChange('targetStatus', event.target.value)}
                className="select"
              >
                <option value="inactive">Set Inactive</option>
                <option value="active">Set Active</option>
              </select>
              <Power size={16} className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-ink-muted" />
            </div>
          </Field>

          <div className="xl:col-span-2">
            <Field label="Reason (Optional)" error={statusErrors.reason}>
              <input
                value={statusForm.reason}
                onChange={(event) => handleStatusChange('reason', event.target.value)}
                className="input"
                placeholder="Example: shift handover, temporary suspension, or reactivated for duty."
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 xl:col-span-2">
            <p className="max-w-xl text-xs leading-5 text-ink-muted">
              Status updates revoke active refresh tokens when an account is deactivated.
            </p>
            <button type="submit" disabled={statusLoading || !managedAccounts.length} className="ops-action-primary min-w-[156px]">
              {statusLoading ? <RefreshCw size={14} className="animate-spin" /> : <Power size={14} />}
              {statusLoading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
            Managed Account Directory
          </p>
          <div className="mt-3 space-y-3">
            {managedAccounts.length ? (
              managedAccounts.map((account) => {
                const isBusy = statusLoading && statusActionTargetId === account.id

                return (
                  <div
                    key={account.id}
                    className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-ink-primary">
                            {account.displayName || account.email}
                          </p>
                          <span className={`badge ${account.isActive ? 'badge-green' : 'badge-gray'}`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="badge badge-gray">{account.roleLabel}</span>
                        </div>
                        <p className="mt-2 break-all text-xs text-ink-secondary">{account.email}</p>
                        <p className="mt-1 text-[11px] text-ink-muted">
                          {account.staffCode || 'No staff code'} • {account.id}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectStatusAccount(account.id)}
                          className="ops-action-secondary"
                        >
                          Select in Form
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStatusToggle(account)}
                          disabled={statusLoading}
                          className={account.isActive ? 'ops-action-primary' : 'ops-action-secondary'}
                        >
                          {isBusy ? <RefreshCw size={14} className="animate-spin" /> : <Power size={14} />}
                          {account.isActive ? 'Deactivate Account' : 'Activate Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-4 text-xs text-ink-muted">
                No managed staff accounts are available yet.
              </div>
            )}
          </div>
        </div>
      </SectionShell>
    </section>
  )
}
