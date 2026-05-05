import { ecommerceUnavailableMessage } from '@/lib/runtimeFlags'

export default function EcommerceUnavailableCard({
  title = 'Ecommerce Surface Offline',
  detail = ecommerceUnavailableMessage(),
}) {
  return (
    <div className="mx-auto max-w-3xl card p-6">
      <span className="badge badge-gray">Runtime unavailable</span>
      <h1 className="mt-4 text-2xl font-extrabold text-ink-primary">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{detail}</p>
      <p className="mt-3 text-xs leading-5 text-ink-muted">
        Bring up the ecommerce service and verify <code>NEXT_PUBLIC_ECOMMERCE_API_BASE_URL</code> (or the main API
        base URL fallback) so these pages can reconnect to the live catalog and inventory runtime.
      </p>
    </div>
  )
}
