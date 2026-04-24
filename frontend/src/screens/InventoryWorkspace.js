'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Boxes,
  Database,
  Eye,
  LoaderCircle,
  Package,
  RefreshCcw,
  ShieldAlert,
  Tag,
  Warehouse,
} from 'lucide-react'

import { useToast } from '@/components/Toast.jsx'
import { ApiError } from '@/lib/authClient'
import { useUser } from '@/lib/userContext'
import {
  getEcommerceInventoryApiBaseUrl,
  getStaffInventoryProductDetail,
  loadStaffInventorySnapshot,
} from '@/lib/inventoryAdminClient'
import {
  canStaffReadInventory,
  createEmptyStaffInventorySnapshot,
  getStaffInventoryDetailState,
  getStaffInventoryLoadState,
  staffInventoryKnownApiGaps,
  staffInventoryRouteRules,
  staffInventoryStateScenarios,
} from '@/lib/api/generated/inventory/staff-web-inventory'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } },
}

const LOAD_STATE_LABELS = {
  inventory_loading: 'Loading Inventory Visibility',
  inventory_loaded: 'Live Catalog Visibility Ready',
  inventory_partial: 'Partially Loaded',
  inventory_empty: 'Catalog Visibility Empty',
  inventory_service_unavailable: 'Ecommerce Runtime Unavailable',
  inventory_forbidden_role: 'Role Blocked',
  inventory_unauthorized: 'Sign-In Required',
  inventory_failed: 'Inventory Visibility Failed',
}

