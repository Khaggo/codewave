import PortalLink from '@/components/PortalLink'
import EcommerceUnavailableCard from '@/components/EcommerceUnavailableCard'
import PageHeader from '@/components/ui/PageHeader'
import { getStaffRedirectLinks } from '@/components/runtimeSurfaceView.mjs'
import { isEcommerceEnabled } from '@/lib/runtimeFlags'

export const metadata = { title: 'Shop & Inventory' }

export default function ShopPage() {
  if (!isEcommerceEnabled()) {
    return <EcommerceUnavailableCard title="Shop & Inventory is waiting for the ecommerce runtime" />
  }

  return (
    <div className="mx-auto max-w-3xl ops-page-shell">
      <PageHeader
        eyebrow="Store Operations"
        title="Shop Data Is Managed Through Admin Pages"
        description="This legacy shop route now points staff to the catalog and inventory workspaces so product and stock activity stays in the current operations surfaces."
        meta={<span className="badge badge-blue">Live admin surfaces</span>}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {getStaffRedirectLinks('shop').map((item) => (
          <PortalLink key={item.href} href={item.href} className="card p-5 transition hover:bg-surface-hover">
            <p className="text-sm font-bold text-ink-primary">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">{item.copy}</p>
          </PortalLink>
        ))}
      </div>
    </div>
  )
}
