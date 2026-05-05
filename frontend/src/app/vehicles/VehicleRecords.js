'use client'

import { useState } from 'react'
import { ExternalLink, RefreshCcw, Search } from 'lucide-react'

import PortalLink from '@/components/PortalLink'
import { useVehicles } from '@/hooks/useVehicles'

const STATUS_META = {
  active: { label: 'Active', cls: 'badge-green' },
  inactive: { label: 'Inactive', cls: 'badge-gray' },
}

export default function VehicleRecords() {
  const { vehicles, loading, error, reload } = useVehicles()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = vehicles
    .filter((vehicle) => statusFilter === 'all' || vehicle.status === statusFilter)
    .filter((vehicle) => {
      const normalizedQuery = query.trim().toLowerCase()
      if (!normalizedQuery) {
        return true
      }

      return [vehicle.plate, vehicle.owner, vehicle.model, vehicle.color, vehicle.ownerEmail]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 max-w-sm">
          <Search size={14} className="flex-shrink-0 text-ink-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search plate, owner, model..."
            className="w-full bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                statusFilter === status
                  ? 'border-transparent text-white'
                  : 'border-surface-border text-ink-muted hover:bg-surface-hover'
              }`}
              style={statusFilter === status ? { backgroundColor: '#f07c00', borderColor: '#f07c00' } : {}}
            >
              {status === 'all' ? `All (${vehicles.length})` : status}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => reload()} disabled={loading}>
            <RefreshCcw size={15} className={loading ? 'animate-spin' : undefined} />
            Refresh
          </button>
          <PortalLink href="/admin/customers" className="btn-primary">
            <ExternalLink size={15} />
            Open Customers & Vehicles
          </PortalLink>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[840px] w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-raised text-left text-xs text-ink-muted">
                <th className="px-5 py-3.5 font-semibold">Owner</th>
                <th className="px-5 py-3.5 font-semibold">Plate No.</th>
                <th className="px-5 py-3.5 font-semibold">Vehicle</th>
                <th className="px-5 py-3.5 font-semibold">Color</th>
                <th className="px-5 py-3.5 font-semibold">Year</th>
                <th className="px-5 py-3.5 font-semibold">Notes</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading
                ? Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={`loading-${rowIndex}`}>
                      {Array.from({ length: 7 }).map((__, columnIndex) => (
                        <td key={`loading-${rowIndex}-${columnIndex}`} className="px-5 py-4">
                          <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-raised" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-muted">
                        {vehicles.length ? 'No vehicles match your search.' : 'No live vehicle records are available yet.'}
                      </td>
                    </tr>
                    )
                  : filtered.map((vehicle) => {
                      const meta = STATUS_META[vehicle.status] ?? { label: vehicle.status, cls: 'badge-gray' }
                      const initials = vehicle.owner
                        .split(' ')
                        .map((part) => part[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')

                      return (
                        <tr key={vehicle.id} className="transition-colors hover:bg-surface-hover">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                                style={{ backgroundColor: 'rgba(240,124,0,0.1)' }}
                              >
                                <span className="text-[10px] font-bold" style={{ color: '#f07c00' }}>
                                  {initials || 'VR'}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-ink-primary">{vehicle.owner}</p>
                                <p className="truncate text-xs text-ink-muted">{vehicle.ownerEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className="rounded px-2 py-0.5 font-mono text-xs font-bold"
                              style={{ backgroundColor: 'rgba(240,124,0,0.1)', color: '#f07c00' }}
                            >
                              {vehicle.plate}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-ink-secondary">{vehicle.model}</td>
                          <td className="px-5 py-4 text-ink-secondary">{vehicle.color}</td>
                          <td className="px-5 py-4 text-ink-secondary">{vehicle.year}</td>
                          <td className="px-5 py-4 text-ink-secondary">{vehicle.notes}</td>
                          <td className="px-5 py-4">
                            <span className={`badge ${meta.cls}`}>{meta.label}</span>
                          </td>
                        </tr>
                      )
                    })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 ? (
          <div className="border-t border-surface-border px-5 py-3 text-xs text-ink-muted">
            Showing {filtered.length} of {vehicles.length} records
          </div>
        ) : null}
      </div>
    </div>
  )
}
