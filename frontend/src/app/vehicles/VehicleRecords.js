'use client'

import { useState } from 'react'
import { Car, PlusCircle, Search } from 'lucide-react'
import { useVehicles } from '@/hooks/useVehicles'
import RegisterVehicleModal from '@/components/RegisterVehicleModal'

const STATUS_META = {
  active:      { label: 'Active',      cls: 'badge-green'  },
  maintenance: { label: 'Maintenance', cls: 'badge-orange' },
  inactive:    { label: 'Inactive',    cls: 'badge-gray'   },
}

export default function VehicleRecords() {
  const { vehicles, loading } = useVehicles()
  const [query,        setQuery]        = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showRegister, setShowRegister] = useState(false)

  const filtered = vehicles
    .filter(v => statusFilter === 'all' || v.status === statusFilter)
    .filter(v => {
      const q = query.toLowerCase()
      return (
        v.plate.toLowerCase().includes(q) ||
        v.owner.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
      )
    })

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="text-ink-muted flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search plate, owner, model..."
            className="bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none w-full" />
        </div>

        <div className="flex gap-2">
          {['all', 'active', 'maintenance', 'inactive'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                statusFilter === s
                  ? 'text-white border-transparent'
                  : 'border-surface-border text-ink-muted hover:bg-surface-hover'
              }`}
              style={statusFilter === s ? { backgroundColor: '#f07c00', borderColor: '#f07c00' } : {}}>
              {s === 'all' ? `All (${vehicles.length})` : s}
            </button>
          ))}
        </div>

        <button className="btn-primary ml-auto" onClick={() => setShowRegister(true)}>
          <PlusCircle size={15} /> Register Vehicle
        </button>
      </div>

      {/* ── Table ───────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
                <th className="px-5 py-3.5 font-semibold">Owner</th>
                <th className="px-5 py-3.5 font-semibold">Plate No.</th>
                <th className="px-5 py-3.5 font-semibold">Vehicle</th>
                <th className="px-5 py-3.5 font-semibold">Type</th>
                <th className="px-5 py-3.5 font-semibold">Year</th>
                <th className="px-5 py-3.5 font-semibold">Mileage</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading
                ? Array.from({length:5}).map((_,i)=>(
                    <tr key={i}>
                      {Array.from({length:7}).map((_,j)=>(
                        <td key={j} className="px-5 py-4">
                          <div className="h-3.5 bg-surface-raised rounded animate-pulse w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-ink-muted text-sm">
                        No vehicles match your search.
                      </td>
                    </tr>
                  )
                  : filtered.map(v => {
                      const meta     = STATUS_META[v.status] ?? { label: v.status, cls: 'badge-gray' }
                      const initials = v.owner.split(' ').map(w => w[0]).slice(0,2).join('')
                      return (
                        <tr key={v.id} className="hover:bg-surface-hover transition-colors cursor-pointer">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                   style={{ backgroundColor: 'rgba(240,124,0,0.1)' }}>
                                <span className="text-[10px] font-bold" style={{ color: '#f07c00' }}>{initials}</span>
                              </div>
                              <span className="font-semibold text-ink-primary">{v.owner}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                                  style={{ backgroundColor: 'rgba(240,124,0,0.1)', color: '#f07c00' }}>
                              {v.plate}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-ink-secondary">{v.model}</td>
                          <td className="px-5 py-4"><span className="badge badge-gray">{v.type}</span></td>
                          <td className="px-5 py-4 text-ink-secondary">{v.year}</td>
                          <td className="px-5 py-4 text-ink-secondary tabular-nums">{v.mileage.toLocaleString()} km</td>
                          <td className="px-5 py-4"><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                        </tr>
                      )
                    })
              }
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-surface-border text-xs text-ink-muted">
            Showing {filtered.length} of {vehicles.length} records
          </div>
        )}
      </div>

      {/* ── Register Vehicle Modal ───────────────── */}
      {showRegister && (
        <RegisterVehicleModal
          onClose={() => setShowRegister(false)}
          onRegistered={() => setShowRegister(false)}
        />
      )}
    </div>
  )
}
