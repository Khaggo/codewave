'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gauge,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  XCircle,
  Users,
} from 'lucide-react'
import {
  createTimeSlotDefinition,
  getCurrentQueue,
  getDailySchedule,
  getTimeSlotDefinitions,
  updateBookingStatus,
  updateTimeSlotDefinition,
} from '@/lib/bookingStaffClient'
import { useUser } from '@/lib/userContext'

const STAFF_BOOKING_ROLES = new Set(['service_adviser', 'super_admin'])

const STATUS_OPTIONS = [
  { value: 'all', label: 'All states' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'declined', label: 'Declined' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_META = {
  pending: { label: 'Pending', cls: 'badge-orange' },
  confirmed: { label: 'Confirmed', cls: 'badge-green' },
  rescheduled: { label: 'Rescheduled', cls: 'badge-blue' },
  declined: { label: 'Declined', cls: 'badge-gray' },
  completed: { label: 'Completed', cls: 'badge-gray' },
  cancelled: { label: 'Cancelled', cls: 'badge-gray' },
}

const initialLoadState = {
  status: 'idle',
  data: null,
  error: '',
}

const initialScheduleWindowState = {
  status: 'idle',
  dates: [],
  error: '',
}

const initialSlotForm = {
  label: '',
  startTime: '08:00',
  endTime: '09:00',
  capacity: '2',
}

const UPCOMING_SCHEDULE_DAYS = 31

const STAFF_ACTIONS_BY_STATUS = {
  pending: [
    {
      status: 'confirmed',
      label: 'Accept Booking',
      icon: CheckCircle2,
      className: 'btn-primary !px-3 !py-1.5 !text-xs',
      reason: 'Accepted by staff from admin appointments.',
    },
    {
      status: 'declined',
      label: 'Decline',
      icon: XCircle,
      className: 'btn-ghost !px-3 !py-1.5 !text-xs',
      reason: 'Declined by staff from admin appointments.',
    },
    {
      status: 'cancelled',
      label: 'Cancel',
      icon: XCircle,
      className: 'btn-danger !px-3 !py-1.5 !text-xs',
      reason: 'Cancelled by staff from admin appointments.',
    },
  ],
  confirmed: [
    {
      status: 'completed',
      label: 'Mark Complete',
      icon: CheckCircle2,
      className: 'btn-primary !px-3 !py-1.5 !text-xs',
      reason: 'Completed by staff from admin appointments.',
    },
    {
      status: 'cancelled',
      label: 'Cancel',
      icon: XCircle,
      className: 'btn-danger !px-3 !py-1.5 !text-xs',
      reason: 'Cancelled by staff from admin appointments.',
    },
  ],
  rescheduled: [
    {
      status: 'confirmed',
      label: 'Accept New Slot',
      icon: CheckCircle2,
      className: 'btn-primary !px-3 !py-1.5 !text-xs',
      reason: 'Accepted rescheduled slot from admin appointments.',
    },
    {
      status: 'cancelled',
      label: 'Cancel',
      icon: XCircle,
      className: 'btn-danger !px-3 !py-1.5 !text-xs',
      reason: 'Cancelled by staff from admin appointments.',
    },
  ],
}

function toDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildScheduleDateWindow() {
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return Array.from({ length: UPCOMING_SCHEDULE_DAYS }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index)

    return toDateKey(date)
  })
}

