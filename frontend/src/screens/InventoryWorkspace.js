'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, Eye, Package, RefreshCcw, ShieldAlert, Warehouse } from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import {
  createEmptyStaffInventorySnapshot,
  getStaffInventoryLoadState,
  staffInventoryKnownApiGaps,
} from '@/lib/api/generated/inventory/staff-web-inventory'
import {
  createStaffInventoryAdjustment,
  createStaffInventoryProduct,
  loadStaffInventorySnapshot,
  updateStaffInventoryPolicy,
} from '@/lib/inventoryAdminClient'
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

const createEmptyInventoryProductForm = () => ({
  categoryId: '',
  name: '',
  sku: '',
  description: '',
  pricePhp: '',
  quantityOnHand: '0',
  reorderThreshold: '0',
  isActive: true,
})

export default function InventoryWorkspace() {
  const user = useUser()
  const [state, setState] = useState(createInitialState)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [createForm, setCreateForm] = useState(createEmptyInventoryProductForm)
  const [policyForm, setPolicyForm] = useState({ quantityOnHand: '', reorderThreshold: '' })
  const [adjustmentForm, setAdjustmentForm] = useState({ quantityDelta: '', reason: '' })
  const [actionState, setActionState] = useState({ status: 'idle', message: '' })

  const loadInventory = useCallback(async () => {
    if (!user?.accessToken) {
      setState({
        status: 'error',
        snapshot: {
          ...createEmptyStaffInventorySnapshot(),
          errors: {
            products: 'Sign in as staff before loading inventory controls.',
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
            products: error instanceof Error ? error.message : 'Unable to load inventory controls right now.',
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
  const categories = state.snapshot.categories
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

  useEffect(() => {
    if (!filteredProducts.length) {
      setSelectedProductId('')
      return
    }

    setSelectedProductId((current) =>
      filteredProducts.some((product) => product.id === current) ? current : filteredProducts[0].id,
    )
  }, [filteredProducts])

  const selectedProduct = useMemo(
    () => filteredProducts.find((product) => product.id === selectedProductId) ?? null,
    [filteredProducts, selectedProductId],
  )

  useEffect(() => {
    if (!selectedProduct) {
      setPolicyForm({ quantityOnHand: '', reorderThreshold: '' })
      return
    }

    setPolicyForm({
      quantityOnHand: String(selectedProduct.quantityOnHand ?? 0),
      reorderThreshold: String(selectedProduct.reorderThreshold ?? 0),
    })
  }, [selectedProduct])

  const publishedCount = products.filter((product) => product.visibilityLabel === 'Published').length
  const lowStockCount = products.filter((product) => product.stockState === 'low_stock').length
  const outOfStockCount = products.filter((product) => product.stockState === 'out_of_stock').length
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

  const updateSnapshotProduct = useCallback((updatedProduct) => {
    setState((current) => ({
      ...current,
      snapshot: {
        ...current.snapshot,
        products: current.snapshot.products.some((product) => product.id === updatedProduct.id)
          ? current.snapshot.products.map((product) => (product.id === updatedProduct.id ? updatedProduct : product))
          : [updatedProduct, ...current.snapshot.products],
      },
    }))
  }, [])

  const handleCreateProduct = useCallback(async () => {
    if (!user?.accessToken) {
      return
    }

    setActionState({ status: 'loading', message: '' })
    try {
      const createdProduct = await createStaffInventoryProduct({
        accessToken: user.accessToken,
        ...createForm,
      })
      updateSnapshotProduct(createdProduct)
      setSelectedProductId(createdProduct.id)
      setCreateForm(createEmptyInventoryProductForm())
      setActionState({
        status: 'success',
        message: `Created inventory-backed product ${createdProduct.name}.`,
      })
    } catch (error) {
      setActionState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to create the inventory product.',
      })
    }
  }, [createForm, updateSnapshotProduct, user?.accessToken])

  const handleUpdatePolicy = useCallback(async () => {
    if (!selectedProduct || !user?.accessToken) {
      return
    }

    setActionState({ status: 'loading', message: '' })
    try {
      const updatedProduct = await updateStaffInventoryPolicy({
        accessToken: user.accessToken,
        productId: selectedProduct.id,
        ...policyForm,
      })
      updateSnapshotProduct(updatedProduct)
      setActionState({
        status: 'success',
        message: `Updated stock policy for ${updatedProduct.name}.`,
      })
    } catch (error) {
      setActionState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to update the stock policy.',
      })
    }
  }, [policyForm, selectedProduct, updateSnapshotProduct, user?.accessToken])

  const handleAdjustInventory = useCallback(async () => {
    if (!selectedProduct || !user?.accessToken) {
      return
    }

    setActionState({ status: 'loading', message: '' })
    try {
      const updatedProduct = await createStaffInventoryAdjustment({
        accessToken: user.accessToken,
        productId: selectedProduct.id,
        ...adjustmentForm,
      })
      updateSnapshotProduct(updatedProduct)
      setAdjustmentForm({ quantityDelta: '', reason: '' })
      setActionState({
        status: 'success',
        message: `Adjusted stock for ${updatedProduct.name}. Quantity is now ${updatedProduct.quantityOnHand}.`,
      })
    } catch (error) {
      setActionState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to adjust stock right now.',
      })
    }
  }, [adjustmentForm, selectedProduct, updateSnapshotProduct, user?.accessToken])

  if (!user) {
    return (
      <div className="space-y-6">
        <InfoPanel
          icon={ShieldAlert}
          title="Staff sign-in required"
          body="Sign in as staff before managing inventory controls from this workspace."
        />
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Stock operations"
        title="Inventory"
        description="Create inventory-backed products, adjust stock, and maintain low-stock thresholds from one live workspace."
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
          sub="Inventory-backed ecommerce product records."
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
          label="Low Stock"
          value={lowStockCount}
          sub="Products at or below threshold."
          toneClass="border-surface-border bg-surface-raised text-ink-secondary"
        />
        <StatCard
          icon={Package}
          label="Out Of Stock"
          value={outOfStockCount}
          sub="Products needing restock."
          toneClass="border-brand-orange/15 bg-brand-orange/10 text-brand-orange"
        />
      </section>

      <SectionShell
        title="Inventory Control Center"
        description="Create items, reconcile stock counts, and maintain live reorder thresholds without leaving this workspace."
      >
        {actionState.message ? (
          <div
            className={
              actionState.status === 'error'
                ? 'status-message status-message-warning mb-4'
                : 'status-message status-message-success mb-4'
            }
          >
            {actionState.message}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <p className="card-title">Create inventory item</p>
            <p className="mt-1 text-sm text-ink-muted">
              This creates a live catalog product and seeds its opening stock policy in one step.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label>
                <span className="label">Category</span>
                <select
                  className="select"
                  value={createForm.categoryId}
                  onChange={(event) => setCreateForm((current) => ({ ...current, categoryId: event.target.value }))}
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">SKU</span>
                <input
                  className="input"
                  value={createForm.sku}
                  onChange={(event) => setCreateForm((current) => ({ ...current, sku: event.target.value }))}
                  placeholder="ENG-OIL-5W30"
                />
              </label>
              <label className="md:col-span-2">
                <span className="label">Product name</span>
                <input
                  className="input"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Premium Engine Oil 5W-30"
                />
              </label>
              <label className="md:col-span-2">
                <span className="label">Description</span>
                <textarea
                  className="input min-h-[96px]"
                  value={createForm.description}
                  onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Live shelf description for staff and catalog teams."
                />
              </label>
              <label>
                <span className="label">Price (PHP)</span>
                <input
                  className="input"
                  value={createForm.pricePhp}
                  onChange={(event) => setCreateForm((current) => ({ ...current, pricePhp: event.target.value }))}
                  placeholder="1899"
                />
              </label>
              <label>
                <span className="label">Opening quantity</span>
                <input
                  className="input"
                  value={createForm.quantityOnHand}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, quantityOnHand: event.target.value }))
                  }
                  placeholder="12"
                />
              </label>
              <label>
                <span className="label">Low-stock threshold</span>
                <input
                  className="input"
                  value={createForm.reorderThreshold}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, reorderThreshold: event.target.value }))
                  }
                  placeholder="4"
                />
              </label>
              <label className="flex items-center gap-3 pt-7">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) => setCreateForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                <span className="text-sm text-ink-secondary">Publish immediately</span>
              </label>
            </div>
            <div className="mt-4">
              <button type="button" className="btn-primary" onClick={() => void handleCreateProduct()}>
                Create inventory item
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <p className="card-title">Stock actions</p>
            <p className="mt-1 text-sm text-ink-muted">
              Pick a live product from the directory below, then update its threshold or adjust quantity.
            </p>
            <div className="mt-4 space-y-4">
              <label>
                <span className="label">Selected product</span>
                <select
                  className="select"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                >
                  <option value="">Choose a product</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </label>

              {selectedProduct ? (
                <>
                  <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-secondary">
                    <p className="font-semibold text-ink-primary">{selectedProduct.name}</p>
                    <p className="mt-1">
                      {selectedProduct.quantityOnHand} on hand · threshold {selectedProduct.reorderThreshold} ·{' '}
                      {selectedProduct.visibilityLabel}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label>
                      <span className="label">Quantity on hand</span>
                      <input
                        className="input"
                        value={policyForm.quantityOnHand}
                        onChange={(event) =>
                          setPolicyForm((current) => ({ ...current, quantityOnHand: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span className="label">Low-stock threshold</span>
                      <input
                        className="input"
                        value={policyForm.reorderThreshold}
                        onChange={(event) =>
                          setPolicyForm((current) => ({ ...current, reorderThreshold: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => void handleUpdatePolicy()}>
                    Save stock policy
                  </button>

                  <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                    <p className="text-sm font-semibold text-ink-primary">Stock adjustment</p>
                    <div className="mt-3 grid gap-3">
                      <label>
                        <span className="label">Quantity delta</span>
                        <input
                          className="input"
                          value={adjustmentForm.quantityDelta}
                          onChange={(event) =>
                            setAdjustmentForm((current) => ({ ...current, quantityDelta: event.target.value }))
                          }
                          placeholder="Use positive for restock, negative for shrinkage"
                        />
                      </label>
                      <label>
                        <span className="label">Reason</span>
                        <input
                          className="input"
                          value={adjustmentForm.reason}
                          onChange={(event) =>
                            setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))
                          }
                          placeholder="Cycle count, supplier delivery, damaged stock, etc."
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn-primary mt-4"
                      onClick={() => void handleAdjustInventory()}
                    >
                      Save stock adjustment
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-5 text-sm text-ink-muted">
                  Load or create a product first, then use this panel to manage live stock.
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell
        title="Live inventory directory"
        description="Search the linked product set and review visibility, quantity, and threshold state at a glance."
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
                ? 'Create the first inventory-backed product above to start managing stock.'
                : 'Try another search term or clear the filter to inspect the full live inventory directory.'}
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table w-full min-w-[1080px]" aria-label="Inventory product table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Visibility</th>
                  <th>Price</th>
                  <th>On hand</th>
                  <th>Threshold</th>
                  <th>Stock state</th>
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
                    <td className="text-sm font-semibold text-ink-primary">{product.quantityOnHand}</td>
                    <td className="text-sm text-ink-secondary">{product.reorderThreshold}</td>
                    <td>
                      <span
                        className={`badge ${
                          product.stockState === 'out_of_stock'
                            ? 'badge-gray'
                            : product.stockState === 'low_stock'
                              ? 'badge-orange'
                              : 'badge-green'
                        }`}
                      >
                        {product.stockState === 'out_of_stock'
                          ? 'Out of stock'
                          : product.stockState === 'low_stock'
                            ? 'Low stock'
                            : 'In stock'}
                      </span>
                    </td>
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
        description="These are the remaining limits for the current inventory surface so staff know what is live and what is still pending."
      >
        <div className="grid gap-3">
          {staffInventoryKnownApiGaps.map((gap) => (
            <div
              key={gap}
              className="rounded-2xl border border-surface-border bg-surface-card px-4 py-4 text-sm text-ink-secondary"
            >
              {gap}
            </div>
          ))}
        </div>
      </SectionShell>
    </div>
  )
}