function StatCard({ icon: Icon, label, value, sub, toneClass }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{label}</p>
          <p className="mt-3 text-3xl font-bold text-ink-primary">{value}</p>
          {sub ? <p className="mt-2 text-xs leading-5 text-ink-muted">{sub}</p> : null}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function InfoPanel({ icon: Icon = Database, title, body, tone = 'info' }) {
  const iconTone =
    tone === 'warning'
      ? 'border-red-500/20 bg-red-500/10 text-red-400'
      : 'border-brand-orange/15 bg-brand-orange/10 text-brand-orange'

  return (
    <div className="card p-4 flex gap-3">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border ${iconTone}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-bold text-ink-primary">{title}</p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">{body}</p>
      </div>
    </div>
  )
}

function SectionShell({ title, description, children, action }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-surface-border bg-surface-raised/70 px-5 py-4">
        <div>
          <p className="text-lg font-bold text-ink-primary">{title}</p>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function RouteBadge({ status }) {
  const badgeClass = status === 'live' ? 'badge-green' : 'badge-orange'

  return <span className={`badge ${badgeClass}`}>{status === 'live' ? 'Live' : 'Planned'}</span>
}

function StockScenarioCard({ item }) {
  const badgeClass =
    item.key === 'out_of_stock'
      ? 'badge-red'
      : item.key === 'low_stock'
        ? 'badge-orange'
        : item.key === 'reserved'
          ? 'badge-blue'
          : 'badge-green'

  return (
    <motion.article variants={itemVariants} className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-ink-primary">{item.label}</p>
          <p className="mt-1 text-sm text-ink-muted">{item.notes}</p>
        </div>
        <span className={`badge ${badgeClass}`}>{item.routeStatus === 'planned' ? 'Planned State' : 'Live State'}</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Availability Example</p>
          <p className="mt-2 text-base font-bold text-ink-primary">{item.quantityLabel}</p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Reservation Example</p>
          <p className="mt-2 text-base font-bold text-ink-primary">{item.reservationLabel}</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-ink-secondary">{item.customerImpact}</p>
    </motion.article>
  )
}

export default function InventoryWorkspace() {
  const user = useUser()
  const { toast } = useToast()
  const [snapshot, setSnapshot] = useState(createEmptyStaffInventorySnapshot)
  const [requestState, setRequestState] = useState('inventory_loading')
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [detailState, setDetailState] = useState({
    status: 'detail_idle',
    product: null,
    errorMessage: '',
  })

  const canRead = canStaffReadInventory(user)

  const loadInventory = useCallback(
    async ({ notifyFailure = false } = {}) => {
      if (!user?.accessToken) {
        setSnapshot(createEmptyStaffInventorySnapshot())
        setSelectedProductId(null)
        setDetailState({
          status: 'detail_idle',
          product: null,
          errorMessage: '',
        })
        setRequestState('inventory_unauthorized')
        return
      }

      if (!canRead) {
        setSnapshot(createEmptyStaffInventorySnapshot())
        setSelectedProductId(null)
        setDetailState({
          status: 'detail_idle',
          product: null,
          errorMessage: '',
        })
        setRequestState('inventory_forbidden_role')
        return
      }

      setRequestState('inventory_loading')

      try {
        const nextSnapshot = await loadStaffInventorySnapshot({
          accessToken: user.accessToken,
        })

        const partialFailure = Boolean(
          nextSnapshot.errors.products || nextSnapshot.errors.categories,
        )
        const runtimeUnavailable =
          nextSnapshot.productsRuntimeUnavailable &&
          nextSnapshot.categoriesRuntimeUnavailable
        const authRejected =
          [401, 403].includes(nextSnapshot.errorStatuses.products ?? -1) &&
          [401, 403].includes(nextSnapshot.errorStatuses.categories ?? -1)

        setSnapshot(nextSnapshot)
        setRequestState(
          authRejected
            ? 'inventory_unauthorized'
            : getStaffInventoryLoadState({
                hasSession: true,
                canRead,
                products: nextSnapshot.products,
                runtimeUnavailable,
                partialFailure,
              }),
        )
        setSelectedProductId((currentProductId) =>
          nextSnapshot.products.some((product) => product.id === currentProductId)
            ? currentProductId
            : nextSnapshot.products[0]?.id ?? null,
        )

        if (notifyFailure && partialFailure) {
          toast({
            type: 'info',
            title: 'Inventory partially loaded',
            message:
              nextSnapshot.errors.products ||
              nextSnapshot.errors.categories ||
              'Some inventory visibility sections are still unavailable.',
          })
        }
      } catch (error) {
        const nextState =
          error instanceof ApiError && (error.status === 401 || error.status === 403)
            ? 'inventory_unauthorized'
            : error instanceof ApiError && error.status === 0
              ? 'inventory_service_unavailable'
              : 'inventory_failed'
        const nextMessage =
          error instanceof ApiError && error.message
            ? error.message
            : 'We could not load the staff inventory visibility workspace right now.'

        setSnapshot(createEmptyStaffInventorySnapshot())
        setSelectedProductId(null)
        setDetailState({
          status: 'detail_idle',
          product: null,
          errorMessage: '',
        })
        setRequestState(nextState)

        if (notifyFailure) {
          toast({
            type: 'error',
            title: 'Inventory refresh failed',
            message: nextMessage,
          })
        }
      }
    },
    [canRead, toast, user?.accessToken],
  )

  useEffect(() => {
    void loadInventory()
  }, [loadInventory])

  useEffect(() => {
    if (!selectedProductId || !user?.accessToken || !canRead) {
      setDetailState({
        status: 'detail_idle',
        product: null,
        errorMessage: '',
      })
      return
    }

    let isCancelled = false

    const loadDetail = async () => {
      setDetailState((currentState) => ({
        ...currentState,
        status: 'detail_loading',
        errorMessage: '',
      }))

      try {
        const product = await getStaffInventoryProductDetail({
          productId: selectedProductId,
          accessToken: user.accessToken,
        })

        if (isCancelled) {
          return
        }

        setDetailState({
          status: getStaffInventoryDetailState({ product }),
          product,
          errorMessage: '',
        })
      } catch (error) {
        if (isCancelled) {
          return
        }

        setDetailState({
          status: getStaffInventoryDetailState({
            errorStatus: error instanceof ApiError ? error.status : 500,
          }),
          product: null,
          errorMessage:
            error instanceof ApiError && error.message
              ? error.message
              : 'We could not refresh the selected product detail right now.',
        })
      }
    }

    void loadDetail()

    return () => {
      isCancelled = true
    }
  }, [canRead, selectedProductId, user?.accessToken])

  const selectedProductSummary = useMemo(
    () =>
      snapshot.products.find((product) => product.id === selectedProductId) ?? null,
    [selectedProductId, snapshot.products],
  )

  const selectedProduct = detailState.product ?? selectedProductSummary

  const stats = useMemo(() => {
    const liveProducts = snapshot.products.length
    const publishedProducts = snapshot.products.filter(
      (product) => product.visibilityLabel === 'Published',
    ).length
    const hiddenProducts = snapshot.products.filter(
      (product) => product.visibilityLabel === 'Hidden',
    ).length

    return {
      liveProducts,
      publishedProducts,
      hiddenProducts,
      categories: snapshot.categories.length,
    }
  }, [snapshot.categories.length, snapshot.products])

  const hasPartialFailure = Boolean(
    snapshot.errors.products || snapshot.errors.categories,
  )
  const loadStateLabel = LOAD_STATE_LABELS[requestState] ?? 'Inventory Visibility'

  if (!user?.accessToken) {
    return (
      <div className="space-y-6">
        <InfoPanel
          icon={ShieldAlert}
          title="Staff sign-in required"
          body="Sign in as a staff user before loading the inventory visibility workspace."
          tone="warning"
        />
      </div>
    )
  }

  if (!canRead) {
    return (
      <div className="space-y-6">
        <InfoPanel
          icon={ShieldAlert}
          title="Inventory visibility is adviser/admin only"
          body="Technician sessions should not see inventory and stock administration routes in this phase."
          tone="warning"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="card relative overflow-hidden p-6 md:p-7"
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-brand-orange/10 to-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">Inventory Admin</p>
            <h1 className="mt-3 text-3xl font-bold text-ink-primary">Live Product Visibility, Planned Stock Controls</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
              This workspace now shows the real ecommerce product directory on the web while keeping quantity, reservation,
              and adjustment controls explicitly marked as planned until the inventory backend is actually exposed.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="badge badge-green">Live: catalog reads</span>
            <span className="badge badge-orange">Planned: stock routes</span>
            <span className="badge badge-gray">{loadStateLabel}</span>
          </div>
        </div>
      </motion.section>

      {requestState === 'inventory_loading' && snapshot.products.length === 0 ? (
        <InfoPanel
          icon={LoaderCircle}
          title="Loading inventory visibility"
          body="Reading the current ecommerce product and category directories before rendering the admin inventory workspace."
        />
      ) : null}

      {requestState === 'inventory_service_unavailable' ? (
        <InfoPanel
          icon={AlertTriangle}
          title="Ecommerce inventory runtime unavailable"
          body={`The web client could not reach ${getEcommerceInventoryApiBaseUrl()}. Start ecommerce-service on port 3001 or set NEXT_PUBLIC_ECOMMERCE_API_BASE_URL.`}
          tone="warning"
        />
      ) : null}

      {requestState === 'inventory_unauthorized' ? (
        <InfoPanel
          icon={ShieldAlert}
          title="Inventory session needs attention"
          body="The staff session could not read the ecommerce inventory visibility routes. Sign in again, then retry this page."
          tone="warning"
        />
      ) : null}

      {requestState === 'inventory_failed' ? (
        <InfoPanel
          icon={AlertTriangle}
          title="Inventory visibility failed"
          body="The live inventory visibility read failed before the page could render any product directory data."
          tone="warning"
        />
      ) : null}

      {hasPartialFailure ? (
        <InfoPanel
          icon={AlertTriangle}
          title="Partial live coverage"
          body={
            snapshot.errors.products ||
            snapshot.errors.categories ||
            'One live inventory visibility section is still unavailable.'
          }
          tone="warning"
        />
      ) : null}

      {staffInventoryKnownApiGaps.length ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {staffInventoryKnownApiGaps.map((gap) => (
            <InfoPanel key={gap} title="Known API gap" body={gap} />
          ))}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Boxes}
          label="Live Product Records"
          value={stats.liveProducts}
          sub="Backed by GET /api/products."
          toneClass="border-brand-orange/15 bg-brand-orange/10 text-brand-orange"
        />
        <StatCard
          icon={Eye}
          label="Published Products"
          value={stats.publishedProducts}
          sub="Visible product records returned by the live catalog route."
          toneClass="border-emerald-500/15 bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          icon={Tag}
          label="Hidden Products"
          value={stats.hiddenProducts}
          sub="Live records that stay unpublished without implying stock state."
          toneClass="border-sky-500/15 bg-sky-500/10 text-sky-400"
        />
        <StatCard
          icon={Warehouse}
          label="Planned Stock States"
          value={staffInventoryStateScenarios.length}
          sub="In-stock, low-stock, reserved, and out-of-stock remain typed mock states."
          toneClass="border-amber-500/15 bg-amber-500/10 text-amber-400"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <SectionShell
          title="Live Product Visibility"
          description="This table is backed by the live ecommerce product route. Quantity-on-hand remains planned, so the page shows contract status instead of fake stock counts."
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void loadInventory({ notifyFailure: true })
              }}
            >
              <RefreshCcw size={15} />
              Refresh
            </button>
          }
        >
          {snapshot.products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-surface-border bg-surface-raised px-5 py-10 text-center">
              <Package size={22} className="mx-auto text-ink-muted" />
              <p className="mt-3 text-sm font-bold text-ink-primary">No live product records yet</p>
              <p className="mt-2 text-xs leading-6 text-ink-muted">
                The live catalog route returned zero products, so stock states remain documented in the planned glossary below.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm" aria-label="Inventory visibility table">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-raised text-left text-xs text-ink-muted">
                    <th className="px-5 py-3.5 font-semibold">Product</th>
                    <th className="px-5 py-3.5 font-semibold">SKU</th>
                    <th className="px-5 py-3.5 font-semibold">Category</th>
                    <th className="px-5 py-3.5 font-semibold">Price</th>
                    <th className="px-5 py-3.5 font-semibold">Visibility</th>
                    <th className="px-5 py-3.5 font-semibold">Stock Route</th>
                    <th className="px-5 py-3.5 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {snapshot.products.map((product) => {
                    const isSelected = product.id === selectedProductId

                    return (
                      <tr
                        key={product.id}
                        className={isSelected ? 'bg-brand-orange/8' : 'hover:bg-surface-hover transition-colors'}
                      >
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            className="flex items-center gap-3 text-left"
                            onClick={() => setSelectedProductId(product.id)}
                          >
                            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${isSelected ? 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange' : 'border-surface-border bg-surface-raised text-ink-muted'}`}>
                              <Package size={16} />
                            </div>
                            <div>
                              <p className="font-semibold text-ink-primary">{product.name}</p>
                              <p className="mt-1 text-xs text-ink-muted">{product.description || 'No product description published yet.'}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-brand-orange/10 px-2 py-1 font-mono text-xs font-bold text-brand-orange">
                            {product.sku}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-ink-secondary">{product.categoryLabel}</td>
                        <td className="px-5 py-4 font-semibold text-ink-primary">{product.priceLabel}</td>
                        <td className="px-5 py-4">
                          <span className={`badge ${product.visibilityLabel === 'Published' ? 'badge-green' : 'badge-gray'}`}>
                            {product.visibilityLabel}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <RouteBadge status={product.stockRouteStatus} />
                        </td>
                        <td className="px-5 py-4 text-ink-secondary">{new Date(product.updatedAt).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionShell>

        <div className="space-y-4">
          <SectionShell
            title="Selected Product Detail"
            description="Backed by GET /api/products/:id so staff can refresh canonical product metadata without guessing stock quantities."
          >
            {!selectedProduct ? (
              <div className="rounded-3xl border border-dashed border-surface-border bg-surface-raised px-5 py-10 text-center">
                <Eye size={22} className="mx-auto text-ink-muted" />
                <p className="mt-3 text-sm font-bold text-ink-primary">Select a product</p>
                <p className="mt-2 text-xs leading-6 text-ink-muted">
                  Choose any live product row to inspect its current catalog metadata.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {detailState.status === 'detail_loading' ? (
                  <div className="rounded-3xl border border-surface-border bg-surface-raised px-4 py-4 text-sm text-ink-muted">
                    Refreshing live product detail...
                  </div>
                ) : null}

                {detailState.status === 'detail_failed' ? (
                  <InfoPanel
                    icon={AlertTriangle}
                    title="Detail refresh failed"
                    body={detailState.errorMessage || 'We could not refresh the selected product detail right now.'}
                    tone="warning"
                  />
                ) : null}

                <div className="rounded-3xl border border-surface-border bg-surface-raised p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Live Product Metadata</p>
                  <p className="mt-2 text-xl font-bold text-ink-primary">{selectedProduct.name}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">
                    {selectedProduct.description || 'No product description published yet.'}
                  </p>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">SKU</dt>
                      <dd className="mt-1 text-sm font-semibold text-ink-primary">{selectedProduct.sku}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Category</dt>
                      <dd className="mt-1 text-sm font-semibold text-ink-primary">{selectedProduct.categoryLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Price</dt>
                      <dd className="mt-1 text-sm font-semibold text-ink-primary">{selectedProduct.priceLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Visibility</dt>
                      <dd className="mt-1 text-sm font-semibold text-ink-primary">{selectedProduct.visibilityLabel}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-2xl border border-surface-border bg-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Stock Contract Status</p>
                    <p className="mt-2 text-sm font-semibold text-ink-primary">{selectedProduct.stockRouteLabel}</p>
                    <p className="mt-2 text-xs leading-6 text-ink-muted">
                      The current live DTO does not expose quantity on hand, reserved units, or movement history.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </SectionShell>

          <SectionShell
            title="Route Ledger"
            description="Every route stays labeled as live or planned so the web surface does not invent backend stock behavior."
          >
            <div className="space-y-3">
              {staffInventoryRouteRules.map((routeRule) => (
                <div
                  key={`${routeRule.method}-${routeRule.path}`}
                  className="rounded-3xl border border-surface-border bg-surface-raised p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink-primary">{routeRule.label}</p>
                      <p className="mt-1 font-mono text-xs text-ink-muted">
                        {routeRule.method} {routeRule.path}
                      </p>
                    </div>
                    <RouteBadge status={routeRule.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink-secondary">{routeRule.notes}</p>
                </div>
              ))}
            </div>
          </SectionShell>
        </div>
      </div>

      <SectionShell
        title="Planned Stock State Glossary"
        description="These are typed visibility scenarios for the future inventory routes. They stay explicit mock states until backend inventory contracts are live."
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 lg:grid-cols-2"
        >
          {staffInventoryStateScenarios.map((scenario) => (
            <StockScenarioCard key={scenario.key} item={scenario} />
          ))}
        </motion.div>
      </SectionShell>
    </div>
  )
}
