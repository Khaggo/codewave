import Link from 'next/link'

export const metadata = { title: 'Service Timeline' }

export default function TimelinePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="card p-6">
        <span className="badge badge-green">Customer mobile feature</span>
        <h1 className="mt-4 text-2xl font-extrabold text-ink-primary">Vehicle lifecycle is handled in the mobile garage</h1>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          This staff web page no longer displays sample vehicle timelines. Customer-safe lifecycle history now belongs
          in the mobile Garage flow, while staff can continue work through job orders, QA, and invoice pages.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/job-orders" className="card p-5 transition hover:bg-surface-hover">
          <p className="text-sm font-bold text-ink-primary">Job Orders</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">Update workshop progress.</p>
        </Link>
        <Link href="/admin/qa-audit" className="card p-5 transition hover:bg-surface-hover">
          <p className="text-sm font-bold text-ink-primary">QA Audit</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">Review release readiness.</p>
        </Link>
        <Link href="/admin/invoices" className="card p-5 transition hover:bg-surface-hover">
          <p className="text-sm font-bold text-ink-primary">Invoices</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">Finalize customer billing.</p>
        </Link>
      </div>
    </div>
  )
}
