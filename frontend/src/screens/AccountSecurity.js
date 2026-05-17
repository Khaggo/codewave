'use client'

import { AlertTriangle, Mail, Shield } from 'lucide-react'
import { useUserContext } from '@/lib/userContext.jsx'

export default function AccountSecurity() {
  const { user } = useUserContext()

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
              Web self-service password changes are temporarily paused until the live staff OTP flow is fully connected.
            </p>
          </div>
          <span className="badge badge-orange">Temporarily Paused</span>
        </div>

        <div className="grid gap-4">
          <div className="status-message status-message-warning">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-300" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink-primary">Password self-service is paused</p>
                <p className="text-sm text-ink-secondary">
                  This tab previously depended on a temporary verification flow that is no longer shown to staff. Self-service password updates stay unavailable here until the production verification flow is connected end to end.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-surface-border bg-surface-raised/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">What to do instead</p>
            <div className="grid gap-2 text-sm text-ink-secondary">
              <p>1. Ask a super admin to rotate or reprovision the staff account password from Staff Accounts.</p>
              <p>2. Sign out from shared browsers after password-related account work.</p>
              <p>3. Wait for the live staff OTP password flow before re-enabling web self-service changes.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-subtle/70 p-4">
            <div className="flex items-start gap-3">
              <Mail size={18} className="mt-0.5 flex-shrink-0 text-brand-orange" />
              <div>
                <p className="text-sm font-semibold text-ink-primary">Current account</p>
                <p className="text-sm text-ink-secondary">
                  {user?.email || 'Signed-in staff account'} remains active. No password change was attempted from this page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
