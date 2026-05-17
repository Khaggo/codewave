'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, Eye, Package, RefreshCcw, ShieldAlert, Warehouse } from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import {
  createEmptyStaffInventorySnapshot,
  getStaffInventoryLoadState,
  staffInventoryKnownApiGaps,
} from '@/lib/api/generated/inventory/staff-web-inventory'
import { loadStaffInventorySnapshot } from '@/lib/inventoryAdminClient'
import { useUser } from '@/lib/userContext'

function StatCard({ icon: Icon, label, value, sub, toneClass }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-primary">{value}</p>
          {sub ? <p className="mt-1 text-xs text-ink-secondary">{sub}</p> : null}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon size={15} />
        </div>
      </div>
    </div>
  )
}

function InfoPanel({ icon: Icon = AlertTriangle, title, body }) {
  return (
    <div className="status-message status-message-warning flex gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink-primary">{title}</p>
        <p className="mt-1 text-sm leading-6 text-ink-secondary">{body}</p>
      </div>
    </div>
  )
}

function SectionShell({ title, description, action, children }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-surface-border bg-surface-raised/70 px-5 py-4">
        <div>
          <p className="card-title">{title}</p>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

const createInitialState = () => ({
  status: 'idle',
  snapshot: createEmptyStaffInventorySnapshot(),
})

export default function InventoryWorkspace() {
  const user = useUser()
  const [state, setState] = useState(createInitialState)
  const [catalogQuery, setCatalogQuery] = useState('')

  const loadInventory = useCallback(async () => {
    if (!user?.accessToken) {
      setState({
        status: 'error',
        snapshot: {
          ...createEmptyStaffInventorySnapshot(),
          errors: {
            products: 'Sign in as staff before loading inventory visibility.',
            categories: '',
          },
        },
      })
      return
    }

    setState((current) => ({ ...current, status: 'loading' }))

    try {
      const snapshot = await loadStaffInventorySnapshot({ accessToken: user.accessToken })
      setState({
        status: 'ready',
        snapshot,
      })
    } catch (error) {
      setState({
        status: 'error',
        snapshot: {
          ...createEmptyStaffInventorySnapshot(),
          errors: {
            products: error instanceof Error ? error.message : 'Unable to load inventory visibility right now.',
            categories: '',
          },
        },
      })
    }
  }, [user?.accessToken])

  useEffect(() => {
    void loadInventory()
  }, [loadInventory])

  const products = state.snapshot.products
  const filteredProducts = useMemo(() => {
    const normalizedQuery = catalogQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return products
    }

    return products.filter((product) =>
      [product.name, product.sku, product.categoryLabel, product.description].some((field) =>
        String(field ?? '').toLowerCase().includes(normalizedQuery),
      ),
    )
  }, [catalogQuery, products])

  const publishedCount = products.filter((product) => product.visibilityLabel === 'Published').length
  const hiddenCount = products.filter((product) => product.visibilityLabel !== 'Published').length
  const loadState = getStaffInventoryLoadState({
    hasSession: Boolean(user?.accessToken),
    canRead: ['service_adviser', 'super_admin'].includes(user?.role),
    products,
    runtimeUnavailable: state.snapshot.productsRuntimeUnavailable || state.snapshot.categoriesRuntimeUnavailable,
    partialFailure: Boolean(state.snapshot.errors.products || state.snapshot.errors.categories),
  })

  const refreshAction = (
    <button type="button" className="btn-ghost" onClick={() => void loadInventory()} disabled={state.status === 'loading'}>
      <RefreshCcw size={14} className={state.status === 'loading' ? 'animate-spin' : ''} />
      Refresh
    </button>
  )

  if (!user) {
    return (
      <div className="space-y-6">
        <InfoPanel
          icon={ShieldAlert}
          title="Staff sign-in required"
          body="Sign in as staff before managing inventory visibility from this workspace."
        />
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Stock operations"
        title="Inventory"
        description="Review the live ecommerce product directory and its current publication visibility."
        actions={refreshAction}
        meta={<span className="badge badge-gray">{loadState.replace('inventory_', '').replace(/_/g, ' ')}</span>}
      />

      {state.snapshot.errors.products ? (
        <InfoPanel title="Inventory runtime warning" body={state.snapshot.errors.products} />
      ) : null}

      <section className="ops-summary-grid">
        <StatCard
          icon={Boxes}
          label="Catalog Products"
          value={products.length}
          sub="Live ecommerce product records."
          toneClass="border-surface-border bg-surface-raised text-ink-secondary"
        />
        <StatCard
          icon={Eye}
          label="Published"
          value={publishedCount}
          sub="Visible to customers today."
          toneClass="surface-tone-success"
        />
        <StatCard
          icon={Warehouse}
          label="Hidden"
          value={hiddenCount}
          sub="Stored but not visible in the catalog."
          toneClass="border-surface-border bg-surface-raised text-ink-secondary"
        />
        <StatCard
          icon={Package}
          label="Categories"
          value={state.snapshot.categories.length}
          sub="Live category directory."
          toneClass="border-brand-orange/15 bg-brand-orange/10 text-brand-orange"
        />
      </section>

      <SectionShell
        title="Inventory Visibility"
        description="This surface now reflects the live ecommerce catalog. Quantity, reservation counts, and stock adjustments stay disabled until the backend exposes dedicated inventory routes."
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <label className="min-w-[260px] flex-1">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Search products
            </span>
            <input
              className="input"
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="Search by name, SKU, category, or description"
            />
          </label>
          <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">In view</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-primary">{filteredProducts.length}</p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-panel min-h-[180px]">
            <Package size={22} className="mx-auto text-ink-muted" />
            <p className="mt-3 text-sm font-semibold text-ink-primary">
              {products.length === 0 ? 'No live products are available' : 'No live products match this search'}
            </p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-secondary">
              {products.length === 0
                ? 'Publish or create a live catalog product first, then return here to inspect its visibility.'
                : 'Try another search term or clear the filter to inspect the full live catalog directory.'}
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table w-full min-w-[920px]" aria-label="Inventory product visibility table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Visibility</th>
                  <th>Price</th>
                  <th>Inventory detail</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="text-left">
                        <p className="font-semibold text-ink-primary">{product.name}</p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {product.description || 'No product description recorded.'}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className="rounded-lg bg-surface-raised px-2 py-1 font-mono text-xs font-semibold text-ink-primary">
                        {product.sku || 'No SKU'}
                      </span>
                    </td>
                    <td>{product.categoryLabel}</td>
                    <td>
                      <span className={`badge ${product.visibilityLabel === 'Published' ? 'badge-green' : 'badge-gray'}`}>
                        {product.visibilityLabel}
                      </span>
                    </td>
                    <td className="font-semibold text-ink-primary">{product.priceLabel}</td>
                    <td className="text-sm text-ink-secondary">{product.stockRouteLabel}</td>
                    <td className="text-sm text-ink-secondary">{new Date(product.updatedAt).toLocaleString('en-PH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>

      <SectionShell
        title="Live Boundaries"
        description="These are the known backend limits for the current inventory surface, kept explicit so staff do not mistake absent data for loaded stock truth."
      >
        <div className="grid gap-3">
          {staffInventoryKnownApiGaps.map((gap) => (
            <div key={gap} className="rounded-2xl border border-surface-border bg-surface-card px-4 py-4 text-sm text-ink-secondary">
              {gap}
            </div>
          ))}
        </div>
      </SectionShell>
    </div>
  )
}
