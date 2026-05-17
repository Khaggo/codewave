import { ecommerceUnavailableMessage } from '@/lib/runtimeFlags'
import { getRuntimeRecoveryCopy } from './runtimeSurfaceView.mjs'

export default function EcommerceUnavailableCard({
  title = 'Catalog And Inventory Runtime Unavailable',
  detail = ecommerceUnavailableMessage(),
}) {
  return (
    <div className="mx-auto max-w-3xl empty-panel text-left">
      <span className="badge badge-gray">Runtime unavailable</span>
      <h1 className="mt-4 text-2xl font-extrabold text-ink-primary">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{detail}</p>
      <p className="mt-3 text-xs leading-5 text-ink-muted">
        {getRuntimeRecoveryCopy()}
      </p>
    </div>
  )
}
