'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Eye,
  Package,
  PencilLine,
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
  const searchParams = useSearchParams()
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

  const requestedProductId = searchParams?.get('product')

  useEffect(() => {
    setSelectedProductId((currentProductId) =>
      products.some((product) => product.id === currentProductId)
        ? currentProductId
        : products[0]?.id ?? null,
    )
  }, [products])

  useEffect(() => {
    if (!requestedProductId) {
      return
    }

    if (products.some((product) => product.id === requestedProductId)) {
      setSelectedProductId(requestedProductId)
    }
  }, [products, requestedProductId])

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

  const handleSelectProduct = (productId) => {
    setSelectedProductId(productId)
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

      <SectionShell title="Inventory Queue" description="Search existing catalog products and act on the live stock queue.">
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stockMeta = getInventoryStockStateMeta(product.stockState)
                  const isSelected = product.id === selectedProductId
                  const rowHistory = adjustmentHistory.filter((record) => record.productId === product.id)

                  return (
                    <Fragment key={product.id}>
                      <tr key={product.id} className={isSelected ? 'bg-brand-orange/8' : undefined}>
                        <td>
                          <button
                            type="button"
                            className="flex items-center gap-3 text-left"
                            onClick={() => handleSelectProduct(product.id)}
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
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-xl border border-brand-orange/20 bg-brand-orange/10 px-3 py-2 text-xs font-semibold text-brand-orange transition-colors hover:bg-brand-orange/15"
                              onClick={() => handleSelectProduct(product.id)}
                            >
                              <PencilLine size={14} />
                              Adjust stock
                            </button>
                            <a
                              href="/admin/catalog"
                              className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
                            >
                              Manage in Catalog
                            </a>
                          </div>
                        </td>
                      </tr>
                      {isSelected ? (
                        <tr>
                          <td colSpan={9} className="bg-brand-orange/4 px-4 py-4">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                              <div className="space-y-4">
                                <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={stockMeta.badgeClassName}>{stockMeta.label}</span>
                                    <span className={`badge ${product.status === 'published' ? 'badge-green' : 'badge-gray'}`}>
                                      {formatInventoryVisibility(product.status)}
                                    </span>
                                  </div>
                                  <p className="mt-3 text-lg font-semibold text-ink-primary">{product.name}</p>
                                  <p className="mt-1 text-sm text-ink-secondary">
                                    {product.description || 'No product description recorded.'}
                                  </p>
                                  <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-xl border border-surface-border bg-surface-raised px-3 py-3">
                                      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">On hand</dt>
                                      <dd className="mt-2 text-base font-semibold text-ink-primary">{product.stock}</dd>
                                    </div>
                                    <div className="rounded-xl border border-surface-border bg-surface-raised px-3 py-3">
                                      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Threshold</dt>
                                      <dd className="mt-2 text-base font-semibold text-ink-primary">{product.lowStockThreshold}</dd>
                                    </div>
                                    <div className="rounded-xl border border-surface-border bg-surface-raised px-3 py-3">
                                      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">SKU</dt>
                                      <dd className="mt-2 text-base font-semibold text-ink-primary">{product.sku || 'No SKU'}</dd>
                                    </div>
                                    <div className="rounded-xl border border-surface-border bg-surface-raised px-3 py-3">
                                      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Updated</dt>
                                      <dd className="mt-2 text-base font-semibold text-ink-primary">
                                        {formatInventoryTimestamp(product.updatedAt ?? product.createdAt)}
                                      </dd>
                                    </div>
                                  </dl>
                                </div>

                                <form
                                  className="rounded-2xl border border-surface-border bg-surface-card p-4"
                                  onSubmit={handleThresholdSubmit}
                                >
                                  <div className="flex flex-wrap items-end gap-3">
                                    <label className="min-w-[180px] flex-1">
                                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                                        Low-stock threshold
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
                                    <button type="submit" className="ops-action-secondary min-w-[180px] justify-center">
                                      <PencilLine size={14} />
                                      Update threshold
                                    </button>
                                  </div>
                                </form>
                              </div>

                              <div className="space-y-4">
                                <form className="rounded-2xl border border-surface-border bg-surface-card p-4" onSubmit={handleAdjustmentSubmit}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-ink-primary">Stock adjustment</p>
                                      <p className="mt-1 text-sm text-ink-secondary">Update this product without leaving the queue.</p>
                                    </div>
                                  </div>
                                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <label>
                                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                                        Action
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
                                        <option value="add">Add stock</option>
                                        <option value="subtract">Subtract stock</option>
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
                                    <label className="md:col-span-2">
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
                                    <label className="md:col-span-2">
                                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                                        Note
                                      </span>
                                      <textarea
                                        className="input min-h-[92px] resize-y py-3"
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
                                  </div>
                                  <div className="mt-4 flex justify-end">
                                    <button type="submit" className="ops-action-primary min-w-[172px] justify-center">
                                      {adjustmentDraft.actionType === 'add' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                      Submit adjustment
                                    </button>
                                  </div>
                                </form>

                                <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-ink-primary">Latest adjustments</p>
                                      <p className="mt-1 text-sm text-ink-secondary">Recent stock changes for this product.</p>
                                    </div>
                                    <a href="/admin/catalog" className="ops-action-secondary min-w-[168px] justify-center">
                                      Manage in Catalog
                                    </a>
                                  </div>
                                  <div className="mt-4 space-y-3">
                                    {rowHistory.length === 0 ? (
                                      <div className="rounded-2xl border border-dashed border-surface-border bg-surface-raised px-4 py-6 text-sm text-ink-secondary">
                                        No stock adjustments recorded yet.
                                      </div>
                                    ) : (
                                      rowHistory.slice(0, 3).map((record) => (
                                        <div
                                          key={record.id}
                                          className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-4"
                                        >
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className={`badge ${record.actionType === 'add' ? 'badge-green' : 'badge-orange'}`}>
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
                                            </div>
                                            <div className="text-right text-sm text-ink-secondary">
                                              <p>{record.actor}</p>
                                              <p className="mt-1">{formatInventoryTimestamp(record.timestamp)}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
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

    </div>
  )
}
