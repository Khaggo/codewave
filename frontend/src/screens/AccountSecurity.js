'use client'

import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Shield,
} from 'lucide-react'
import { useUserContext } from '@/lib/userContext.jsx'
import { useToast } from '@/components/Toast.jsx'
import OtpModal from '@/components/OtpModal'
import {
  getChangePasswordChecklistState,
  passwordRequirementItems,
  validateChangePassword,
} from '@autocare/shared'

const MOCK_PASSWORDS = {
  'admin@cruiserscrib.com': 'Admin@123',
  'staff@cruiserscrib.com': 'Staff@123',
  'manager@cruiserscrib.com': 'Mgr@123',
}

function ChecklistRow({ met, label }) {
  return (
    <div className="flex items-center gap-2.5">
      {met ? (
        <CheckCircle2 size={14} className="flex-shrink-0 text-emerald-400" />
      ) : (
        <Circle size={14} className="flex-shrink-0 text-ink-dim" />
      )}
      <span className={`text-xs ${met ? 'text-emerald-300' : 'text-ink-muted'}`}>{label}</span>
    </div>
  )
}

export default function AccountSecurity() {
  const { user } = useUserContext()
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showOtp, setShowOtp] = useState(false)

  const savedPassword = MOCK_PASSWORDS[user?.email] || ''
  const checklistState = useMemo(
    () =>
      getChangePasswordChecklistState({
        currentPassword,
        newPassword,
        confirmPassword,
        savedPassword,
      }),
    [confirmPassword, currentPassword, newPassword, savedPassword],
  )

  function handleSubmit() {
    const nextErrors = validateChangePassword({
      currentPassword,
      newPassword,
      confirmPassword,
      savedPassword,
    })

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setShowOtp(true)
  }

  function handleOtpVerify() {
    setShowOtp(false)
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
      toast({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been updated successfully.',
      })
    }, 600)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center">
            <Shield size={20} className="text-brand-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink-primary">Account Security</h1>
            <p className="text-sm text-ink-muted">Keep your admin access protected with a verified password change.</p>
          </div>
        </div>
      </div>

      <section className="card p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <p className="card-title">Password Management</p>
            <p className="text-sm text-ink-muted mt-1">
              Enter your current password, choose a stronger replacement, and confirm with OTP.
            </p>
          </div>
          <span className="badge badge-orange">OTP Required</span>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="settings-current-password" className="label">Current Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
              <input
                id="settings-current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value)
                  setErrors((current) => ({ ...current, currentPassword: '' }))
                }}
                className={`input pl-10 pr-11 ${errors.currentPassword ? 'border-red-500/50' : ''}`}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((value) => !value)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink-secondary transition-colors"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.currentPassword ? <p className="text-xs text-red-400 mt-1.5">{errors.currentPassword}</p> : null}
          </div>

          <div>
            <label htmlFor="settings-new-password" className="label">New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
              <input
                id="settings-new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  setErrors((current) => ({ ...current, newPassword: '' }))
                }}
                className={`input pl-10 pr-11 ${errors.newPassword ? 'border-red-500/50' : ''}`}
                placeholder="Create a new password"
              />
              <button
                type="button"
                onClick={() => setShowNew((value) => !value)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink-secondary transition-colors"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword ? <p className="text-xs text-red-400 mt-1.5">{errors.newPassword}</p> : null}
          </div>

          <div>
            <label htmlFor="settings-confirm-password" className="label">Re-enter Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
              <input
                id="settings-confirm-password"
                aria-label="Confirm New Password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setErrors((current) => ({ ...current, confirmPassword: '' }))
                }}
                className={`input pl-10 pr-11 ${
                  errors.confirmPassword
                    ? 'border-red-500/50'
                    : checklistState.confirmPasswordMatches
                      ? 'border-emerald-500/50'
                      : ''
                }`}
                placeholder="Re-enter your new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((value) => !value)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink-secondary transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p className="text-xs text-red-400 mt-1.5">{errors.confirmPassword}</p>
            ) : checklistState.confirmPasswordMatches ? (
              <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Passwords match
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-surface-border bg-surface-raised/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Realtime Validation</p>
          <div className="grid gap-2">
            {passwordRequirementItems.map((item) => (
              <ChecklistRow
                key={item.key}
                label={item.label}
                met={checklistState.requirements[item.key]}
              />
            ))}
            <ChecklistRow
              label="Current password matches your active credentials"
              met={checklistState.currentPasswordMatches}
            />
            <ChecklistRow
              label="New password is different from current password"
              met={checklistState.newPasswordDiffersFromCurrent}
            />
            <ChecklistRow
              label="Re-entered password matches the new password"
              met={checklistState.confirmPasswordMatches}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary min-w-[190px] disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </section>

      <OtpModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onVerify={handleOtpVerify}
        onInvalidCode={() =>
          toast({
            type: 'error',
            title: 'Wrong Code',
            message: 'The verification code is incorrect. Please try again.',
          })
        }
        email={user?.email}
        purpose="password-change"
      />
    </div>
  )
}
