'use client'

import { useMemo, useState } from 'react'
import { CarFront, ExternalLink, RefreshCcw } from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import PortalLink from '@/components/PortalLink'
import { useVehicles } from '@/hooks/useVehicles'

import { filterVehicles, summarizeVehicles } from './vehicleRecordsView.mjs'

const STATUS_META = {
  active: { label: 'Active', cls: 'badge-green' },
  inactive: { label: 'Inactive', cls: 'badge-gray' },
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-primary">{value}</p>
      <p className="mt-1 text-xs text-ink-secondary">{hint}</p>
    </div>
  )
}

export default function VehicleRecords() {
  const { vehicles, loading, error, reload } = useVehicles()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(
    () => filterVehicles(vehicles, { query, statusFilter }),
    [query, statusFilter, vehicles],
  )
  const summary = useMemo(() => summarizeVehicles(vehicles), [vehicles])

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Vehicle Records"
        title="Vehicle Directory"
        description="Use this as the vehicle-first operations view, then jump to Customers & Vehicles when account access or broader profile detail needs attention."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-ghost" onClick={() => reload()} disabled={loading}>
              <RefreshCcw size={15} className={loading ? 'animate-spin' : undefined} />
              Refresh
            </button>
            <PortalLink href="/admin/customers" className="btn-primary">
              <ExternalLink size={15} />
              Open Customers & Vehicles
            </PortalLink>
          </div>
        )}
        meta={(
          <>
            <span className="badge badge-gray">{filtered.length} visible</span>
            <span className="badge badge-orange">{summary.total} total vehicles</span>
          </>
        )}
      />

      <section className="ops-summary-grid">
        <MetricCard label="Total vehicles" value={summary.total} hint="All synced vehicle records" />
        <MetricCard label="Active records" value={summary.activeCount} hint="Vehicles currently marked active" />
        <MetricCard label="Inactive records" value={summary.inactiveCount} hint="Vehicles currently marked inactive" />
        <MetricCard label="Filtered view" value={filtered.length} hint="Records matching the current filters" />
      </section>

      <section className="toolbar-surface">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Filter vehicle records</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Search by plate, owner, model, color, or owner email and narrow the list by record status.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[220px_minmax(320px,1fr)] xl:min-w-[620px]">
            <label>
              <span className="label">Record status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="select"
              >
                <option value="all">All records</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>
            <label>
              <span className="label">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search plate, owner, model, or email"
                className="input"
              />
            </label>
          </div>
        </div>
      </section>

      {error ? <div className="status-message status-message-warning">{error}</div> : null}

      <div className="table-surface">
        <div className="border-b border-surface-border px-5 py-4">
          <p className="card-title">Vehicle records</p>
          <p className="mt-1 text-sm leading-6 text-ink-secondary">
            Owner identity, vehicle profile, and record status stay together in one table-first directory.
          </p>
        </div>
        <div className="table-scroll">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Plate No.</th>
                <th>Vehicle</th>
                <th>Color</th>
                <th>Year</th>
                <th>Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={`loading-${rowIndex}`}>
                      {Array.from({ length: 7 }).map((__, columnIndex) => (
                        <td key={`loading-${rowIndex}-${columnIndex}`}>
                          <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-raised" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-panel my-5">
                          <CarFront size={24} className="mx-auto text-ink-muted" />
                          <p className="mt-3 text-sm font-semibold text-ink-primary">
                            {vehicles.length ? 'No vehicles match these filters' : 'No vehicle records available yet'}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-ink-secondary">
                            {vehicles.length
                              ? 'Adjust the search or status filter to find a different vehicle record.'
                              : 'Vehicle records will appear here after they are created through customer onboarding and service intake.'}
                          </p>
                        </div>
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
                        <tr key={vehicle.id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-orange/10">
                                <span className="text-[10px] font-bold text-brand-orange">{initials || 'VR'}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-ink-primary">{vehicle.owner}</p>
                                <p className="truncate text-xs text-ink-muted">{vehicle.ownerEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="rounded-lg bg-brand-orange/10 px-2.5 py-1 font-mono text-xs font-bold text-brand-orange">
                              {vehicle.plate}
                            </span>
                          </td>
                          <td className="text-ink-secondary">{vehicle.model}</td>
                          <td className="text-ink-secondary">{vehicle.color}</td>
                          <td className="text-ink-secondary">{vehicle.year}</td>
                          <td className="max-w-[240px] text-ink-secondary">{vehicle.notes || 'No notes recorded'}</td>
                          <td>
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
