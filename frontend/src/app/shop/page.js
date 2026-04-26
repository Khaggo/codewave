import Link from 'next/link'

export const metadata = { title: 'Shop & Inventory' }

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="card p-6">
        <span className="badge badge-blue">Live admin surfaces</span>
        <h1 className="mt-4 text-2xl font-extrabold text-ink-primary">Shop data is managed through admin pages</h1>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          This legacy shop page no longer shows local demo inventory. Use the catalog and inventory workspaces
          below so the demo only presents live backend-backed product and stock workflows.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/catalog" className="card p-5 transition hover:bg-surface-hover">
          <p className="text-sm font-bold text-ink-primary">Catalog Admin</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">Create and edit sellable catalog items.</p>
        </Link>
        <Link href="/admin/inventory" className="card p-5 transition hover:bg-surface-hover">
          <p className="text-sm font-bold text-ink-primary">Inventory Admin</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">Review stock visibility and inventory status.</p>
        </Link>
      </div>
    </div>
  )
}
