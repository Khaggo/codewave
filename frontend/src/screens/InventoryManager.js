'use client'

import { useState } from 'react'
import {
  Package, Plus, Edit2, RotateCcw, Search, X, CheckCircle2,
  ShoppingBag, Filter,
} from 'lucide-react'
import { shopProducts as INITIAL_PRODUCTS, salesInvoices } from '@/lib/mockData'

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_LABEL = stock =>
  stock === 0 ? { label: 'Out of Stock', cls: 'badge-red'    } :
  stock < 10  ? { label: 'Low Stock',    cls: 'badge-orange' } :
                { label: 'In Stock',     cls: 'badge-green'  }

const INVOICE_META = {
  paid:    { label: 'Paid',    cls: 'badge-green'  },
  partial: { label: 'Partial', cls: 'badge-blue'   },
  pending: { label: 'Pending', cls: 'badge-orange' },
}

const CATEGORIES = ['All', ...Array.from(new Set(INITIAL_PRODUCTS.map(p => p.category)))]

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-raised border border-surface-border rounded-2xl w-full max-w-md shadow-card-md animate-slide-up">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <p className="font-bold text-ink-primary">{title}</p>
            <button onClick={onClose} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-hover">
              <X size={17} />
            </button>
          </div>
          <div className="p-5 space-y-4">{children}</div>
        </div>
      </div>
    </>
  )
}

