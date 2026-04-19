'use client'

import { useState } from 'react'
import { Building2, Mail, Phone, Save, User } from 'lucide-react'
import { normalizePhoneNumber, validatePhoneNumber } from '@autocare/shared'
import { useUserContext } from '@/lib/userContext.jsx'
import { useToast } from '@/components/Toast.jsx'

export default function ProfileInformation() {
  const { user, updateUser } = useUserContext()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [loading, setLoading] = useState(false)

  function handleSave() {
    if (!name.trim()) {
      toast({ type: 'error', title: 'Validation Error', message: 'Name cannot be empty.' })
      return
    }

    if (phone) {
      const phoneError = validatePhoneNumber(phone)
      if (phoneError) {
        toast({ type: 'error', title: 'Invalid Phone', message: phoneError })
        return
      }
    }

    setLoading(true)

    setTimeout(() => {
      const trimmedName = name.trim()
      const initials = trimmedName
        .split(/\s+/)
        .map((part) => part[0] || '')
        .slice(0, 2)
        .join('')
        .toUpperCase()

      updateUser({
        name: trimmedName,
        phone: normalizePhoneNumber(phone),
        initials,
      })
      setLoading(false)
      toast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your admin profile has been refreshed.',
      })
    }, 500)
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
            <p className="text-sm text-ink-secondary mt-1">Use an 11-digit PH mobile number starting with `09`.</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Email policy</p>
            <p className="text-sm text-ink-secondary mt-1">Admin email stays read-only in this prototype.</p>
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
