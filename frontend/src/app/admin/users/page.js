'use client'

import { ShieldAlert, UserCog, Wrench } from 'lucide-react'

import StaffProvisioningPanel from '@/components/StaffProvisioningPanel'
import PageHeader from '@/components/ui/PageHeader'
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
        <PageHeader
          eyebrow="Restricted"
          title="User Administration"
          description="Only super admins can create new staff, mechanic, technician, and admin accounts from this workspace."
        />
        <div className="empty-panel">
          <ShieldAlert size={28} className="mx-auto text-brand-orange" />
          <p className="mt-3 text-sm font-semibold text-ink-primary">Super admin access required</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Provisioning, role assignment, and account status changes stay limited to authorized admin sessions.
          </p>
        </div>
      </section>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Super Admin"
        title="User Administration Workspace"
        description="Provision operations accounts, capture the exact role mapping, and manage account status from one protected admin workspace. Created accounts can sign in immediately with the generated email and selected password."
      />

      <section className="ops-summary-grid">
        {accountTypeCards.map(({ title, copy, icon: Icon, accent }) => (
          <div key={title} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{accent}</p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-ink-primary">{title}</p>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">{copy}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
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
