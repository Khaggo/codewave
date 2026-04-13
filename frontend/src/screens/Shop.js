'use client'

import { useState } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, X, Package, CheckCircle2, Search, Filter } from 'lucide-react'
import { shopProducts } from '@/lib/mockData'

const CATEGORIES = ['All', ...new Set(shopProducts.map(p => p.category))]

const INVOICE_STATUSES = [
  { value: 'pending',  label: 'Pending',  cls: 'badge-orange' },
  { value: 'partial',  label: 'Partial',  cls: 'badge-blue'   },
  { value: 'paid',     label: 'Paid',     cls: 'badge-green'  },
]

// ── Cart drawer ───────────────────────────────────────────────────────────────
function CartDrawer({ cart, products, onClose, onUpdateQty, onRemove }) {
  const [showCheckout, setShowCheckout] = useState(false)
  const [invoiceForm,  setInvoiceForm]  = useState({ customer: '', contact: '', notes: '', method: 'cash', status: 'pending' })
  const [submitted,    setSubmitted]    = useState(false)

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ ...products.find(p => p.id === id), qty }))
    .filter(i => i.qty > 0)

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0)
  const statusMeta = INVOICE_STATUSES.find(s => s.value === invoiceForm.status)

  if (submitted) return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-6">
      <div className="w-14 h-14 rounded-full flex items-center justify-center"
           style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e' }}>
        <CheckCircle2 size={28} className="text-emerald-400" />
      </div>
      <p className="text-base font-bold text-ink-primary">Invoice Created!</p>
      <p className="text-sm text-ink-secondary">
        Invoice for {invoiceForm.customer || 'Customer'} has been recorded as{' '}
        <span className={`badge ${statusMeta?.cls}`}>{statusMeta?.label}</span>.
      </p>
      <button onClick={onClose} className="btn-ghost mt-2">Close</button>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
        <p className="font-bold text-ink-primary flex items-center gap-2">
          <ShoppingCart size={17} style={{ color: '#f07c00' }} />
          Cart ({cartItems.reduce((s, i) => s + i.qty, 0)} items)
        </p>
        <button onClick={onClose} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-hover transition-colors">
          <X size={18} />
        </button>
      </div>

      {cartItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
          <Package size={40} className="opacity-30" />
          <p className="text-sm">Your cart is empty</p>
        </div>
      ) : !showCheckout ? (
        <>
          {/* Items */}
          <ul className="flex-1 overflow-y-auto divide-y divide-surface-border">
            {cartItems.map(item => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-ink-primary leading-snug">{item.name}</p>
                    <p className="text-xs text-ink-muted">{item.category}</p>
                  </div>
                  <button onClick={() => onRemove(item.id)}
                    className="p-1 text-ink-dim hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 border border-surface-border rounded-lg overflow-hidden">
                    <button onClick={() => onUpdateQty(item.id, item.qty - 1)}
                      className="px-2.5 py-1.5 text-ink-muted hover:bg-surface-hover transition-colors text-sm">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-bold text-ink-primary w-6 text-center">{item.qty}</span>
                    <button onClick={() => onUpdateQty(item.id, item.qty + 1)}
                      className="px-2.5 py-1.5 text-ink-muted hover:bg-surface-hover transition-colors text-sm">
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-ink-primary">₱{(item.price * item.qty).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
          {/* Footer */}
          <div className="p-5 border-t border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-secondary font-medium">Subtotal</p>
              <p className="text-lg font-extrabold text-ink-primary">₱{subtotal.toLocaleString()}</p>
            </div>
            <button onClick={() => setShowCheckout(true)} className="btn-primary w-full justify-center py-3">
              Proceed to Invoice Checkout
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Checkout form */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <button onClick={() => setShowCheckout(false)}
              className="text-xs text-ink-muted hover:text-ink-secondary flex items-center gap-1">
              ← Back to Cart
            </button>
            <p className="font-bold text-ink-primary">Invoice Details</p>

            <div>
              <label className="label">Customer Name</label>
              <input value={invoiceForm.customer}
                onChange={e => setInvoiceForm(f=>({...f,customer:e.target.value}))}
                placeholder="Full name" className="input" />
            </div>
            <div>
              <label className="label">Contact / Email</label>
              <input value={invoiceForm.contact}
                onChange={e => setInvoiceForm(f=>({...f,contact:e.target.value}))}
                placeholder="09xx / email" className="input" />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select value={invoiceForm.method}
                onChange={e => setInvoiceForm(f=>({...f,method:e.target.value}))}
                className="select">
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="card">Credit / Debit Card</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="label">Invoice Status</label>
              <div className="flex gap-2">
                {INVOICE_STATUSES.map(s => (
                  <button key={s.value} onClick={() => setInvoiceForm(f=>({...f,status:s.value}))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      invoiceForm.status === s.value ? 'text-white border-transparent' : 'border-surface-border text-ink-secondary hover:bg-surface-hover'
                    }`}
                    style={invoiceForm.status === s.value ? { backgroundColor: '#f07c00' } : {}}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea value={invoiceForm.notes}
                onChange={e => setInvoiceForm(f=>({...f,notes:e.target.value}))}
                rows={2} className="input resize-none" placeholder="Optional order notes…" />
            </div>

            {/* Order summary */}
            <div className="rounded-xl border border-surface-border p-4 space-y-1.5">
              {cartItems.map(i => (
                <div key={i.id} className="flex justify-between text-xs text-ink-secondary">
                  <span>{i.name} ×{i.qty}</span>
                  <span>₱{(i.price*i.qty).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold text-ink-primary pt-2 border-t border-surface-border mt-2">
                <span>Total</span>
                <span style={{ color: '#f07c00' }}>₱{subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-surface-border">
            <button onClick={() => setSubmitted(true)} className="btn-primary w-full justify-center py-3">
              <CheckCircle2 size={15} /> Create Invoice
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Shop() {
  const [cart,       setCart]       = useState({})
  const [cartOpen,   setCartOpen]   = useState(false)
  const [query,      setQuery]      = useState('')
  const [catFilter,  setCatFilter]  = useState('All')

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0)

  function addToCart(id) {
    setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }))
  }

  function updateQty(id, qty) {
    if (qty <= 0) { const {[id]:_, ...rest} = cart; setCart(rest) }
    else setCart(c => ({ ...c, [id]: qty }))
  }

  function removeFromCart(id) {
    const {[id]:_, ...rest} = cart; setCart(rest)
  }

  const filtered = shopProducts
    .filter(p => catFilter === 'All' || p.category === catFilter)
    .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="text-ink-muted flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search products…"
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
        <button onClick={() => setCartOpen(true)}
          className="btn-primary relative ml-auto">
          <ShoppingCart size={15} /> Cart
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Product grid ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(p => {
          const inCart = cart[p.id] || 0
          const lowStock = p.stock < 10
          return (
            <div key={p.id} className="card flex flex-col gap-3 p-4 hover:bg-surface-hover transition-colors">
              {/* Product visual */}
              <div className="w-full h-28 rounded-lg flex flex-col items-center justify-center gap-1 relative"
                   style={{ background: 'linear-gradient(135deg,rgba(240,124,0,0.05),rgba(201,149,26,0.05))' }}>
                <Package size={36} className="text-ink-dim opacity-50" />
                {lowStock && (
                  <span className="absolute top-2 right-2 badge badge-red text-[10px]">Low Stock</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-primary leading-snug">{p.name}</p>
                <p className="text-xs text-ink-muted mt-0.5">{p.category} · {p.sku}</p>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <p className="text-base font-extrabold" style={{ color: '#f07c00' }}>₱{p.price.toLocaleString()}</p>
                <p className="text-xs text-ink-muted">{p.stock} in stock</p>
              </div>

              {inCart > 0 ? (
                <div className="flex items-center justify-between border border-surface-border rounded-lg overflow-hidden">
                  <button onClick={() => updateQty(p.id, inCart - 1)}
                    className="px-3 py-2 text-ink-muted hover:bg-surface-hover transition-colors">
                    <Minus size={13} />
                  </button>
                  <span className="text-sm font-bold text-ink-primary">{inCart}</span>
                  <button onClick={() => updateQty(p.id, inCart + 1)}
                    className="px-3 py-2 text-ink-muted hover:bg-surface-hover transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
              ) : (
                <button onClick={() => addToCart(p.id)}
                  disabled={p.stock === 0}
                  className="btn-primary w-full justify-center text-xs py-2 disabled:opacity-40">
                  <Plus size={13} /> Add to Cart
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Cart drawer overlay ───────────────────── */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setCartOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-surface-raised border-l border-surface-border z-50 flex flex-col shadow-card-md animate-slide-in-right">
            <CartDrawer cart={cart} products={shopProducts}
              onClose={() => setCartOpen(false)}
              onUpdateQty={updateQty}
              onRemove={removeFromCart} />
          </div>
        </>
      )}
    </div>
  )
}