// ── Inventory Tab ─────────────────────────────────────────────────────────────
function InventoryTab() {
  const [products,    setProducts]    = useState(INITIAL_PRODUCTS)
  const [query,       setQuery]       = useState('')
  const [catFilter,   setCatFilter]   = useState('All')
  const [modal,       setModal]       = useState(null)    // null | 'add' | 'edit' | 'restock'
  const [selected,    setSelected]    = useState(null)    // product being edited
  const [form,        setForm]        = useState({})
  const [restockQty,  setRestockQty]  = useState(0)

  const filtered = products
    .filter(p => catFilter === 'All' || p.category === catFilter)
    .filter(p => {
      const q = query.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    })

  function openAdd() {
    setForm({ name: '', sku: '', category: 'Lubricants', price: '', stock: '' })
    setModal('add')
  }

  function openEdit(p) {
    setSelected(p)
    setForm({ name: p.name, sku: p.sku, category: p.category, price: p.price, stock: p.stock })
    setModal('edit')
  }

  function openRestock(p) {
    setSelected(p)
    setRestockQty(0)
    setModal('restock')
  }

  function saveAdd() {
    if (!form.name || !form.sku) return
    const newP = { id: `p${Date.now()}`, name: form.name, sku: form.sku,
                   category: form.category, price: Number(form.price) || 0,
                   stock: Number(form.stock) || 0 }
    setProducts(ps => [...ps, newP])
    setModal(null)
  }

  function saveEdit() {
    setProducts(ps => ps.map(p => p.id === selected.id
      ? { ...p, name: form.name, sku: form.sku, category: form.category,
               price: Number(form.price), stock: Number(form.stock) }
      : p))
    setModal(null)
  }

  function saveRestock() {
    if (!restockQty) return
    setProducts(ps => ps.map(p => p.id === selected.id
      ? { ...p, stock: p.stock + Number(restockQty) } : p))
    setModal(null)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="text-ink-muted flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search name or SKU…"
            className="bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none w-full" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                catFilter === c ? 'text-white border-transparent' : 'border-surface-border text-ink-secondary hover:bg-surface-hover'
              }`}
              style={catFilter === c ? { backgroundColor: '#f07c00', borderColor: '#f07c00' } : {}}>
              {c}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="btn-primary ml-auto">
          <Plus size={15} /> Add Product
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
                <th className="px-5 py-3.5 font-semibold">Product Name</th>
                <th className="px-5 py-3.5 font-semibold">SKU</th>
                <th className="px-5 py-3.5 font-semibold">Category</th>
                <th className="px-5 py-3.5 font-semibold">Price</th>
                <th className="px-5 py-3.5 font-semibold">Stock</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-ink-muted text-sm">
                    No products match your filter.
                  </td>
                </tr>
              ) : filtered.map(p => {
                const st = STATUS_LABEL(p.stock)
                return (
                  <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                             style={{ backgroundColor: 'rgba(240,124,0,0.08)' }}>
                          <Package size={14} style={{ color: '#f07c00' }} />
                        </div>
                        <span className="font-semibold text-ink-primary leading-snug">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(240,124,0,0.08)', color: '#f07c00' }}>
                        {p.sku}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-secondary">{p.category}</td>
                    <td className="px-5 py-3.5 font-bold tabular-nums" style={{ color: '#f07c00' }}>
                      ₱{p.price.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-ink-secondary tabular-nums font-medium">{p.stock}</td>
                    <td className="px-5 py-3.5"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors"
                          title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => openRestock(p)}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-emerald-400 hover:bg-surface-hover transition-colors"
                          title="Restock">
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-surface-border text-xs text-ink-muted">
          Showing {filtered.length} of {products.length} products
        </div>
      </div>

      {/* Add Product Modal */}
      {modal === 'add' && (
        <Modal title="Add New Product" onClose={() => setModal(null)}>
          <div>
            <label className="label">Product Name</label>
            <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
              placeholder="e.g. Castrol GTX 10W-40" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU</label>
              <input value={form.sku} onChange={e => setForm(f=>({...f,sku:e.target.value}))}
                placeholder="LUB-003" className="input" />
            </div>
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} className="select">
                {['Lubricants','Tires','Battery','Filters','Detailing','Electrical'].map(c=>(
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price (₱)</label>
              <input type="number" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))}
                placeholder="0" className="input" />
            </div>
            <div>
              <label className="label">Initial Stock</label>
              <input type="number" value={form.stock} onChange={e => setForm(f=>({...f,stock:e.target.value}))}
                placeholder="0" className="input" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button onClick={saveAdd} className="btn-primary flex-1 justify-center"
              disabled={!form.name || !form.sku}>
              <Plus size={14} /> Add Product
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {modal === 'edit' && selected && (
        <Modal title="Edit Product" onClose={() => setModal(null)}>
          <div>
            <label className="label">Product Name</label>
            <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU</label>
              <input value={form.sku} onChange={e => setForm(f=>({...f,sku:e.target.value}))} className="input" />
            </div>
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} className="select">
                {['Lubricants','Tires','Battery','Filters','Detailing','Electrical'].map(c=>(
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price (₱)</label>
              <input type="number" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))} className="input" />
            </div>
            <div>
              <label className="label">Stock</label>
              <input type="number" value={form.stock} onChange={e => setForm(f=>({...f,stock:e.target.value}))} className="input" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button onClick={saveEdit} className="btn-primary flex-1 justify-center">
              <CheckCircle2 size={14} /> Save Changes
            </button>
          </div>
        </Modal>
      )}

      {/* Restock Modal */}
      {modal === 'restock' && selected && (
        <Modal title={`Restock — ${selected.name}`} onClose={() => setModal(null)}>
          <div className="p-3 rounded-xl border border-surface-border bg-surface-raised/50 text-sm text-ink-secondary">
            Current stock: <span className="font-bold text-ink-primary">{selected.stock}</span>
          </div>
          <div>
            <label className="label">Quantity to Add</label>
            <input type="number" min="1" value={restockQty}
              onChange={e => setRestockQty(e.target.value)}
              placeholder="e.g. 20" className="input" />
          </div>
          {restockQty > 0 && (
            <p className="text-xs text-ink-muted">
              New stock after restock: <span className="font-bold text-emerald-400">{selected.stock + Number(restockQty)}</span>
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button onClick={saveRestock} className="btn-primary flex-1 justify-center"
              disabled={!restockQty || restockQty <= 0}>
              <RotateCcw size={14} /> Confirm Restock
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Sales Tracking Tab ────────────────────────────────────────────────────────
function SalesTab() {
  const [invoices, setInvoices] = useState(salesInvoices)
  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')

  const filtered = invoices
    .filter(i => statusFilter === 'all' || i.status === statusFilter)
    .filter(i => {
      const q = query.toLowerCase()
      return i.id.toLowerCase().includes(q) || i.customer.toLowerCase().includes(q)
    })

  function cycleStatus(id) {
    const order = ['pending', 'partial', 'paid']
    setInvoices(inv => inv.map(i => {
      if (i.id !== id) return i
      const next = order[(order.indexOf(i.status) + 1) % order.length]
      return { ...i, status: next }
    }))
  }

  const total    = invoices.reduce((s, i) => s + i.total, 0)
  const paid     = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const pending  = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.total, 0)

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Invoiced', val: `₱${total.toLocaleString()}`,   cls: 'text-ink-primary'  },
          { label: 'Paid',           val: `₱${paid.toLocaleString()}`,    cls: 'text-emerald-400' },
          { label: 'Outstanding',    val: `₱${pending.toLocaleString()}`, cls: 'text-amber-400'   },
        ].map(c => (
          <div key={c.label} className="card p-4 text-center">
            <p className={`text-xl font-extrabold ${c.cls}`}>{c.val}</p>
            <p className="text-xs text-ink-muted mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2 flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="text-ink-muted flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search invoice / customer…"
            className="bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none w-full" />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'partial', 'paid'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                statusFilter === s ? 'text-white border-transparent' : 'border-surface-border text-ink-muted hover:bg-surface-hover'
              }`}
              style={statusFilter === s ? { backgroundColor: '#f07c00', borderColor: '#f07c00' } : {}}>
              {s === 'all' ? `All (${invoices.length})` : s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
                <th className="px-5 py-3.5 font-semibold">Invoice ID</th>
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Items</th>
                <th className="px-5 py-3.5 font-semibold">Total</th>
                <th className="px-5 py-3.5 font-semibold">Method</th>
                <th className="px-5 py-3.5 font-semibold">Date</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-ink-muted text-sm">
                    No invoices match your filter.
                  </td>
                </tr>
              ) : filtered.map(inv => {
                const meta = INVOICE_META[inv.status]
                return (
                  <tr key={inv.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(240,124,0,0.08)', color: '#f07c00' }}>
                        {inv.id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-ink-primary">{inv.customer}</td>
                    <td className="px-5 py-3.5 text-ink-secondary text-xs max-w-[200px]">
                      <p className="truncate">{inv.items.join(', ')}</p>
                    </td>
                    <td className="px-5 py-3.5 font-bold tabular-nums" style={{ color: '#f07c00' }}>
                      ₱{inv.total.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-ink-secondary">{inv.method}</td>
                    <td className="px-5 py-3.5 text-ink-secondary text-xs">{inv.date}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => cycleStatus(inv.id)}
                        className={`badge ${meta.cls} cursor-pointer hover:opacity-80 transition-opacity`}
                        title="Click to cycle status">
                        {meta.label}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-surface-border text-xs text-ink-muted">
          Showing {filtered.length} of {invoices.length} invoices · Click a status badge to update it
        </div>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function InventoryManager() {
  const [tab, setTab] = useState('inventory')

  return (
    <div className="space-y-5">
      {/* Tab header */}
      <div className="flex gap-1 p-1 bg-surface-card border border-surface-border rounded-xl w-fit">
        {[
          { key: 'inventory', icon: Package,     label: 'Inventory'      },
          { key: 'sales',     icon: ShoppingBag, label: 'Sales Tracking' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? 'text-white' : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-hover'
            }`}
            style={tab === t.key ? { background: '#f07c00' } : {}}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'inventory' ? <InventoryTab /> : <SalesTab />}
    </div>
  )
}
