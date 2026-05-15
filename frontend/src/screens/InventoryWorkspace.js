'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  Eye,
  Package,
  PencilLine,
  RefreshCcw,
  ShieldAlert,
  Warehouse,
} from 'lucide-react'

import {
  ACTION,
  addInventoryAdjustment,
  hasPermission,
  updateInventoryProductThreshold,
} from '@autocare/shared'

import { useToast } from '@/components/Toast.jsx'
import PageHeader from '@/components/ui/PageHeader'
import {
  useInventoryAdjustmentHistory,
  useInventoryProducts,
} from '@/hooks/useOperationsStore'
import { resolveSharedRole } from '@/lib/roleAccess'
import { useUser } from '@/lib/userContext'

import {
  buildInventorySummary,
  filterInventoryProducts,
  formatInventoryDelta,
  formatInventoryTimestamp,
  formatInventoryVisibility,
  getInventoryActorLabel,
  getInventoryStockStateMeta,
} from './inventoryWorkspaceView.mjs'

function StatCard({ icon: Icon, label, value, sub, toneClass }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            {label}
          </p>
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

const createAdjustmentDraft = () => ({
  actionType: 'add',
  quantity: '1',
  reason: '',
  note: '',
})

const createThresholdDraft = (product) => String(product?.lowStockThreshold ?? 0)

const formatLabel = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function InventoryWorkspace() {
  const user = useUser()
  const { toast } = useToast()
  const products = useInventoryProducts()
  const [catalogQuery, setCatalogQuery] = useState('')
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? null)
  const [adjustmentDraft, setAdjustmentDraft] = useState(createAdjustmentDraft)
  const [thresholdDraft, setThresholdDraft] = useState(createThresholdDraft(products[0]))

  const canManageInventory = hasPermission(
    resolveSharedRole(user?.roleLabel ?? user?.role),
    ACTION.INVENTORY_MANAGE,
  )

  useEffect(() => {
    setSelectedProductId((currentProductId) =>
      products.some((product) => product.id === currentProductId)
        ? currentProductId
        : products[0]?.id ?? null,
    )
  }, [products])

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  )

  const adjustmentHistory = useInventoryAdjustmentHistory(selectedProductId)

  useEffect(() => {
    setAdjustmentDraft(createAdjustmentDraft())
    setThresholdDraft(createThresholdDraft(selectedProduct))
  }, [selectedProductId, selectedProduct])

  const filteredProducts = useMemo(
    () => filterInventoryProducts(products, catalogQuery),
    [catalogQuery, products],
  )

  const summary = useMemo(() => buildInventorySummary(products), [products])

  const handleRefresh = () => {
    toast({
      type: 'info',
      title: 'Inventory queue refreshed',
      message: 'The page is already reading the live local stock workspace.',
    })
  }

  const handleThresholdSubmit = (event) => {
    event.preventDefault()

    if (!selectedProduct) {
      return
    }

    try {
      const nextProduct = updateInventoryProductThreshold(
        selectedProduct.id,
        Number(thresholdDraft),
      )

      setThresholdDraft(String(nextProduct.lowStockThreshold))
      toast({
        type: 'success',
        title: 'Threshold updated',
        message: `${nextProduct.name} now flags low stock at ${nextProduct.lowStockThreshold}.`,
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Threshold update failed',
        message: error instanceof Error ? error.message : 'Unable to update the low-stock threshold.',
      })
    }
  }

  const handleAdjustmentSubmit = (event) => {
    event.preventDefault()

    if (!selectedProduct) {
      return
    }

    try {
      const updatedProduct = addInventoryAdjustment(selectedProduct.id, {
        actor: getInventoryActorLabel(user),
        actionType: adjustmentDraft.actionType,
        quantity: Number(adjustmentDraft.quantity),
        reason: adjustmentDraft.reason,
        note: adjustmentDraft.note,
      })

      setAdjustmentDraft(createAdjustmentDraft())
      toast({
        type: 'success',
        title: 'Stock updated',
        message: `${updatedProduct.name} is now at ${updatedProduct.stock} on hand.`,
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Stock adjustment failed',
        message: error instanceof Error ? error.message : 'Unable to record the stock adjustment.',
      })
    }
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <InfoPanel
          icon={ShieldAlert}
          title="Staff sign-in required"
          body="Sign in as staff before managing stock from the inventory workspace."
        />
      </div>
    )
  }

  if (!canManageInventory) {
    return (
      <div className="space-y-6">
        <InfoPanel
          icon={ShieldAlert}
          title="Inventory access is limited"
          body="Only admin inventory roles can adjust stock or edit stock thresholds in this workspace."
        />
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Stock operations"
        title="Inventory"
        description="Manage stock levels, thresholds, and item availability for catalog products."
      />

      <section className="ops-summary-grid">
        <StatCard
          icon={Boxes}
          label="Catalog Products"
          value={summary.totalProducts}
          sub="Existing product records in stock control."
          toneClass="border-surface-border bg-surface-raised text-ink-secondary"
        />
        <StatCard
          icon={Warehouse}
          label="Low Stock"
          value={summary.lowStockProducts}
          sub="Needs supply attention."
          toneClass="border-brand-orange/15 bg-brand-orange/10 text-brand-orange"
        />
        <StatCard
          icon={AlertTriangle}
          label="Out of Stock"
          value={summary.outOfStockProducts}
          sub="Unavailable until adjusted."
          toneClass="surface-tone-danger"
        />
        <StatCard
          icon={Eye}
          label="Published"
          value={summary.publishedProducts}
          sub="Marketplace visibility stays separate."
          toneClass="surface-tone-success"
        />
      </section>

      <SectionShell
        title="Inventory Queue"
        description="Search existing catalog products and act on the live stock queue."
        action={
          <button
            type="button"
            className="ops-action-secondary min-w-[132px] self-start xl:self-auto"
            onClick={handleRefresh}
          >
            <RefreshCcw size={15} />
            Refresh
          </button>
        }
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              In view
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-primary">
              {filteredProducts.length}
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="empty-panel min-h-[180px]">
            <Package size={22} className="mx-auto text-ink-muted" />
            <p className="mt-3 text-sm font-semibold text-ink-primary">
              No catalog products are available
            </p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-secondary">
              Publish or create a catalog product first, then return here to manage its stock.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table w-full min-w-[1040px]" aria-label="Inventory stock table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Visibility</th>
                  <th>On Hand</th>
                  <th>Low-Stock Threshold</th>
                  <th>Stock State</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stockMeta = getInventoryStockStateMeta(product.stockState)
                  const isSelected = product.id === selectedProductId

                  return (
                    <tr key={product.id} className={isSelected ? 'bg-brand-orange/8' : undefined}>
                      <td>
                        <button
                          type="button"
                          className="flex items-center gap-3 text-left"
                          onClick={() => setSelectedProductId(product.id)}
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
                              isSelected
                                ? 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange'
                                : 'border-surface-border bg-surface-raised text-ink-muted'
                            }`}
                          >
                            <Package size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-ink-primary">{product.name}</p>
                            <p className="mt-1 text-xs text-ink-muted">
                              {product.description || 'No product description recorded.'}
                            </p>
                          </div>
                        </button>
                      </td>
                      <td>
                        <span className="rounded-lg bg-surface-raised px-2 py-1 font-mono text-xs font-semibold text-ink-primary">
                          {product.sku || 'No SKU'}
                        </span>
                      </td>
                      <td className="text-ink-secondary">{product.category}</td>
                      <td>
                        <span className={`badge ${product.status === 'published' ? 'badge-green' : 'badge-gray'}`}>
                          {formatInventoryVisibility(product.status)}
                        </span>
                      </td>
                      <td className="font-semibold text-ink-primary">{product.stock}</td>
                      <td className="text-ink-secondary">{product.lowStockThreshold}</td>
                      <td>
                        <span className={stockMeta.badgeClassName}>{stockMeta.label}</span>
                      </td>
                      <td className="text-ink-secondary">
                        {formatInventoryTimestamp(product.updatedAt ?? product.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {products.length > 0 && filteredProducts.length === 0 ? (
          <div className="empty-panel mt-4 min-h-[140px]">
            <Package size={20} className="mx-auto text-ink-muted" />
            <p className="mt-3 text-sm font-semibold text-ink-primary">
              No products match this search
            </p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-secondary">
              Try another product name, SKU, category, or description keyword.
            </p>
          </div>
        ) : null}
      </SectionShell>

      <SectionShell
        title="Selected Product"
        description="Review the selected product before updating stock or threshold settings."
        action={
          selectedProduct ? (
            <a href="/admin/catalog" className="ops-action-secondary min-w-[168px] justify-center">
              Manage in Catalog
            </a>
          ) : null
        }
      >
        {!selectedProduct ? (
          <div className="empty-panel min-h-[180px]">
            <Eye size={22} className="mx-auto text-ink-muted" />
            <p className="mt-3 text-sm font-semibold text-ink-primary">Select a product</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-secondary">
              Choose a queue row to review its stock and update controls.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl border border-surface-border bg-surface-raised p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={getInventoryStockStateMeta(selectedProduct.stockState).badgeClassName}>
                      {getInventoryStockStateMeta(selectedProduct.stockState).label}
                    </span>
                    <span className={`badge ${selectedProduct.status === 'published' ? 'badge-green' : 'badge-gray'}`}>
                      {formatInventoryVisibility(selectedProduct.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-ink-primary">
                    {selectedProduct.name}
                  </p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-secondary">
                    {selectedProduct.description || 'No product description recorded.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Last updated
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink-primary">
                    {formatInventoryTimestamp(selectedProduct.updatedAt ?? selectedProduct.createdAt)}
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">SKU</dt>
                  <dd className="mt-2 text-base font-semibold text-ink-primary">
                    {selectedProduct.sku || 'No SKU'}
                  </dd>
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Category</dt>
                  <dd className="mt-2 text-base font-semibold text-ink-primary">
                    {selectedProduct.category}
                  </dd>
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">On Hand</dt>
                  <dd className="mt-2 text-base font-semibold text-ink-primary">
                    {selectedProduct.stock}
                  </dd>
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Low-Stock Threshold
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-ink-primary">
                    {selectedProduct.lowStockThreshold}
                  </dd>
                </div>
                <div
                  className={`rounded-2xl border px-4 py-3 ${getInventoryStockStateMeta(selectedProduct.stockState).fieldClassName}`}
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em]">Stock State</dt>
                  <dd className="mt-2 text-base font-semibold">
                    {getInventoryStockStateMeta(selectedProduct.stockState).label}
                  </dd>
                </div>
              </dl>
            </div>

            <form
              className="rounded-3xl border border-surface-border bg-surface-card p-5"
              onSubmit={handleThresholdSubmit}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Low-stock threshold</p>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Set the quantity where this product moves into low-stock status.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="min-w-[180px]">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Threshold
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      className="input"
                      value={thresholdDraft}
                      onChange={(event) => setThresholdDraft(event.target.value)}
                    />
                  </label>
                  <button type="submit" className="ops-action-primary min-w-[156px]">
                    <PencilLine size={15} />
                    Update threshold
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </SectionShell>

      <SectionShell
        title="Stock Adjustment"
        description="Record a live stock change for the selected product."
      >
        {!selectedProduct ? (
          <div className="empty-panel min-h-[160px]">
            <Package size={20} className="mx-auto text-ink-muted" />
            <p className="mt-3 text-sm font-semibold text-ink-primary">No product selected</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-secondary">
              Select a product from the queue before recording a stock movement.
            </p>
          </div>
        ) : (
          <form className="grid gap-4 xl:grid-cols-[1fr_1fr]" onSubmit={handleAdjustmentSubmit}>
            <label>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Adjustment type
              </span>
              <select
                className="input"
                value={adjustmentDraft.actionType}
                onChange={(event) =>
                  setAdjustmentDraft((currentDraft) => ({
                    ...currentDraft,
                    actionType: event.target.value,
                  }))
                }
              >
                <option value="add">Add</option>
                <option value="subtract">Subtract</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Quantity
              </span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="input"
                value={adjustmentDraft.quantity}
                onChange={(event) =>
                  setAdjustmentDraft((currentDraft) => ({
                    ...currentDraft,
                    quantity: event.target.value,
                  }))
                }
              />
            </label>

            <label className="xl:col-span-2">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Reason
              </span>
              <input
                className="input"
                value={adjustmentDraft.reason}
                onChange={(event) =>
                  setAdjustmentDraft((currentDraft) => ({
                    ...currentDraft,
                    reason: event.target.value,
                  }))
                }
                placeholder="Required reason for the stock change"
              />
            </label>

            <label className="xl:col-span-2">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Note
              </span>
              <textarea
                className="input min-h-[112px] resize-y py-3"
                value={adjustmentDraft.note}
                onChange={(event) =>
                  setAdjustmentDraft((currentDraft) => ({
                    ...currentDraft,
                    note: event.target.value,
                  }))
                }
                placeholder="Optional context for the stock change"
              />
            </label>

            <div className="xl:col-span-2 flex justify-end">
              <button type="submit" className="ops-action-primary min-w-[156px]">
                Submit adjustment
              </button>
            </div>
          </form>
        )}
      </SectionShell>

      <SectionShell
        title="Adjustment History"
        description="Review the latest stock changes for this product."
      >
        {!selectedProduct ? (
          <div className="empty-panel min-h-[160px]">
            <Package size={20} className="mx-auto text-ink-muted" />
            <p className="mt-3 text-sm font-semibold text-ink-primary">No history to show</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-secondary">
              Select a product first to review its stock movement history.
            </p>
          </div>
        ) : adjustmentHistory.length === 0 ? (
          <div className="empty-panel min-h-[160px]">
            <Package size={20} className="mx-auto text-ink-muted" />
            <p className="mt-3 text-sm font-semibold text-ink-primary">
              No stock adjustments recorded yet
            </p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-secondary">
              The first live stock adjustment for this product will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {adjustmentHistory.map((record) => (
              <div
                key={record.id}
                className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`badge ${
                          record.actionType === 'add' ? 'badge-green' : 'badge-orange'
                        }`}
                      >
                        {formatLabel(record.actionType)}
                      </span>
                      <span className="rounded-lg bg-surface-card px-2 py-1 font-mono text-xs font-semibold text-ink-primary">
                        {formatInventoryDelta(record.delta)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink-primary">{record.reason}</p>
                    <p className="mt-1 text-sm text-ink-secondary">
                      {record.previousQuantity} to {record.newQuantity} on hand
                    </p>
                    {record.note ? (
                      <p className="mt-2 text-sm leading-6 text-ink-secondary">{record.note}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-ink-secondary">
                    <p>{record.actor}</p>
                    <p className="mt-1">{formatInventoryTimestamp(record.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionShell>
    </div>
  )
}
