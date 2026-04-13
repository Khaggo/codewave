'use client'

import { useState } from 'react'
import { Award, Plus, Search, Edit2, CheckCircle2, X, History, Settings } from 'lucide-react'
import { loyaltyAccounts, rewardCatalog, redemptionLog } from '@/lib/mockData'

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  Gold:   { badge: 'badge-gold',   bar: '#c9951a', next: 2000 },
  Silver: { badge: 'badge-gray',   bar: '#71717a', next: 1000 },
  Bronze: { badge: 'badge-orange', bar: '#f07c00', next: 500  },
}

function tierForPoints(pts) {
  if (pts >= 1000) return 'Gold'
  if (pts >= 500)  return 'Silver'
  return 'Bronze'
}

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

// ── Reward Config Tab ─────────────────────────────────────────────────────────
function RewardConfigTab() {
  const [rewards,  setRewards]  = useState(rewardCatalog)
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState({})

  function openAdd() {
    setForm({ name: '', pointsRequired: '', discount: '', type: 'service', status: 'active' })
    setModal('add')
  }
  function openEdit(r) {
    setSelected(r)
    setForm({ name: r.name, pointsRequired: r.pointsRequired, discount: r.discount ?? '',
              type: r.type, status: r.status })
    setModal('edit')
  }
  function saveAdd() {
    if (!form.name || !form.pointsRequired) return
    setRewards(rs => [...rs, {
      id: `rw${Date.now()}`, name: form.name, pointsRequired: Number(form.pointsRequired),
      discount: form.discount ? Number(form.discount) : null,
      type: form.type, status: form.status,
    }])
    setModal(null)
  }
  function saveEdit() {
    setRewards(rs => rs.map(r => r.id === selected.id
      ? { ...r, name: form.name, pointsRequired: Number(form.pointsRequired),
               discount: form.discount ? Number(form.discount) : null,
               type: form.type, status: form.status }
      : r))
    setModal(null)
  }

  const RewardForm = ({ onSave, saveLabel }) => (
    <>
      <div>
        <label className="label">Reward Name</label>
        <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
          placeholder="e.g. Free Oil Change" className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Points Required</label>
          <input type="number" value={form.pointsRequired}
            onChange={e => setForm(f=>({...f,pointsRequired:e.target.value}))}
            placeholder="500" className="input" />
        </div>
        <div>
          <label className="label">Discount % (optional)</label>
          <input type="number" value={form.discount}
            onChange={e => setForm(f=>({...f,discount:e.target.value}))}
            placeholder="e.g. 20" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))} className="select">
            <option value="service">Service Voucher</option>
            <option value="discount">Discount Coupon</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))} className="select">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={() => setModal(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
        <button onClick={onSave} disabled={!form.name || !form.pointsRequired}
          className="btn-primary flex-1 justify-center">
          <CheckCircle2 size={14} /> {saveLabel}
        </button>
      </div>
    </>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Create Reward</button>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
                <th className="px-5 py-3.5 font-semibold">Reward Name</th>
                <th className="px-5 py-3.5 font-semibold">Type</th>
                <th className="px-5 py-3.5 font-semibold">Points Required</th>
                <th className="px-5 py-3.5 font-semibold">Discount</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rewards.map(r => (
                <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-ink-primary">{r.name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`badge ${r.type === 'service' ? 'badge-blue' : 'badge-purple'}`}>
                      {r.type === 'service' ? 'Service' : 'Discount'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold tabular-nums" style={{ color: '#f07c00' }}>
                    {r.pointsRequired.toLocaleString()} pts
                  </td>
                  <td className="px-5 py-3.5 text-ink-secondary">
                    {r.discount ? `${r.discount}%` : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                      {r.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => openEdit(r)}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors">
                      <Edit2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal === 'add'  && <Modal title="Create New Reward" onClose={() => setModal(null)}><RewardForm onSave={saveAdd}  saveLabel="Create Reward" /></Modal>}
      {modal === 'edit' && <Modal title="Edit Reward"       onClose={() => setModal(null)}><RewardForm onSave={saveEdit} saveLabel="Save Changes"  /></Modal>}
    </div>
  )
}

// ── Customer Loyalty Tab ──────────────────────────────────────────────────────
function CustomerTab() {
  const [accounts,  setAccounts]  = useState(loyaltyAccounts)
  const [query,     setQuery]     = useState('')
  const [tierFilter,setTierFilter]= useState('all')
  const [modal,     setModal]     = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [adjustment,setAdjustment]= useState({ delta: '', reason: '' })

  const filtered = accounts
    .filter(a => tierFilter === 'all' || a.tier === tierFilter)
    .filter(a => a.owner.toLowerCase().includes(query.toLowerCase()))

  function openAdjust(acc) {
    setSelected(acc)
    setAdjustment({ delta: '', reason: '' })
    setModal(true)
  }

  function saveAdjust() {
    const delta = Number(adjustment.delta)
    if (!delta || !adjustment.reason) return
    setAccounts(accs => accs.map(a => {
      if (a.id !== selected.id) return a
      const newPts = Math.max(0, a.points + delta)
      return { ...a, points: newPts, tier: tierForPoints(newPts) }
    }))
    setModal(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2 flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="text-ink-muted flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search customer..."
            className="bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none w-full" />
        </div>
        <div className="flex gap-2">
          {['all', 'Gold', 'Silver', 'Bronze'].map(t => (
            <button key={t} onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                tierFilter === t ? 'text-white border-transparent' : 'border-surface-border text-ink-muted hover:bg-surface-hover'
              }`}
              style={tierFilter === t ? { backgroundColor: '#f07c00', borderColor: '#f07c00' } : {}}>
              {t === 'all' ? `All (${accounts.length})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
                <th className="px-5 py-3.5 font-semibold">Customer Name</th>
                <th className="px-5 py-3.5 font-semibold">Current Tier</th>
                <th className="px-5 py-3.5 font-semibold">Total Points</th>
                <th className="px-5 py-3.5 font-semibold">Progress</th>
                <th className="px-5 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.map(acc => {
                const cfg = TIER_CONFIG[acc.tier] ?? TIER_CONFIG.Bronze
                const pct = Math.min(100, Math.round((acc.points / cfg.next) * 100))
                return (
                  <tr key={acc.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-ink-primary">{acc.owner}</td>
                    <td className="px-5 py-3.5"><span className={`badge ${cfg.badge}`}>{acc.tier}</span></td>
                    <td className="px-5 py-3.5 font-bold tabular-nums" style={{ color: '#f07c00' }}>
                      {acc.points.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.bar }} />
                        </div>
                        <span className="text-xs text-ink-muted tabular-nums w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => openAdjust(acc)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-surface-border text-ink-secondary hover:bg-surface-hover transition-colors">
                        Adjust Points
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && selected && (
        <Modal title={`Adjust Points — ${selected.owner}`} onClose={() => setModal(false)}>
          <div className="p-3 rounded-xl border border-surface-border bg-surface-raised/50 text-sm text-ink-secondary">
            Current: <span className="font-bold text-ink-primary">{selected.points.toLocaleString()} pts</span>
            {' · '}<span className={`badge ${TIER_CONFIG[selected.tier]?.badge}`}>{selected.tier}</span>
          </div>
          <div>
            <label className="label">Point Adjustment (use - for deductions)</label>
            <input type="number" value={adjustment.delta}
              onChange={e => setAdjustment(a=>({...a,delta:e.target.value}))}
              placeholder="+100 or -50" className="input" />
          </div>
          {adjustment.delta && (
            <p className="text-xs text-ink-muted">
              Result: <span className="font-bold text-ink-primary">
                {Math.max(0, selected.points + Number(adjustment.delta)).toLocaleString()} pts
              </span>
              {' -> '}
              <span className={`badge ${TIER_CONFIG[tierForPoints(Math.max(0, selected.points + Number(adjustment.delta)))]?.badge}`}>
                {tierForPoints(Math.max(0, selected.points + Number(adjustment.delta)))}
              </span>
            </p>
          )}
          <div>
            <label className="label">Reason / Note</label>
            <input value={adjustment.reason}
              onChange={e => setAdjustment(a=>({...a,reason:e.target.value}))}
              placeholder="e.g. Manual correction, service compensation..." className="input" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button onClick={saveAdjust}
              disabled={!adjustment.delta || !adjustment.reason}
              className="btn-primary flex-1 justify-center">
              <CheckCircle2 size={14} /> Apply Adjustment
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Redemption Log Tab ────────────────────────────────────────────────────────
function RedemptionLogTab() {
  const [log,         setLog]         = useState(redemptionLog)
  const [statusFilter,setStatusFilter]= useState('all')
  const [query,       setQuery]       = useState('')

  const filtered = log
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => {
      const q = query.toLowerCase()
      return r.customerName.toLowerCase().includes(q) || r.rewardName.toLowerCase().includes(q)
    })

  function markUsed(id) {
    setLog(l => l.map(r => r.id === id ? { ...r, status: 'used' } : r))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2 flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="text-ink-muted flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search customer / reward..."
            className="bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none w-full" />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'used'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                statusFilter === s ? 'text-white border-transparent' : 'border-surface-border text-ink-muted hover:bg-surface-hover'
              }`}
              style={statusFilter === s ? { backgroundColor: '#f07c00', borderColor: '#f07c00' } : {}}>
              {s === 'all' ? `All (${log.length})` : s}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Reward</th>
                <th className="px-5 py-3.5 font-semibold">Points Used</th>
                <th className="px-5 py-3.5 font-semibold">Date</th>
                <th className="px-5 py-3.5 font-semibold">Processed By</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-ink-muted text-sm">
                    No redemptions match your filter.
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-ink-primary">{r.customerName}</td>
                  <td className="px-5 py-3.5 text-ink-secondary">{r.rewardName}</td>
                  <td className="px-5 py-3.5 font-bold tabular-nums" style={{ color: '#f07c00' }}>
                    {r.pointsUsed.toLocaleString()} pts
                  </td>
                  <td className="px-5 py-3.5 text-ink-secondary text-xs">{r.date}</td>
                  <td className="px-5 py-3.5 text-ink-secondary">{r.redeemedBy}</td>
                  <td className="px-5 py-3.5">
                    {r.status === 'pending' ? (
                      <button onClick={() => markUsed(r.id)}
                        className="badge badge-orange cursor-pointer hover:opacity-80 transition-opacity"
                        title="Click to mark as used">
                        Pending
                      </button>
                    ) : (
                      <span className="badge badge-gray">Used</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-surface-border text-xs text-ink-muted">
          Showing {filtered.length} of {log.length} redemptions · Click &quot;Pending&quot; badge to mark as used
        </div>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function LoyaltyManager() {
  const [tab, setTab] = useState('customers')

  return (
    <div className="space-y-5">
      {/* Tab header */}
      <div className="flex gap-1 p-1 bg-surface-card border border-surface-border rounded-xl w-fit flex-wrap">
        {[
          { key: 'customers', icon: Award,    label: 'Customer Accounts' },
          { key: 'rewards',   icon: Settings, label: 'Reward Config'     },
          { key: 'log',       icon: History,  label: 'Redemption Log'    },
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

      {tab === 'customers' && <CustomerTab />}
      {tab === 'rewards'   && <RewardConfigTab />}
      {tab === 'log'       && <RedemptionLogTab />}
    </div>
  )
}
