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
        <h1 className="mt-3 text-2xl font-black text-ink-primary">User Provisioning</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-secondary">
          Only super admins can create new staff, mechanic, technician, and admin accounts from this workspace.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-2xl border p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(17,17,19,0.98) 0%, rgba(26,16,0,0.92) 100%)',
          borderColor: 'rgba(240,124,0,0.15)',
        }}
      >
        <div
          className="absolute right-0 top-0 h-56 w-56 rounded-full opacity-[0.08] blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f07c00, transparent)' }}
        />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#f07c00' }}>
            Super Admin
          </p>
          <h1 className="mt-3 text-3xl font-black text-ink-primary">User Creation Workspace</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
            Provision new operations accounts from one page. This keeps the web portal staff/admin-only while letting you create staff, mechanic, technician, and admin identities on demand.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {accountTypeCards.map(({ title, copy, icon: Icon }) => (
          <div key={title} className="card p-5">
            <div
              className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'rgba(240,124,0,0.12)' }}
            >
              <Icon size={18} style={{ color: '#f07c00' }} />
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
