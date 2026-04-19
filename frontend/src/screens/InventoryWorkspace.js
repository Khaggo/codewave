'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Boxes, Package, ShoppingCart, Warehouse } from 'lucide-react'
import { LOW_STOCK_THRESHOLD } from '@autocare/shared'
import { useInventoryProducts, useOperationsActivity } from '@/hooks/useOperationsStore.js'

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

function StatCard({ icon: Icon, label, value, toneClass }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{label}</p>
          <p className="mt-3 text-3xl font-bold text-ink-primary">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

export default function InventoryWorkspace() {
  const products = useInventoryProducts()
  const activity = useOperationsActivity()

  const stats = useMemo(() => {
    const totalStock = products.reduce((sum, product) => sum + product.stock, 0)
    const lowStockCount = products.filter((product) => product.stock < LOW_STOCK_THRESHOLD).length
    const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.price, 0)

    return {
      totalStock,
      lowStockCount,
      inventoryValue,
    }
  }, [products])

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
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">Admin Inventory</p>
            <h1 className="mt-3 text-3xl font-bold text-ink-primary">Cross-Platform Inventory Control</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
              Monitor stock levels that now react to shared customer checkout activity and surface low-stock alerts before fulfillment slows down.
            </p>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Boxes} label="Units on Hand" value={stats.totalStock} toneClass="border-brand-orange/15 bg-brand-orange/10 text-brand-orange" />
        <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={stats.lowStockCount} toneClass="border-red-500/15 bg-red-500/10 text-red-400" />
        <StatCard icon={Warehouse} label="Inventory Value" value={`PHP ${stats.inventoryValue.toLocaleString()}`} toneClass="border-emerald-500/15 bg-emerald-500/10 text-emerald-400" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="card overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
            <div>
              <p className="text-lg font-bold text-ink-primary">Live Stock Table</p>
              <p className="mt-1 text-sm text-ink-secondary">Rows turn red when stock drops below {LOW_STOCK_THRESHOLD} units.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm" aria-label="Inventory table">
              <thead>
                <tr className="border-b border-surface-border bg-surface-raised text-left text-xs text-ink-muted">
                  <th className="px-5 py-3.5 font-semibold">Product</th>
                  <th className="px-5 py-3.5 font-semibold">SKU</th>
                  <th className="px-5 py-3.5 font-semibold">Category</th>
                  <th className="px-5 py-3.5 font-semibold">Price</th>
                  <th className="px-5 py-3.5 font-semibold">Stock</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {products.map((product) => {
                  const lowStock = product.stock < LOW_STOCK_THRESHOLD

                  return (
                    <tr
                      key={product.id}
                      className={lowStock ? 'bg-red-500/8' : 'hover:bg-surface-hover transition-colors'}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${lowStock ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-brand-orange/15 bg-brand-orange/10 text-brand-orange'}`}>
                            <Package size={16} />
                          </div>
                          <span className="font-semibold text-ink-primary">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-brand-orange/10 px-2 py-1 font-mono text-xs font-bold text-brand-orange">{product.sku}</span>
                      </td>
                      <td className="px-5 py-4 text-ink-secondary">{product.category}</td>
                      <td className="px-5 py-4 font-semibold text-ink-primary">PHP {product.price.toLocaleString()}</td>
                      <td className="px-5 py-4 font-bold text-ink-primary">{product.stock}</td>
                      <td className="px-5 py-4">
                        <span className={`badge ${lowStock ? 'badge-red' : 'badge-green'}`}>
                          {lowStock ? 'Low Stock Alert' : 'Healthy Stock'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
              <ShoppingCart size={18} />
            </div>
            <div>
              <p className="text-lg font-bold text-ink-primary">Shared Activity Feed</p>
              <p className="text-sm text-ink-secondary">Recent mobile checkout and booking events.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {activity.length === 0 ? (
              <div className="rounded-3xl border border-surface-border bg-surface-raised p-4 text-sm text-ink-secondary">
                No shared activity yet.
              </div>
            ) : (
              activity.map((event) => (
                <motion.article key={event.id} variants={itemVariants} className="rounded-3xl border border-surface-border bg-surface-raised p-4">
                  <p className="text-sm font-semibold text-ink-primary">{event.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">{event.message}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink-muted">{event.referenceId}</p>
                </motion.article>
              ))
            )}
          </div>
        </motion.section>
      </div>
    </div>
  )
}
