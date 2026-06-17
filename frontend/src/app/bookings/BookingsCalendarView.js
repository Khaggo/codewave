'use client'

import { CalendarDays, ChevronLeft, ChevronRight, Clock, UserRound, CarFront } from 'lucide-react'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_VISIBLE_BOOKINGS = 2

const STATUS_STYLES = {
  pending: {
    pillClass: 'bg-[rgba(240,124,0,0.16)] text-[#f7b267]',
    dotClass: 'bg-[#f07c00]',
    badgeClass: 'badge-orange',
    label: 'Pending',
  },
  confirmed: {
    pillClass: 'bg-emerald-500/15 text-emerald-300',
    dotClass: 'bg-emerald-400',
    badgeClass: 'badge-green',
    label: 'Confirmed',
  },
  rescheduled: {
    pillClass: 'bg-blue-500/15 text-blue-300',
    dotClass: 'bg-blue-400',
    badgeClass: 'badge-blue',
    label: 'Rescheduled',
  },
  completed: {
    pillClass: 'bg-zinc-700/60 text-zinc-300',
    dotClass: 'bg-zinc-400',
    badgeClass: 'badge-gray',
    label: 'Completed',
  },
  cancelled: {
    pillClass: 'bg-zinc-700/60 text-zinc-300',
    dotClass: 'bg-zinc-400',
    badgeClass: 'badge-gray',
    label: 'Cancelled',
  },
  declined: {
    pillClass: 'bg-zinc-700/60 text-zinc-300',
    dotClass: 'bg-zinc-400',
    badgeClass: 'badge-gray',
    label: 'Declined',
  },
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameMonth(left, right) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()
}

function buildCalendarCells(monthDate, groupedBookingsByDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPreviousMonth = new Date(year, month, 0).getDate()
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7
  const todayKey = toDateKey(new Date())

  return Array.from({ length: totalCells }, (_, index) => {
    let cellDate

    if (index < firstDayIndex) {
      cellDate = new Date(year, month - 1, daysInPreviousMonth - firstDayIndex + index + 1)
    } else if (index < firstDayIndex + daysInMonth) {
      cellDate = new Date(year, month, index - firstDayIndex + 1)
    } else {
      cellDate = new Date(year, month + 1, index - firstDayIndex - daysInMonth + 1)
    }

    const dateKey = toDateKey(cellDate)

    return {
      dateKey,
      dayNumber: cellDate.getDate(),
      isCurrentMonth: isSameMonth(cellDate, monthDate),
      isToday: dateKey === todayKey,
      bookings: groupedBookingsByDate[dateKey] ?? [],
    }
  })
}

function formatMonthLabel(monthDate) {
  return monthDate.toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  })
}

function formatLongDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusStyle(status) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.completed
}

export default function BookingsCalendarView({
  monthDate,
  groupedBookingsByDate,
  loading,
  error,
  selectedDate,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
}) {
  const calendarCells = buildCalendarCells(monthDate, groupedBookingsByDate)
  const selectedBookings = groupedBookingsByDate[selectedDate] ?? []

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div className="h-5 w-40 animate-pulse rounded bg-surface-raised" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-9 w-9 animate-pulse rounded-lg bg-surface-raised" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-surface-border">
          {Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="min-h-[128px] bg-surface-card p-3">
              <div className="h-4 w-6 animate-pulse rounded bg-surface-raised" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-surface-border px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
          <div>
            <p className="text-lg font-black text-ink-primary">{formatMonthLabel(monthDate)}</p>
            <p className="mt-1 text-xs text-ink-muted">
              Monthly bookings view synced to the same live schedule reads as the daily schedule tab.
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={onToday} className="btn-ghost !px-3 !py-2 !text-xs">
              Today
            </button>
            <button
              onClick={onPreviousMonth}
              className="rounded-lg border border-surface-border bg-surface-raised p-2 text-ink-muted transition hover:text-ink-primary"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={onNextMonth}
              className="rounded-lg border border-surface-border bg-surface-raised p-2 text-ink-muted transition hover:text-ink-primary"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-surface-border bg-surface-raised">
          {DAY_NAMES.map((dayName) => (
            <div
              key={dayName}
              className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted md:px-3"
            >
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-surface-border">
          {calendarCells.map((cell) => {
            const visibleBookings = cell.bookings.slice(0, MAX_VISIBLE_BOOKINGS)
            const hiddenCount = cell.bookings.length - visibleBookings.length
            const isSelected = cell.dateKey === selectedDate

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => onSelectDate(cell.dateKey)}
                className={`min-h-[132px] bg-surface-card p-2 text-left transition hover:bg-surface-hover md:min-h-[156px] md:p-3 ${
                  cell.isCurrentMonth ? '' : 'opacity-35'
                } ${isSelected ? 'ring-1 ring-inset ring-[#f07c00]' : ''}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      cell.isToday ? 'text-white' : 'text-ink-secondary'
                    }`}
                    style={cell.isToday ? { backgroundColor: '#f07c00' } : undefined}
                  >
                    {cell.dayNumber}
                  </span>
                  {cell.bookings.length > 0 ? (
                    <span className="text-[10px] font-semibold text-ink-muted">
                      {cell.bookings.length}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  {visibleBookings.map((booking) => {
                    const statusStyle = getStatusStyle(booking.status)
                    return (
                      <div
                        key={booking.id}
                        className={`truncate rounded-md px-2 py-1 text-[10px] font-semibold md:text-[11px] ${statusStyle.pillClass}`}
                      >
                        {booking.serviceLabel}
                      </div>
                    )
                  })}
                  {hiddenCount > 0 ? (
                    <p className="px-1 text-[10px] font-semibold text-ink-muted">+{hiddenCount} more</p>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-surface-border px-4 py-3 md:px-5">
          {Object.entries(STATUS_STYLES)
            .filter(([status]) => ['confirmed', 'pending', 'rescheduled'].includes(status))
            .map(([status, style]) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${style.dotClass}`} />
                <span className="text-xs text-ink-muted">{style.label}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'linear-gradient(135deg, rgba(240,124,0,0.20) 0%, rgba(179,84,30,0.25) 100%)' }}
              >
                <CalendarDays size={18} style={{ color: '#f7b267' }} />
              </div>
              <div>
                <p className="text-base font-black text-ink-primary">{formatLongDate(selectedDate)}</p>
                <p className="text-xs text-ink-muted">
                  {selectedBookings.length} booking{selectedBookings.length === 1 ? '' : 's'} on the selected day
                </p>
              </div>
            </div>
            {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
          </div>
        </div>

        {selectedBookings.length === 0 ? (
          <div className="mt-5 rounded-xl border border-surface-border bg-surface-raised px-4 py-8 text-center">
            <p className="text-sm font-semibold text-ink-primary">No bookings loaded for this date</p>
            <p className="mt-1 text-xs text-ink-muted">
              Pick another day in the month or adjust the status and slot filters above.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {selectedBookings.map((booking) => {
              const statusStyle = getStatusStyle(booking.status)

              return (
                <div
                  key={booking.id}
                  className="rounded-xl border border-surface-border bg-surface-raised px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-primary">{booking.serviceLabel}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-secondary">
                        <span className="flex items-center gap-1.5">
                          <UserRound size={12} style={{ color: '#f07c00' }} />
                          {booking.customerLabel}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CarFront size={12} style={{ color: '#f07c00' }} />
                          {booking.vehicleLabel}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} style={{ color: '#f07c00' }} />
                          {booking.slotWindow || booking.slotLabel}
                        </span>
                      </div>
                    </div>
                    <span className={`badge ${statusStyle.badgeClass}`}>{statusStyle.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
