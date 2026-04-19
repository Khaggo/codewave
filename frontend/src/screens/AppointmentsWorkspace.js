'use client'

import { Fragment, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  ClipboardList,
  List,
  MapPin,
  Search,
  Workflow,
  X,
} from 'lucide-react'
import { convertAppointmentToJobOrder, updateAppointmentStage } from '@autocare/shared'
import { vehicles } from '@autocare/shared'
import { useAppointmentsStore } from '@/hooks/useOperationsStore.js'
import BookingCalendar from '@/app/bookings/BookingCalendar'
import { ServiceStatusBar } from '@/screens/BookingForm'

const STATUS_META = {
  pending:     { label: 'Pending',     cls: 'badge-orange' },
  confirmed:   { label: 'Confirmed',   cls: 'badge-blue'   },
  in_progress: { label: 'In Progress', cls: 'badge-green'  },
  completed:   { label: 'Completed',   cls: 'badge-gray'   },
}

const STAGE_STEPS = [
  { key: 'intake',    label: 'Intake'           },
  { key: 'in_repair', label: 'In-Repair'        },
  { key: 'qc',        label: 'Quality Check'    },
  { key: 'ready',     label: 'Ready for Pickup' },
]

export default function AppointmentsWorkspace() {
  const appointments = useAppointmentsStore()

  const [tab, setTab] = useState('list')
  const [expandedId, setExpandedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [shopFilter, setShopFilter] = useState('all')

  const vehicleMap = useMemo(
    () => Object.fromEntries(vehicles.map((v) => [v.id, v])),
    []
  )

  const shopOptions = useMemo(() => {
    const unique = new Set(appointments.map((a) => a.shopName).filter(Boolean))
    return Array.from(unique).sort()
  }, [appointments])

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return appointments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (shopFilter !== 'all' && a.shopName !== shopFilter) return false
      if (!q) return true
      const v = vehicleMap[a.vehicleId]
      const hay = [
        v?.plate, v?.owner, v?.model,
        a.jobOrderId, a.chosenServices?.join(' '),
      ].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [appointments, vehicleMap, searchQuery, statusFilter, shopFilter])

  const hasActiveFilter = searchQuery || statusFilter !== 'all' || shopFilter !== 'all'

  function resetFilters() {
    setSearchQuery('')
    setStatusFilter('all')
    setShopFilter('all')
  }

  const pendingCount = appointments.filter((a) => a.status === 'pending').length
  const convertedCount = appointments.filter((a) => a.status === 'confirmed' && a.jobOrderId).length
  const activeCount = appointments.filter((a) => a.status !== 'completed').length

  function toggleRow(id) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="card relative overflow-hidden p-6 md:p-7"
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-brand-orange/10 to-transparent" />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">Service Queue</p>
          <h1 className="mt-3 text-3xl font-bold text-ink-primary">Mobile Booking Intake</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
            Every booking created in the customer app lands here, ready for the service adviser to validate and convert into a job order that flows into the lifecycle and QA process.
          </p>
        </div>
      </motion.section>

      {/* Stat cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink-muted">Incoming Queue</p>
              <p className="mt-3 text-3xl font-bold text-ink-primary">{pendingCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
              <ClipboardList size={20} />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink-muted">Converted To JO</p>
              <p className="mt-3 text-3xl font-bold text-ink-primary">{convertedCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-400">
              <Workflow size={20} />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink-muted">Total Active</p>
              <p className="mt-3 text-3xl font-bold text-ink-primary">{activeCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/15 bg-blue-500/10 text-blue-400">
              <CalendarCheck2 size={20} />
            </div>
          </div>
        </div>
      </section>

      {/* Main area: tabbed list/calendar */}
      <section className="space-y-5">
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-surface-card border border-surface-border rounded-xl w-fit max-w-full overflow-x-auto shrink-0">
            {[
              { key: 'list',     icon: List,         label: 'All Appointments' },
              { key: 'calendar', icon: CalendarDays, label: 'Calendar View'    },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  tab === t.key ? 'text-white' : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-hover'
                }`}
                style={tab === t.key ? { background: '#f07c00' } : {}}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {/* List tab */}
          {tab === 'list' && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="card-title">All Appointments</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Click any row to expand and convert into a job order
                      {hasActiveFilter && (
                        <span className="ml-2 text-ink-secondary">
                          · Showing {filteredAppointments.length} of {appointments.length}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Filter bar */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search plate, owner, JO, service…"
                      className="w-full pl-9 pr-8 py-2 rounded-lg text-sm bg-surface-raised border border-surface-border text-ink-primary placeholder:text-ink-dim focus:outline-none focus:border-brand-orange"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-2 px-3 rounded-lg text-sm bg-surface-raised border border-surface-border text-ink-primary focus:outline-none focus:border-brand-orange"
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>

                  <select
                    value={shopFilter}
                    onChange={(e) => setShopFilter(e.target.value)}
                    className="py-2 px-3 rounded-lg text-sm bg-surface-raised border border-surface-border text-ink-primary focus:outline-none focus:border-brand-orange"
                  >
                    <option value="all">All shops</option>
                    {shopOptions.map((shop) => (
                      <option key={shop} value={shop}>{shop}</option>
                    ))}
                  </select>

                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="py-2 px-3 rounded-lg text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-surface-hover border border-surface-border transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[780px]">
                  <thead>
                    <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
                      <th className="px-4 py-3.5 font-semibold w-8" />
                      <th className="px-5 py-3.5 font-semibold">JO / Vehicle</th>
                      <th className="px-5 py-3.5 font-semibold">Owner</th>
                      <th className="px-5 py-3.5 font-semibold">Slot</th>
                      <th className="px-5 py-3.5 font-semibold">Services</th>
                      <th className="px-5 py-3.5 font-semibold">Shop</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-muted">
                          {appointments.length === 0
                            ? 'No appointments yet.'
                            : 'No appointments match the current filters.'}
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((a) => {
                        const v = vehicleMap[a.vehicleId]
                        const meta = STATUS_META[a.status] ?? { label: a.status, cls: 'badge-gray' }
                        const isOpen = expandedId === a.id
                        const d = new Date(a.slot).toLocaleString('en-PH', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                        return (
                          <Fragment key={a.id}>
                            <tr
                              onClick={() => toggleRow(a.id)}
                              className={`border-b border-surface-border cursor-pointer transition-colors ${
                                isOpen ? 'bg-surface-raised' : 'hover:bg-surface-hover'
                              }`}
                            >
                              <td className="pl-4 pr-1 py-4 text-ink-dim">
                                {isOpen
                                  ? <ChevronUp   size={14} style={{ color: '#f07c00' }} />
                                  : <ChevronDown size={14} />
                                }
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-mono text-xs font-bold" style={{ color: '#f07c00' }}>
                                  {a.jobOrderId ?? '—'}
                                </p>
                                <p className="text-sm font-semibold text-ink-primary mt-0.5">{v?.plate ?? '—'}</p>
                              </td>
                              <td className="px-5 py-4 text-ink-secondary">{v?.owner ?? '—'}</td>
                              <td className="px-5 py-4 text-ink-secondary text-xs">{d}</td>
                              <td className="px-5 py-4 text-ink-secondary max-w-[220px]">
                                <p className="truncate text-xs">{a.chosenServices.join(', ')}</p>
                              </td>
                              <td className="px-5 py-4 text-ink-secondary text-xs">{a.shopName}</td>
                              <td className="px-5 py-4">
                                <span className={`badge ${meta.cls}`}>{meta.label}</span>
                              </td>
                            </tr>

                            {isOpen && (
                              <tr className="border-b border-surface-border bg-surface-raised/60">
                                <td colSpan={7} className="px-6 py-5">
                                  <div className="max-w-3xl space-y-5">
                                    <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                                      Appointment Detail — {v?.plate ?? a.vehicleId} · {v?.owner ?? 'Customer'}
                                    </p>

                                    <div className="space-y-2 text-sm text-ink-secondary">
                                      <p className="flex items-center gap-2">
                                        <Clock3 size={14} className="text-brand-orange" /> {d}
                                      </p>
                                      <p className="flex items-center gap-2">
                                        <MapPin size={14} className="text-brand-orange" /> {a.shopName}
                                      </p>
                                    </div>

                                    {a.jobOrderId && a.serviceStage && (
                                      <div className="space-y-3 pt-3 border-t border-surface-border">
                                        <div className="flex items-center justify-between gap-3">
                                          <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                                            Service Progress
                                          </p>
                                          <p className="text-[10px] text-ink-dim">Click a stage to update</p>
                                        </div>
                                        <ServiceStatusBar stage={a.serviceStage} />
                                        <div className="flex flex-wrap gap-2 pt-2">
                                          {STAGE_STEPS.map((s) => {
                                            const isCurrent = a.serviceStage === s.key
                                            return (
                                              <button
                                                key={s.key}
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); updateAppointmentStage(a.id, s.key) }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                                  isCurrent
                                                    ? 'text-white border-transparent'
                                                    : 'text-ink-secondary border-surface-border hover:bg-surface-hover hover:text-ink-primary'
                                                }`}
                                                style={isCurrent ? { background: '#f07c00' } : {}}
                                              >
                                                {s.label}
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {a.jobOrderId ? (
                                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                                        Job order created: {a.jobOrderId}
                                      </p>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); convertAppointmentToJobOrder(a.id) }}
                                        className="btn-primary"
                                      >
                                        Convert To Job Order
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Calendar tab */}
          {tab === 'calendar' && (
            <BookingCalendar appointments={filteredAppointments} vehicleMap={vehicleMap} loading={false} />
          )}
      </section>
    </div>
  )
}
