'use client'

import { ShieldAlert, UserCog, Wrench } from 'lucide-react'

import StaffProvisioningPanel from '@/components/StaffProvisioningPanel'
import { useUser } from '@/lib/userContext'

const accountTypeCards = [
  {
    title: 'Staff',
    copy: 'Front-desk and service-adviser style access for bookings, customer coordination, and daily operations.',
    icon: UserCog,
    accent: 'Operations access',
  },
  {
    title: 'Mechanic / Technician',
    copy: 'Workshop execution accounts. Mechanics currently share technician permissions in the live role model.',
    icon: Wrench,
    accent: 'Workshop access',
  },
  {
    title: 'Admin',
    copy: 'Protected super-admin access for provisioning, oversight, and sensitive backoffice workflows.',
    icon: ShieldAlert,
    accent: 'Protected access',
  },
]

export default function AdminUsersPage() {
  const user = useUser()
  const canManageUsers = user?.role === 'super_admin'

  if (!canManageUsers) {
    return (
      <section className="ops-page-shell">
        <div className="card p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#f07c00' }}>
          Restricted
        </p>
        <h1 className="mt-3 text-2xl font-black text-ink-primary">User Administration</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-secondary">
          Only super admins can create new staff, mechanic, technician, and admin accounts from this workspace.
        </p>
        </div>
      </section>
    )
  }

  return (
    <div className="ops-page-shell">
      <section className="ops-page-header">
        <div className="space-y-2">
          <p className="ops-page-kicker">Super Admin</p>
          <h1 className="ops-page-title">User Administration Workspace</h1>
          <p className="ops-page-copy">
            Provision operations accounts, capture the exact role mapping, and manage account status from one
            super-admin-only page. Created accounts can sign in immediately with the generated email and selected password.
          </p>
        </div>
      </section>

      <section className="ops-summary-grid">
        {accountTypeCards.map(({ title, copy, icon: Icon, accent }) => (
          <div key={title} className="card p-5 transition-colors hover:border-[rgba(240,124,0,0.35)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{accent}</p>
                <p className="mt-3 text-xl font-black tracking-tight text-ink-primary">{title}</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{copy}</p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
                <Icon size={14} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <StaffProvisioningPanel />
    </div>
  )
}
