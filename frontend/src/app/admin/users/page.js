'use client'

import { ShieldAlert, UserCog, Wrench } from 'lucide-react'

import StaffProvisioningPanel from '@/components/StaffProvisioningPanel'
import { useUser } from '@/lib/userContext'

const accountTypeCards = [
  {
    title: 'Staff',
    copy: 'Front-desk and service-adviser style access for bookings, customer coordination, and daily operations.',
    icon: UserCog,
  },
  {
    title: 'Mechanic / Technician',
    copy: 'Workshop execution accounts. Mechanics currently share technician permissions in the live role model.',
    icon: Wrench,
  },
  {
    title: 'Admin',
    copy: 'Protected super-admin access for provisioning, oversight, and sensitive backoffice workflows.',
    icon: ShieldAlert,
  },
]

export default function AdminUsersPage() {
  const user = useUser()
  const canManageUsers = user?.role === 'super_admin'

  if (!canManageUsers) {
    return (
      <section className="card p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#f07c00' }}>
          Restricted
        </p>
        <h1 className="mt-3 text-2xl font-black text-ink-primary">User Administration</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-secondary">
          Only super admins can create new staff, mechanic, technician, and admin accounts from this workspace.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-brand-orange/10 to-transparent" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">
            Super Admin
          </p>
          <h1 className="mt-3 text-3xl font-black text-ink-primary">User Administration Workspace</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
            Provision operations accounts, capture the exact role mapping, and manage account status from one
            super-admin-only page. Created accounts can sign in immediately with the generated email and selected password.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {accountTypeCards.map(({ title, copy, icon: Icon }) => (
          <div key={title} className="card p-5">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Icon size={18} />
            </div>
            <h2 className="text-lg font-extrabold text-ink-primary">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">{copy}</p>
          </div>
        ))}
      </section>

      <StaffProvisioningPanel />
    </div>
  )
}
