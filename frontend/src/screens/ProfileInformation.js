'use client'

import { useState } from 'react'
import { Building2, Mail, Phone, Save, ShieldCheck, User } from 'lucide-react'
import { normalizePhoneNumber, validatePhoneNumber } from '@autocare/shared'
import { useUserContext } from '@/lib/userContext.jsx'
import { useToast } from '@/components/Toast.jsx'
import { confirmStaffPhoneChangeOtp, requestStaffPhoneChangeOtp } from '@/lib/authClient'

export default function ProfileInformation() {
  const { user, updateUser } = useUserContext()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [loading, setLoading] = useState(false)
  const [otpDraft, setOtpDraft] = useState({
    enrollmentId: '',
    otp: '',
    pendingPhone: '',
  })
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false)
  const [phoneVerifyLoading, setPhoneVerifyLoading] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      toast({ type: 'error', title: 'Validation Error', message: 'Name cannot be empty.' })
      return
    }

    setLoading(true)
    try {
      const trimmedName = name.trim()
      const initials = trimmedName
        .split(/\s+/)
        .map((part) => part[0] || '')
        .slice(0, 2)
        .join('')
        .toUpperCase()

      await updateUser({
        firstName: trimmedName.split(/\s+/).slice(0, -1).join(' ') || trimmedName,
        lastName: trimmedName.split(/\s+/).slice(-1).join(' '),
        initials,
      })
      toast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your staff profile name has been saved.',
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Profile Save Failed',
        message: error?.message || 'We could not save your profile right now.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestPhoneOtp() {
    if (!user?.accessToken) {
      toast({ type: 'error', title: 'Session Required', message: 'Sign in again before changing the phone number.' })
      return
    }

    const normalizedPhone = normalizePhoneNumber(phone)
    const phoneError = validatePhoneNumber(normalizedPhone)
    if (phoneError) {
      toast({ type: 'error', title: 'Invalid Phone', message: phoneError })
      return
    }

    if (normalizedPhone === normalizePhoneNumber(user?.profile?.phone || '')) {
      toast({ type: 'error', title: 'No Change Detected', message: 'Enter a new phone number before requesting verification.' })
      return
    }

    setPhoneOtpLoading(true)
    try {
      const response = await requestStaffPhoneChangeOtp({
        accessToken: user.accessToken,
        phoneNumber: normalizedPhone,
      })
      setOtpDraft({
        enrollmentId: response?.enrollmentId ?? '',
        otp: '',
        pendingPhone: normalizedPhone,
      })
      toast({
        type: 'success',
        title: 'Verification Sent',
        message: `We sent an email OTP to ${response?.maskedEmail || user.email}. Verify it before the new phone number can be saved.`,
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'OTP Request Failed',
        message: error?.message || 'We could not send the phone-change OTP right now.',
      })
    } finally {
      setPhoneOtpLoading(false)
    }
  }

  async function handleVerifyPhoneOtp() {
    if (!user?.accessToken || !otpDraft.enrollmentId) {
      toast({ type: 'error', title: 'Verification Missing', message: 'Request a phone-change OTP first.' })
      return
    }

    if (String(otpDraft.otp).trim().length !== 6) {
      toast({ type: 'error', title: 'Incomplete OTP', message: 'Enter the full 6-digit OTP from your email.' })
      return
    }

    setPhoneVerifyLoading(true)
    try {
      const updatedUser = await confirmStaffPhoneChangeOtp({
        accessToken: user.accessToken,
        enrollmentId: otpDraft.enrollmentId,
        otp: otpDraft.otp,
        phoneNumber: otpDraft.pendingPhone,
      })

      await updateUser({
        profileSnapshot: updatedUser?.profile,
      })
      setOtpDraft({ enrollmentId: '', otp: '', pendingPhone: '' })
      toast({
        type: 'success',
        title: 'Phone Number Updated',
        message: 'The new staff phone number has been verified and saved.',
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'OTP Verification Failed',
        message: error?.message || 'We could not verify the phone-change OTP right now.',
      })
    } finally {
      setPhoneVerifyLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center">
          <User size={20} className="text-brand-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Profile Information</h1>
          <p className="text-sm text-ink-muted">Update the admin identity and contact details shown across the portal.</p>
        </div>
      </div>

      <section className="card p-6 md:p-7">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="settings-profile-name" className="label">Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
              <input
                id="settings-profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="input pl-10"
                placeholder="Your full name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-profile-email" className="label">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
              <input
                id="settings-profile-email"
                type="email"
                value={user?.email || ''}
                disabled
                className="input pl-10 opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-profile-phone" className="label">Phone Number</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
              <input
                id="settings-profile-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(normalizePhoneNumber(event.target.value))}
                className="input pl-10"
                placeholder="09XXXXXXXXX"
                maxLength={11}
              />
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Saving a new staff phone number now requires a 6-digit OTP sent to your staff email.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRequestPhoneOtp}
                disabled={phoneOtpLoading}
                className="btn-ghost"
              >
                <ShieldCheck size={15} />
                {phoneOtpLoading ? 'Sending OTP...' : 'Verify New Phone'}
              </button>
            </div>
            {otpDraft.enrollmentId ? (
              <div className="mt-4 rounded-2xl border border-surface-border bg-surface-raised/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Email OTP required</p>
                <p className="mt-2 text-sm text-ink-secondary">
                  Enter the 6-digit OTP sent to {user?.email}.
                </p>
                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otpDraft.otp}
                    onChange={(event) =>
                      setOtpDraft((current) => ({
                        ...current,
                        otp: event.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                    className="input md:max-w-[220px]"
                    placeholder="123456"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPhoneOtp}
                    disabled={phoneVerifyLoading}
                    className="btn-primary"
                  >
                    <ShieldCheck size={15} />
                    {phoneVerifyLoading ? 'Verifying...' : 'Confirm Phone Change'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 rounded-2xl border border-surface-border bg-surface-raised/70 p-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 border border-brand-orange/15 flex items-center justify-center">
              <Building2 size={16} className="text-brand-orange" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Role</p>
              <p className="text-sm font-semibold text-ink-primary">{user?.role || 'Administrator'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Contact rule</p>
            <p className="text-sm text-ink-secondary mt-1">Use an 11-digit PH mobile number starting with `09`, then confirm it through email OTP.</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Email policy</p>
            <p className="text-sm text-ink-secondary mt-1">Admin email stays read-only in the current staff workspace.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary min-w-[180px] disabled:opacity-50"
          >
            <Save size={15} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </section>
    </div>
  )
}
