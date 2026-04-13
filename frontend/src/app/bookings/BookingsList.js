'use client'

import { useState, Fragment } from 'react'
import { Plus, List, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppointments } from '@/hooks/useAppointments'
import { useVehicles }     from '@/hooks/useVehicles'
import { ServiceStatusBar } from '@/screens/BookingForm'
import BookingForm from '@/screens/BookingForm'
import BookingCalendar from './BookingCalendar'

const STATUS_META = {
  confirmed:   { label: 'Confirmed',   cls: 'badge-green'  },
  pending:     { label: 'Pending',     cls: 'badge-orange' },
  in_progress: { label: 'In Progress', cls: 'badge-blue'   },
  completed:   { label: 'Completed',   cls: 'badge-gray'   },
}

export default function BookingsList() {
  const [tab,        setTab]        = useState('list')
  const [expandedId, setExpandedId] = useState(null)

  const { appointments, loading: aLoad } = useAppointments()
  const { vehicles,     loading: vLoad } = useVehicles()
  const vehicleMap = Object.fromEntries((vehicles ?? []).map(v => [v.id, v]))

  function toggleRow(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-5">

      {/* ── Tab header ──────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface-card border border-surface-border rounded-xl w-fit max-w-full overflow-x-auto">
        {[
          { key: 'list',     icon: List,         label: 'All Bookings'  },
          { key: 'calendar', icon: CalendarDays, label: 'Calendar View' },
          { key: 'new',      icon: Plus,         label: 'New Booking'   },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              tab === t.key ? 'text-white' : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-hover'
            }`}
            style={tab === t.key ? { background: '#f07c00' } : {}}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── List tab ────────────────────────────── */}
      {tab === 'list' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <p className="card-title">All Bookings</p>
            <p className="text-xs text-ink-muted mt-0.5">Click any row to expand the service progress stepper</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
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
                {(aLoad || vLoad)
                  ? Array.from({length:4}).map((_,i) => (
                      <tr key={i} className="border-b border-surface-border">
                        {Array.from({length:7}).map((_,j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-3.5 bg-surface-raised rounded animate-pulse w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : appointments.map(a => {
                      const v      = vehicleMap[a.vehicleId]
                      const meta   = STATUS_META[a.status] ?? { label: a.status, cls: 'badge-gray' }
                      const isOpen = expandedId === a.id
                      const d      = new Date(a.slot).toLocaleString('en-PH',{
                        month:'short', day:'numeric', year:'numeric',
                        hour:'2-digit', minute:'2-digit',
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
                              <p className="font-mono text-xs font-bold" style={{color:'#f07c00'}}>
                                {a.jobOrderId ?? '—'}
                              </p>
                              <p className="text-sm font-semibold text-ink-primary mt-0.5">{v?.plate ?? '—'}</p>
                            </td>
                            <td className="px-5 py-4 text-ink-secondary">{v?.owner ?? '—'}</td>
                            <td className="px-5 py-4 text-ink-secondary text-xs">{d}</td>
                            <td className="px-5 py-4 text-ink-secondary max-w-[200px]">
                              <p className="truncate text-xs">{a.chosenServices.join(', ')}</p>
                            </td>
                            <td className="px-5 py-4 text-ink-secondary text-xs">{a.shopName}</td>
                            <td className="px-5 py-4">
                              <span className={`badge ${meta.cls}`}>{meta.label}</span>
                            </td>
                          </tr>

                          {isOpen && (
                            <tr
                              className="border-b border-surface-border bg-surface-raised/60">
                              <td colSpan={7} className="px-6 py-5">
                                <div className="max-w-2xl">
                                  <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-4">
                                    Service Progress — {v?.plate} · {v?.owner}
                                  </p>
                                  {a.serviceStage
                                    ? <ServiceStatusBar stage={a.serviceStage} />
                                    : (
                                      <p className="text-xs text-ink-muted italic">
                                        No active service stage — booking is{' '}
                                        <span className="text-ink-secondary font-semibold">{meta.label}</span>.
                                      </p>
                                    )
                                  }
                                  {a.notes && (
                                    <p className="text-xs text-ink-muted mt-4 pt-3 border-t border-surface-border">
                                      <span className="font-semibold text-ink-secondary">Notes:</span> {a.notes}
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Calendar tab ──────────────────────────── */}
      {tab === 'calendar' && (
        <BookingCalendar appointments={appointments} vehicleMap={vehicleMap} loading={aLoad || vLoad} />
      )}

      {/* ── New Booking tab ──────────────────────── */}
      {tab === 'new' && (
        <div className="card flex flex-col overflow-hidden"
             style={{ height: 'calc(100vh - 11rem)' }}>
          <BookingForm onSuccess={() => setTab('list')} />
        </div>
      )}
    </div>
  )
}
