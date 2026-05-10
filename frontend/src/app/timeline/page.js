import PortalLink from '@/components/PortalLink'
import PageHeader from '@/components/ui/PageHeader'
import { getStaffRedirectLinks } from '@/components/runtimeSurfaceView.mjs'

export const metadata = { title: 'Service Timeline' }

export default function TimelinePage() {
  return (
    <div className="mx-auto max-w-3xl ops-page-shell">
      <PageHeader
        eyebrow="Vehicle Lifecycle"
        title="Vehicle Lifecycle Is Handled In The Mobile Garage"
        description="Customer-safe lifecycle history now belongs in the mobile Garage flow, while staff continue work through job orders, QA, and invoice surfaces."
        meta={<span className="badge badge-green">Customer mobile feature</span>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {getStaffRedirectLinks('timeline').map((item) => (
          <PortalLink key={item.href} href={item.href} className="card p-5 transition hover:bg-surface-hover">
            <p className="text-sm font-bold text-ink-primary">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">{item.copy}</p>
          </PortalLink>
        ))}
      </div>
    </div>
  )
}