function formatDate(dateKey) {
  if (!dateKey) return 'Unscheduled'

  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return 'Not generated yet'

  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatClockLabel(value) {
  const normalizedValue = String(value ?? '').trim()
  const match = /^(\d{2}):(\d{2})/.exec(normalizedValue)

  if (!match) {
    return normalizedValue || '--'
  }

  const hours = Number(match[1])
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12

  return `${displayHour}:${minutes} ${meridiem}`
}

function formatTimeSlotWindow(slot) {
  if (!slot?.startTime || !slot?.endTime) {
    return ''
  }

  return `${formatClockLabel(slot.startTime)} - ${formatClockLabel(slot.endTime)}`
}

function formatBookingReference(id) {
  return id ? `BK-${id.slice(0, 8).toUpperCase()}` : 'BK-PENDING'
}

function getStatusMeta(status) {
  return STATUS_META[status] ?? { label: status ?? 'Unknown', cls: 'badge-gray' }
}

function getServiceNames(booking) {
  const names = (booking?.requestedServices ?? [])
    .map((requestedService) => requestedService?.service?.name)
    .filter(Boolean)

  return names.length > 0 ? names.join(', ') : 'No requested services attached'
}

function normalizeSlotOption(slot) {
  const timeSlotId = slot?.timeSlotId ?? slot?.id

  if (!timeSlotId) {
    return null
  }

  return {
    timeSlotId,
    label: slot.label ?? 'Unnamed slot',
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity ?? slot.totalCapacity,
    isActive: slot.isActive,
  }
}

function mergeSlotOptions(previousOptions, slots) {
  const byId = new Map(previousOptions.map((slot) => [slot.timeSlotId, slot]))

  slots.forEach((slot) => {
    const normalizedSlot = normalizeSlotOption(slot)

    if (normalizedSlot) {
      byId.set(normalizedSlot.timeSlotId, {
        ...byId.get(normalizedSlot.timeSlotId),
        ...normalizedSlot,
      })
    }
  })

  return Array.from(byId.values()).sort((left, right) => left.label.localeCompare(right.label))
}

function getBookingStatusActions(status) {
  return STAFF_ACTIONS_BY_STATUS[status] ?? []
}

function buildErrorState(error, fallback) {
  if (error?.status === 401) {
    return {
      status: 'unauthorized',
      error: 'Your staff session expired or is missing. Please sign in again before reading booking operations.',
    }
  }

  if (error?.status === 403) {
    return {
      status: 'forbidden',
      error: 'Only service advisers and super admins can read booking schedule and queue visibility.',
    }
  }

  if (error?.status === 400) {
    return {
      status: 'validation-error',
      error: error.message || 'The selected schedule or queue filter is invalid.',
    }
  }

  return {
    status: 'error',
    error: error?.message || fallback,
  }
}

function summarizeSchedule(schedule) {
  const slots = schedule?.slots ?? []

  return slots.reduce(
    (summary, slot) => {
      const slotTotal = (slot.bookings ?? []).length

      return {
        totalBookings: summary.totalBookings + slotTotal,
        totalCapacity: summary.totalCapacity + (slot.totalCapacity ?? 0),
        pendingCount: summary.pendingCount + (slot.pendingCount ?? 0),
        confirmedCount: summary.confirmedCount + (slot.confirmedCount ?? 0),
        rescheduledCount: summary.rescheduledCount + (slot.rescheduledCount ?? 0),
      }
    },
    {
      totalBookings: 0,
      totalCapacity: 0,
      pendingCount: 0,
      confirmedCount: 0,
      rescheduledCount: 0,
    },
  )
}

function getScheduleBookingTotal(schedule) {
  return summarizeSchedule(schedule).totalBookings
}

function StatusBadge({ status }) {
  const meta = getStatusMeta(status)
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>
}

function EmptyState({ icon: Icon, title, copy }) {
  return (
    <div className="px-5 py-12 text-center">
      <Icon size={30} className="mx-auto text-ink-dim mb-3" />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto">{copy}</p>
    </div>
  )
}

function BlockingState({ state, onRetry }) {
  const isForbidden = state.status === 'forbidden'
  const Icon = isForbidden ? ShieldAlert : AlertTriangle

  return (
    <div className="card px-5 py-10 text-center">
      <Icon size={34} className="mx-auto mb-3" style={{ color: isForbidden ? '#f07c00' : '#f87171' }} />
      <p className="text-sm font-bold text-ink-primary">
        {isForbidden ? 'Booking operations are role-gated' : 'Booking operations could not load'}
      </p>
      <p className="text-xs text-ink-muted mt-2 max-w-lg mx-auto">{state.error}</p>
      {onRetry && state.status !== 'forbidden' ? (
        <button onClick={onRetry} className="btn-ghost mt-5 mx-auto">
          <RefreshCw size={14} /> Retry
        </button>
      ) : null}
    </div>
  )
}

function SummaryTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-ink-muted">{label}</p>
          <p className="text-2xl font-black text-ink-primary mt-1">{value}</p>
          {sub ? <p className="text-[11px] text-ink-muted mt-1">{sub}</p> : null}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(240, 124, 0, 0.14)', color: '#f07c00' }}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function SlotDefinitionsPanel({
  slots,
  status,
  error,
  form,
  mutationState,
  onFormChange,
  onCreate,
  onToggleActive,
}) {
  if (status === 'loading' && slots.length === 0) {
    return (
      <div className="card p-4 text-xs text-ink-muted">
        Loading live slot definitions from the backend...
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="card p-4">
        <p className="card-title">Slot Definitions</p>
        <p className="text-xs text-ink-muted mt-1">
          {error || 'No time-slot definitions are available yet. Seed or publish slots before customers can book.'}
        </p>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        <div>
          <p className="card-title">Slot Definitions</p>
          <p className="text-xs text-ink-muted mt-1">
            These live definitions power the mobile slot picker and the staff schedule.
          </p>
        </div>
        {error ? <span className="badge badge-orange">Using last loaded definitions</span> : null}
      </div>

      <form onSubmit={onCreate} className="grid md:grid-cols-5 gap-2 mt-4 rounded-xl border border-surface-border bg-surface-raised p-3">
        <label className="text-xs text-ink-muted md:col-span-2">
          New slot label
          <input
            value={form.label}
            onChange={(event) => onFormChange({ label: event.target.value })}
            placeholder="e.g. Early Morning Express"
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
          />
        </label>
        <label className="text-xs text-ink-muted">
          Start
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => onFormChange({ startTime: event.target.value })}
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
          />
        </label>
        <label className="text-xs text-ink-muted">
          End
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => onFormChange({ endTime: event.target.value })}
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
          />
        </label>
        <label className="text-xs text-ink-muted">
          Capacity
          <input
            type="number"
            min="1"
            max="99"
            value={form.capacity}
            onChange={(event) => onFormChange({ capacity: event.target.value })}
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
          />
        </label>
        <button
          type="submit"
          disabled={mutationState.status === 'submitting'}
          className="btn-primary md:col-span-5 justify-center"
        >
          {mutationState.status === 'submitting' && mutationState.target === 'create' ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Clock size={14} />
          )}
          Add Slot Definition
        </button>
      </form>

      {mutationState.message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-xs mt-3 ${
            mutationState.status === 'error'
              ? 'border-red-500/25 bg-red-500/10 text-red-200'
              : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {mutationState.message}
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-4">
        {slots.map((slot) => (
          <div key={slot.timeSlotId} className="rounded-xl border border-surface-border bg-surface-raised p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink-primary">{slot.label}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {formatTimeSlotWindow(slot) || 'Time window unavailable'}
                </p>
              </div>
              <span className={`badge ${slot.isActive === false ? 'badge-gray' : 'badge-green'}`}>
                {slot.isActive === false ? 'Inactive' : 'Active'}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted mt-3">
              Capacity {slot.capacity ?? 'unset'} booking{slot.capacity === 1 ? '' : 's'} per date.
            </p>
            <button
              type="button"
              disabled={mutationState.status === 'submitting'}
              onClick={() => onToggleActive(slot)}
              className={`mt-3 w-full justify-center ${slot.isActive === false ? 'btn-primary' : 'btn-ghost'} !px-3 !py-2 !text-xs`}
            >
              {mutationState.status === 'submitting' && mutationState.target === slot.timeSlotId ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : null}
              {slot.isActive === false ? 'Activate Slot' : 'Pause Slot'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="card p-5">
          <div className="h-4 w-36 bg-surface-raised rounded animate-pulse" />
          <div className="grid md:grid-cols-3 gap-3 mt-5">
            {Array.from({ length: 3 }).map((__, itemIndex) => (
              <div key={itemIndex} className="h-16 bg-surface-raised rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ScheduleSlotCard({ slot, onStatusAction, busyBookingId }) {
  const bookings = slot.bookings ?? []
  const activeCount = (slot.pendingCount ?? 0) + (slot.confirmedCount ?? 0) + (slot.rescheduledCount ?? 0)
  const capacity = slot.totalCapacity ?? 0
  const utilization = capacity > 0 ? Math.min(100, Math.round((activeCount / capacity) * 100)) : 0
  const isHighPressure = capacity > 0 && activeCount >= capacity

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink-primary">{slot.label}</p>
            <p className="text-xs text-ink-muted mt-1">
              {bookings.length} booking{bookings.length === 1 ? '' : 's'} against {capacity} slot capacity
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="badge badge-orange">{slot.pendingCount ?? 0} pending</span>
            <span className="badge badge-green">{slot.confirmedCount ?? 0} confirmed</span>
            <span className="badge badge-blue">{slot.rescheduledCount ?? 0} rescheduled</span>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 rounded-full bg-surface-raised overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${utilization}%`,
                background: isHighPressure ? '#ef4444' : 'linear-gradient(90deg, #f07c00, #c9951a)',
              }}
            />
          </div>
          <p className="text-[11px] text-ink-muted mt-2">
            {utilization}% operational utilization
            {isHighPressure ? ' - high-pressure slot, monitor confirmations closely.' : ''}
          </p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings in this slot"
          copy="The schedule read model returned this time slot with no matching bookings for the selected filters."
        />
      ) : (
        <div className="divide-y divide-surface-border">
          {bookings.map((booking) => (
            <div key={booking.id} className="px-5 py-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold" style={{ color: '#f07c00' }}>
                    {formatBookingReference(booking.id)}
                  </p>
                  <p className="text-sm font-semibold text-ink-primary mt-1 truncate">{getServiceNames(booking)}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    User {booking.userId} / Vehicle {booking.vehicleId}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
              {booking.notes ? (
                <p className="text-xs text-ink-muted mt-3 pt-3 border-t border-surface-border">
                  <span className="font-semibold text-ink-secondary">Customer notes:</span> {booking.notes}
                </p>
              ) : null}
              {getBookingStatusActions(booking.status).length > 0 ? (
                <div className="mt-3 pt-3 border-t border-surface-border">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                    Staff handling
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getBookingStatusActions(booking.status).map((action) => {
                      const Icon = action.icon
                      const isBusy = busyBookingId === booking.id

                      return (
                        <button
                          key={`${booking.id}-${action.status}`}
                          type="button"
                          className={action.className}
                          disabled={Boolean(busyBookingId)}
                          onClick={() => onStatusAction(booking, action)}
                        >
                          {isBusy ? <RefreshCw size={13} className="animate-spin" /> : <Icon size={13} />}
                          {isBusy ? 'Working...' : action.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-ink-muted mt-3 pt-3 border-t border-surface-border">
                  No further staff actions are available for this booking state.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QueueTable({ queue }) {
  const items = queue?.items ?? []

  if (items.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={ListChecks}
          title="Queue is clear"
          copy="No confirmed or rescheduled bookings are queued for this date. Accept pending bookings in Daily Schedule to move them into the queue."
        />
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <p className="card-title">Current Queue</p>
        <p className="text-xs text-ink-muted mt-0.5">
          Derived from confirmed and rescheduled bookings. Generated {formatDateTime(queue.generatedAt)}.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
              <th className="px-5 py-3.5 font-semibold">Position</th>
              <th className="px-5 py-3.5 font-semibold">Booking</th>
              <th className="px-5 py-3.5 font-semibold">Vehicle</th>
              <th className="px-5 py-3.5 font-semibold">Slot</th>
              <th className="px-5 py-3.5 font-semibold">Date</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.queuePosition}-${item.bookingId}`} className="border-b border-surface-border last:border-b-0">
                <td className="px-5 py-4">
                  <span className="inline-flex w-8 h-8 rounded-full items-center justify-center text-xs font-black bg-surface-raised text-ink-primary">
                    {item.queuePosition}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <p className="font-mono text-xs font-bold" style={{ color: '#f07c00' }}>
                    {formatBookingReference(item.bookingId)}
                  </p>
                  <p className="text-[11px] text-ink-muted mt-1">User {item.userId}</p>
                </td>
                <td className="px-5 py-4 text-xs text-ink-secondary">{item.vehicleId}</td>
                <td className="px-5 py-4 text-xs text-ink-secondary">{item.timeSlotLabel}</td>
                <td className="px-5 py-4 text-xs text-ink-secondary">{formatDate(item.scheduledDate)}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BookingsList() {
  const user = useUser()
  const hasAutoSelectedUpcomingDate = useRef(false)
  const [tab, setTab] = useState('schedule')
  const [selectedDate, setSelectedDate] = useState(() => toDateKey())
  const [statusFilter, setStatusFilter] = useState('all')
  const [timeSlotFilter, setTimeSlotFilter] = useState('all')
  const [scheduleState, setScheduleState] = useState(initialLoadState)
  const [queueState, setQueueState] = useState(initialLoadState)
  const [scheduleWindowState, setScheduleWindowState] = useState(initialScheduleWindowState)
  const [slotDefinitionsState, setSlotDefinitionsState] = useState(initialLoadState)
  const [timeSlotOptions, setTimeSlotOptions] = useState([])
  const [slotForm, setSlotForm] = useState(initialSlotForm)
  const [slotMutationState, setSlotMutationState] = useState({
    status: 'idle',
    target: '',
    message: '',
  })
  const [actionState, setActionState] = useState({
    status: 'idle',
    busyBookingId: '',
    message: '',
  })

  const canReadBookingOperations = STAFF_BOOKING_ROLES.has(user?.role)

  const loadSlotDefinitions = useCallback(async () => {
    setSlotDefinitionsState((previous) => ({ ...previous, status: 'loading', error: '' }))

    try {
      const slots = await getTimeSlotDefinitions(user?.accessToken)
      const normalizedSlots = mergeSlotOptions([], Array.isArray(slots) ? slots : [])

      setSlotDefinitionsState({
        status: 'success',
        data: normalizedSlots,
        error: '',
      })
      setTimeSlotOptions((previous) => mergeSlotOptions(previous, normalizedSlots))
    } catch (error) {
      setSlotDefinitionsState((previous) => ({
        ...previous,
        data: previous.data,
        ...buildErrorState(error, 'Time-slot definitions could not be loaded.'),
      }))
    }
  }, [user?.accessToken])

  useEffect(() => {
    void loadSlotDefinitions()
  }, [loadSlotDefinitions])

  const loadStaffBookingReads = useCallback(async () => {
    if (!user?.accessToken) {
      const unauthorized = {
        status: 'unauthorized',
        data: null,
        error: 'Sign in with a staff session before reading booking schedule or queue visibility.',
      }
      setScheduleState(unauthorized)
      setQueueState(unauthorized)
      return
    }

    if (!canReadBookingOperations) {
      const forbidden = {
        status: 'forbidden',
        data: null,
        error: 'Technician access stays out of this booking schedule slice. Use a service adviser or super admin account.',
      }
      setScheduleState(forbidden)
      setQueueState(forbidden)
      return
    }

    const sharedQuery = {
      scheduledDate: selectedDate,
      timeSlotId: timeSlotFilter === 'all' ? undefined : timeSlotFilter,
    }

    setScheduleState((previous) => ({ ...previous, status: 'loading', error: '' }))
    setQueueState((previous) => ({ ...previous, status: 'loading', error: '' }))

    const [scheduleResult, queueResult] = await Promise.allSettled([
      getDailySchedule(
        {
          ...sharedQuery,
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
        user.accessToken,
      ),
      getCurrentQueue(sharedQuery, user.accessToken),
    ])

    if (scheduleResult.status === 'fulfilled') {
      setScheduleState({
        status: 'success',
        data: scheduleResult.value,
        error: '',
      })
      setTimeSlotOptions((previous) => mergeSlotOptions(previous, scheduleResult.value?.slots ?? []))
    } else {
      setScheduleState((previous) => ({
        ...previous,
        data: previous.data,
        ...buildErrorState(scheduleResult.reason, 'Daily schedule could not be loaded.'),
      }))
    }

    if (queueResult.status === 'fulfilled') {
      setQueueState({
        status: 'success',
        data: queueResult.value,
        error: '',
      })
    } else {
      setQueueState((previous) => ({
        ...previous,
        data: previous.data,
        ...buildErrorState(queueResult.reason, 'Current queue could not be loaded.'),
      }))
    }
  }, [canReadBookingOperations, selectedDate, statusFilter, timeSlotFilter, user?.accessToken])

  useEffect(() => {
    void loadStaffBookingReads()
  }, [loadStaffBookingReads])

  const handleSlotFormChange = useCallback((patch) => {
    setSlotForm((previous) => ({
      ...previous,
      ...patch,
    }))
    setSlotMutationState((previous) =>
      previous.status === 'error'
        ? {
            status: 'idle',
            target: '',
            message: '',
          }
        : previous,
    )
  }, [])

  const handleCreateSlotDefinition = useCallback(
    async (event) => {
      event.preventDefault()

      if (!user?.accessToken || !canReadBookingOperations) {
        setSlotMutationState({
          status: 'error',
          target: 'create',
          message: 'Sign in with a service adviser or super admin account before managing slots.',
        })
        return
      }

      const payload = {
        label: slotForm.label.trim(),
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        capacity: Number(slotForm.capacity),
        isActive: true,
      }

      if (
        !payload.label ||
        !payload.startTime ||
        !payload.endTime ||
        !Number.isInteger(payload.capacity) ||
        payload.capacity < 1
      ) {
        setSlotMutationState({
          status: 'error',
          target: 'create',
          message: 'Add a label, start time, end time, and whole-number capacity before creating a slot.',
        })
        return
      }

      setSlotMutationState({
        status: 'submitting',
        target: 'create',
        message: '',
      })

      try {
        await createTimeSlotDefinition(payload, user.accessToken)
        setSlotForm(initialSlotForm)
        setSlotMutationState({
          status: 'success',
          target: '',
          message: 'Slot definition added. Mobile booking discovery will see it after refresh.',
        })
        await Promise.allSettled([loadSlotDefinitions(), loadStaffBookingReads()])
      } catch (error) {
        setSlotMutationState({
          status: 'error',
          target: 'create',
          message: error?.message || 'Slot definition could not be created.',
        })
      }
    },
    [canReadBookingOperations, loadSlotDefinitions, loadStaffBookingReads, slotForm, user?.accessToken],
  )

  const handleToggleSlotActive = useCallback(
    async (slot) => {
      if (!slot?.timeSlotId || !user?.accessToken || !canReadBookingOperations) {
        setSlotMutationState({
          status: 'error',
          target: slot?.timeSlotId ?? '',
          message: 'Sign in with a service adviser or super admin account before managing slots.',
        })
        return
      }

      setSlotMutationState({
        status: 'submitting',
        target: slot.timeSlotId,
        message: '',
      })

      try {
        await updateTimeSlotDefinition(
          {
            timeSlotId: slot.timeSlotId,
            isActive: slot.isActive === false,
          },
          user.accessToken,
        )
        setSlotMutationState({
          status: 'success',
          target: '',
          message:
            slot.isActive === false
              ? 'Slot reactivated. Customers can select it again.'
              : 'Slot paused. Customers will no longer be able to select it.',
        })
        await Promise.allSettled([loadSlotDefinitions(), loadStaffBookingReads()])
      } catch (error) {
        setSlotMutationState({
          status: 'error',
          target: slot.timeSlotId,
          message: error?.message || 'Slot definition could not be updated.',
        })
      }
    },
    [canReadBookingOperations, loadSlotDefinitions, loadStaffBookingReads, user?.accessToken],
  )

  const loadUpcomingScheduleWindow = useCallback(async () => {
    if (!user?.accessToken || !canReadBookingOperations) {
      setScheduleWindowState(initialScheduleWindowState)
      return
    }

    const dateKeys = buildScheduleDateWindow()

    setScheduleWindowState((previous) => ({
      ...previous,
      status: 'loading',
      error: '',
    }))

    const results = await Promise.allSettled(
      dateKeys.map((dateKey) =>
        getDailySchedule(
          {
            scheduledDate: dateKey,
          },
          user.accessToken,
        ),
      ),
    )

    const dates = results
      .map((result, index) => {
        if (result.status !== 'fulfilled') {
          return null
        }

        const data = result.value
        const summary = summarizeSchedule(data)

        return {
          dateKey: dateKeys[index],
          totalBookings: getScheduleBookingTotal(data),
          pendingCount: summary.pendingCount,
        }
      })
      .filter(Boolean)

    setScheduleWindowState({
      status: 'success',
      dates,
      error: '',
    })

    const selectedDateSummary = dates.find((date) => date.dateKey === selectedDate)
    const nearestBookedDate = dates.find((date) => date.totalBookings > 0)

    if (
      !hasAutoSelectedUpcomingDate.current &&
      selectedDate === toDateKey() &&
      nearestBookedDate &&
      nearestBookedDate.dateKey !== selectedDate &&
      (selectedDateSummary?.totalBookings ?? 0) === 0
    ) {
      hasAutoSelectedUpcomingDate.current = true
      setSelectedDate(nearestBookedDate.dateKey)
    }
  }, [canReadBookingOperations, selectedDate, user?.accessToken])

  useEffect(() => {
    void loadUpcomingScheduleWindow()
  }, [loadUpcomingScheduleWindow])

  const handleBookingStatusAction = useCallback(
    async (booking, action) => {
      if (!booking?.id || !action?.status) {
        return
      }

      if (!user?.accessToken || !canReadBookingOperations) {
        setActionState({
          status: 'error',
          busyBookingId: '',
          message: 'Sign in with a service adviser or super admin account before handling bookings.',
        })
        return
      }

      setActionState({
        status: 'submitting',
        busyBookingId: booking.id,
        message: '',
      })

      try {
        await updateBookingStatus(
          {
            bookingId: booking.id,
            status: action.status,
            reason: action.reason,
          },
          user.accessToken,
        )

        setActionState({
          status: 'success',
          busyBookingId: '',
          message:
            action.status === 'confirmed'
              ? 'Booking accepted. It should now appear in the current queue for this date.'
              : `Booking moved to ${getStatusMeta(action.status).label.toLowerCase()}.`,
        })

        await Promise.allSettled([loadStaffBookingReads(), loadUpcomingScheduleWindow()])
      } catch (error) {
        setActionState({
          status: 'error',
          busyBookingId: '',
          message: error?.message || 'Booking status could not be updated.',
        })
      }
    },
    [canReadBookingOperations, loadStaffBookingReads, loadUpcomingScheduleWindow, user?.accessToken],
  )

  const scheduleSummary = useMemo(() => summarizeSchedule(scheduleState.data), [scheduleState.data])
  const bookedScheduleDates = useMemo(
    () => scheduleWindowState.dates.filter((date) => date.totalBookings > 0),
    [scheduleWindowState.dates],
  )
  const queueCount = queueState.data?.currentCount ?? 0
  const hasScheduleData = Boolean(scheduleState.data)
  const hasQueueData = Boolean(queueState.data)
  const scheduleSlots = scheduleState.data?.slots ?? []
  const slotDefinitions = slotDefinitionsState.data ?? []
  const scheduleHasBookings = scheduleSummary.totalBookings > 0
  const isLoadingSchedule = scheduleState.status === 'loading' && !hasScheduleData
  const isLoadingQueue = queueState.status === 'loading' && !hasQueueData

  return (
    <div className="space-y-5">
      <div className="card p-4 md:p-5">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Staff Booking Operations</p>
            <h1 className="text-xl md:text-2xl font-black text-ink-primary mt-1">Schedule, Queue, and Booking Handling</h1>
            <p className="text-sm text-ink-muted mt-2 max-w-2xl">
              Service advisers and super admins can accept pending mobile bookings, decline or cancel requests, mark
              confirmed work complete, and monitor the queue produced by confirmed appointments.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full xl:w-auto">
            <label className="text-xs text-ink-muted">
              Schedule date
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  hasAutoSelectedUpcomingDate.current = true
                  setSelectedDate(event.target.value || toDateKey())
                }}
                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Schedule status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-muted">
              Slot filter
              <select
                value={timeSlotFilter}
                onChange={(event) => setTimeSlotFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
              >
                <option value="all">All slots</option>
                {timeSlotOptions.map((slot) => (
                  <option key={slot.timeSlotId} value={slot.timeSlotId}>
                    {formatTimeSlotWindow(slot) ? `${slot.label} (${formatTimeSlotWindow(slot)})` : slot.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={loadStaffBookingReads}
              disabled={scheduleState.status === 'loading' || queueState.status === 'loading'}
              className="btn-primary self-end justify-center"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {bookedScheduleDates.length > 0 ? (
        <div className="card p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Upcoming Mobile Bookings</p>
              <p className="text-sm text-ink-secondary mt-1">
                Pick one of these dates to see customer-created pending bookings in the schedule view.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {bookedScheduleDates.map((date) => (
                <button
                  key={date.dateKey}
                  onClick={() => {
                    hasAutoSelectedUpcomingDate.current = true
                    setSelectedDate(date.dateKey)
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                    selectedDate === date.dateKey
                      ? 'border-[#f07c00] bg-[#f07c00] text-white'
                      : 'border-surface-border bg-surface-raised text-ink-secondary hover:border-[#f07c00]'
                  }`}
                >
                  {formatDate(date.dateKey)} - {date.totalBookings} booking{date.totalBookings === 1 ? '' : 's'}
                  {date.pendingCount ? ` / ${date.pendingCount} pending` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : scheduleWindowState.status === 'loading' ? (
        <div className="card p-4 text-xs text-ink-muted">Scanning the next month for customer-created bookings...</div>
      ) : null}

      <SlotDefinitionsPanel
        slots={slotDefinitions}
        status={slotDefinitionsState.status}
        error={slotDefinitionsState.error}
        form={slotForm}
        mutationState={slotMutationState}
        onFormChange={handleSlotFormChange}
        onCreate={handleCreateSlotDefinition}
        onToggleActive={handleToggleSlotActive}
      />

      <div className="flex gap-1 p-1 bg-surface-card border border-surface-border rounded-xl w-fit max-w-full overflow-x-auto">
        {[
          { key: 'schedule', icon: CalendarDays, label: 'Daily Schedule' },
          { key: 'queue', icon: ListChecks, label: 'Current Queue' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              tab === item.key ? 'text-white' : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-hover'
            }`}
            style={tab === item.key ? { background: '#f07c00' } : {}}
          >
            <item.icon size={14} /> {item.label}
          </button>
        ))}
      </div>

      {tab === 'schedule' ? (
        <div className="space-y-4">
          {!hasScheduleData && ['unauthorized', 'forbidden', 'validation-error', 'error'].includes(scheduleState.status) ? (
            <BlockingState state={scheduleState} onRetry={loadStaffBookingReads} />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <SummaryTile
                  icon={CalendarDays}
                  label="Scheduled Date"
                  value={formatDate(scheduleState.data?.scheduledDate ?? selectedDate)}
                  sub={statusFilter === 'all' ? 'All booking states shown' : `${getStatusMeta(statusFilter).label} filter active`}
                />
                <SummaryTile
                  icon={Users}
                  label="Schedule Bookings"
                  value={scheduleSummary.totalBookings}
                  sub={`${scheduleSummary.pendingCount} pending / ${scheduleSummary.confirmedCount} confirmed`}
                />
                <SummaryTile
                  icon={Gauge}
                  label="Slot Capacity"
                  value={scheduleSummary.totalCapacity}
                  sub={`${scheduleSummary.rescheduledCount} rescheduled bookings in view`}
                />
                <SummaryTile
                  icon={ListChecks}
                  label="Queue Count"
                  value={queueCount}
                  sub="Queue remains derived, not appointment truth"
                />
              </div>

              {actionState.message ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-xs ${
                    actionState.status === 'error'
                      ? 'border-red-500/25 bg-red-500/10 text-red-200'
                      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                  }`}
                >
                  {actionState.message}
                </div>
              ) : null}

              {scheduleState.error ? (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                  {scheduleState.error}
                </div>
              ) : null}

              {isLoadingSchedule ? (
                <LoadingRows />
              ) : scheduleSlots.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={Clock}
                    title="No schedule slots returned"
                    copy="The backend did not return slot definitions for this schedule query. Seed or publish time slots before customers can book."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {!scheduleHasBookings ? (
                    <div className="card">
                      <EmptyState
                        icon={CalendarDays}
                        title="No bookings match these filters"
                        copy="Slot definitions are still shown below so staff can confirm the day is configured even when nobody has booked yet."
                      />
                    </div>
                  ) : null}
                  {scheduleSlots.map((slot) => (
                    <ScheduleSlotCard
                      key={slot.timeSlotId}
                      slot={slot}
                      onStatusAction={handleBookingStatusAction}
                      busyBookingId={actionState.busyBookingId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      {tab === 'queue' ? (
        <div className="space-y-4">
          {!hasQueueData && ['unauthorized', 'forbidden', 'validation-error', 'error'].includes(queueState.status) ? (
            <BlockingState state={queueState} onRetry={loadStaffBookingReads} />
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                <SummaryTile
                  icon={ListChecks}
                  label="Current Queue"
                  value={queueCount}
                  sub={`For ${formatDate(queueState.data?.scheduledDate ?? selectedDate)}`}
                />
                <SummaryTile
                  icon={Clock}
                  label="Generated"
                  value={formatDateTime(queueState.data?.generatedAt)}
                  sub="Snapshot refreshes from the live read model"
                />
                <SummaryTile
                  icon={ShieldAlert}
                  label="Access Boundary"
                  value={canReadBookingOperations ? 'Allowed' : 'Forbidden'}
                  sub="Service adviser and super admin only"
                />
              </div>

              {queueState.error ? (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                  {queueState.error}
                </div>
              ) : null}

              {isLoadingQueue ? <LoadingRows /> : <QueueTable queue={queueState.data} />}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
