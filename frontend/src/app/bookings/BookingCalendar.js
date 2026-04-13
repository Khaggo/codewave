'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, X, Clock, MapPin } from 'lucide-react'

const STATUS_COLORS = {
  confirmed:   { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Confirmed' },
  pending:     { bg: 'bg-[rgba(240,124,0,0.15)]', text: 'text-[#f07c00]', dot: 'bg-[#f07c00]', label: 'Pending' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400', label: 'In Progress' },
  completed:   { bg: 'bg-zinc-700/40', text: 'text-zinc-400', dot: 'bg-zinc-400', label: 'Completed' },
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_PILLS = 3

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
  const todayStr = new Date().toISOString().slice(0, 10)
  const days = []

  for (let i = 0; i < totalCells; i++) {
    if (i < firstDay) {
      const day = daysInPrev - firstDay + 1 + i
      const d = new Date(year, month - 1, day)
      days.push({ date: fmt(d), day, isCurrentMonth: false, isToday: false })
    } else if (i < firstDay + daysInMonth) {
      const day = i - firstDay + 1
      const d = new Date(year, month, day)
      const dateStr = fmt(d)
      days.push({ date: dateStr, day, isCurrentMonth: true, isToday: dateStr === todayStr })
    } else {
      const day = i - firstDay - daysInMonth + 1
      const d = new Date(year, month + 1, day)
      days.push({ date: fmt(d), day, isCurrentMonth: false, isToday: false })
    }
  }
  return days
}

function fmt(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatMonthYear(date) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function formatFullDate(dateKey) {
  const d = new Date(dateKey + 'T00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTime(slot) {
  const d = new Date(slot)
  return d.toLocaleString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

/* ── Day Detail Modal ──────────────────────────────────────────────────── */

function DayDetailModal({ dateKey, appointments, vehicleMap, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const dayAppts = appointments.filter(a => a.slot.slice(0, 10) === dateKey)

  return (
    <>
      <div className="fixed inset-0 bg-black/65 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="bg-surface-raised border border-surface-border rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-card-md animate-slide-up overflow-hidden max-h-[85vh] flex flex-col">

          {/* Header */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
              style={{ background: 'linear-gradient(135deg, #f07c00, #c9951a)' }}>
              <CalendarDays size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-primary">{formatFullDate(dateKey)}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {dayAppts.length} booking{dayAppts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto cc-scrollbar">
            {dayAppts.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CalendarDays size={28} className="mx-auto text-ink-dim mb-2" />
                <p className="text-sm text-ink-muted">No bookings on this day</p>
              </div>
            ) : (
              dayAppts.map(a => {
                const v = vehicleMap[a.vehicleId]
                const sc = STATUS_COLORS[a.status] ?? STATUS_COLORS.completed
                return (
                  <div key={a.id} className="px-5 py-4 border-b border-surface-border last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-ink-primary">
                        {a.chosenServices.join(', ')}
                      </p>
                      <span className={`badge ${
                        a.status === 'confirmed' ? 'badge-green' :
                        a.status === 'pending' ? 'badge-orange' :
                        a.status === 'in_progress' ? 'badge-blue' : 'badge-gray'
                      }`}>{sc.label}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs">
                        <span className="font-mono font-bold" style={{ color: '#f07c00' }}>
                          {v?.plate ?? '—'}
                        </span>
                        <span className="text-ink-secondary ml-2">{v?.model ?? ''}</span>
                      </p>
                      <p className="text-xs text-ink-secondary">{v?.owner ?? '—'}</p>
                      <div className="flex items-center gap-3 text-xs text-ink-muted mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {formatTime(a.slot)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {a.shopName}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Main Calendar Component ───────────────────────────────────────────── */

export default function BookingCalendar({ appointments, vehicleMap, loading }) {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(null)

  const grouped = useMemo(() => {
    const map = {}
    for (const a of (appointments ?? [])) {
      const key = a.slot.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(a)
    }
    return map
  }, [appointments])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = useMemo(() => getCalendarDays(year, month), [year, month])

  const goBack = () => setCurrentMonth(new Date(year, month - 1, 1))
  const goForward = () => setCurrentMonth(new Date(year, month + 1, 1))
  const goToday = () => { const n = new Date(); setCurrentMonth(new Date(n.getFullYear(), n.getMonth(), 1)) }
  const closeModal = useCallback(() => setSelectedDate(null), [])

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <div className="h-5 w-40 bg-surface-raised rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-7 gap-px bg-surface-border">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="bg-surface-card min-h-[120px] lg:min-h-[140px] p-2.5">
              <div className="h-3 w-5 bg-surface-raised rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card overflow-hidden overflow-x-auto">
        <div className="min-w-[640px]">

        {/* ── Month header ───────────────────── */}
        <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm md:text-base font-bold text-ink-primary">{formatMonthYear(currentMonth)}</h2>
          <div className="flex items-center gap-1">
            <button onClick={goToday}
              className="px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-surface-hover border border-surface-border transition-colors">
              Today
            </button>
            <button onClick={goBack}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goForward}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Day-of-week header ─────────────── */}
        <div className="grid grid-cols-7 border-b border-surface-border bg-surface-raised">
          {DAY_NAMES.map(d => (
            <div key={d} className="px-3 py-2.5 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* ── Calendar grid ──────────────────── */}
        <div className="grid grid-cols-7 gap-px bg-surface-border">
          {days.map((cell, i) => {
            const appts = grouped[cell.date] ?? []
            const visible = appts.slice(0, MAX_PILLS)
            const remaining = appts.length - MAX_PILLS

            return (
              <div key={i}
                onClick={() => setSelectedDate(cell.date)}
                className={`bg-surface-card min-h-[120px] lg:min-h-[140px] p-2.5 cursor-pointer transition-colors hover:bg-surface-hover ${
                  !cell.isCurrentMonth ? 'opacity-30' : ''
                }`}>

                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold leading-none ${
                    cell.isToday
                      ? 'w-6 h-6 flex items-center justify-center rounded-full text-white'
                      : 'text-ink-secondary'
                  }`} style={cell.isToday ? { background: '#f07c00' } : {}}>
                    {cell.day}
                  </span>
                </div>

                {/* Event pills */}
                <div className="space-y-1 mt-1">
                  {visible.map(a => {
                    const sc = STATUS_COLORS[a.status] ?? STATUS_COLORS.completed
                    return (
                      <div key={a.id}
                        className={`${sc.bg} ${sc.text} text-[10px] lg:text-[11px] font-medium px-1.5 py-1 rounded truncate leading-tight`}>
                        {a.chosenServices[0]}
                      </div>
                    )
                  })}
                  {remaining > 0 && (
                    <p className="text-[10px] text-ink-muted font-medium mt-0.5 px-1 cursor-pointer hover:text-ink-secondary">
                      +{remaining} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Legend ──────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 md:gap-5 px-4 md:px-5 py-3 border-t border-surface-border">
          {Object.entries(STATUS_COLORS)
            .filter(([key]) => key !== 'completed')
            .map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
                <span className="text-xs text-ink-muted">{val.label}</span>
              </div>
            ))}
        </div>

        </div>{/* end min-w wrapper */}
      </div>

      {/* ── Day detail modal ────────────────── */}
      {selectedDate && (
        <DayDetailModal
          dateKey={selectedDate}
          appointments={appointments ?? []}
          vehicleMap={vehicleMap}
          onClose={closeModal}
        />
      )}
    </>
  )
}
