'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  Gauge,
  ListChecks,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
  X,
  XCircle,
  Users,
} from 'lucide-react'
import {
  createTimeSlotDefinition,
  deleteTimeSlotDefinition,
  getCurrentQueue,
  getDailySchedule,
  getTimeSlotDefinitions,
  updateBookingStatus,
  updateTimeSlotDefinition,
} from '@/lib/bookingStaffClient'
import { useToast } from '@/components/Toast'
import { useUser } from '@/lib/userContext'
import BookingActionConfirmModal from './BookingActionConfirmModal'
import BookingsCalendarView from './BookingsCalendarView'

const STAFF_BOOKING_ROLES = new Set(['service_adviser', 'super_admin'])

const STATUS_OPTIONS = [
  { value: 'all', label: 'All states' },
  { value: 'pending_payment', label: 'Awaiting Reservation Fee' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_service', label: 'Workshop Handoff' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'declined', label: 'Declined' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_META = {
  pending_payment: { label: 'Awaiting Reservation Fee', cls: 'badge-orange' },
  pending: { label: 'Pending', cls: 'badge-orange' },
  confirmed: { label: 'Confirmed', cls: 'badge-green' },
  in_service: { label: 'Workshop Handoff', cls: 'badge-blue' },
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

const initialCalendarState = {
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
  pending_payment: [
    {
      status: 'cancelled',
      label: 'Cancel Hold',
      icon: XCircle,
      className: 'booking-status-action-danger',
      reason: 'Cancelled unpaid reservation hold from booking operations.',
      requiresConfirmation: true,
      confirmMessage: 'Are you sure you want to cancel this unpaid reservation hold?',
      confirmLabel: 'Cancel reservation hold',
    },
  ],
  pending: [
    {
      status: 'confirmed',
      label: 'Accept Booking',
      icon: CheckCircle2,
      className: 'booking-status-action-primary',
      reason: 'Accepted by staff from admin appointments.',
    },
    {
      status: 'declined',
      label: 'Decline',
      icon: XCircle,
      className: 'booking-status-action-secondary',
      reason: 'Declined by staff from admin appointments.',
      requiresConfirmation: true,
      confirmMessage: 'Are you sure you want to decline this booking?',
      confirmLabel: 'Decline booking',
    },
    {
      status: 'cancelled',
      label: 'Cancel',
      icon: XCircle,
      className: 'booking-status-action-danger',
      reason: 'Cancelled by staff from admin appointments.',
      requiresConfirmation: true,
      confirmMessage: 'Are you sure you want to cancel this booking?',
      confirmLabel: 'Cancel booking',
    },
  ],
  confirmed: [
    {
      status: 'in_service',
      label: 'Send To Workshop',
      icon: CheckCircle2,
      className: 'booking-status-action-primary',
      reason: 'Handed off to workshop execution from booking operations.',
    },
    {
      status: 'cancelled',
      label: 'Cancel',
      icon: XCircle,
      className: 'booking-status-action-danger',
      reason: 'Cancelled by staff from admin appointments.',
      requiresConfirmation: true,
      confirmMessage: 'Are you sure you want to cancel this booking?',
      confirmLabel: 'Cancel booking',
    },
  ],
  rescheduled: [
    {
      status: 'confirmed',
      label: 'Accept New Slot',
      icon: CheckCircle2,
      className: 'booking-status-action-primary',
      reason: 'Accepted rescheduled slot from admin appointments.',
    },
    {
      status: 'cancelled',
      label: 'Cancel',
      icon: XCircle,
      className: 'booking-status-action-danger',
      reason: 'Cancelled by staff from admin appointments.',
      requiresConfirmation: true,
      confirmMessage: 'Are you sure you want to cancel this booking?',
      confirmLabel: 'Cancel booking',
    },
  ],
  in_service: [
    {
      status: 'cancelled',
      label: 'Cancel',
      icon: XCircle,
      className: 'booking-status-action-danger',
      reason: 'Cancelled by staff after workshop handoff.',
      requiresConfirmation: true,
      confirmMessage: 'Are you sure you want to cancel this workshop-handoff booking?',
      confirmLabel: 'Cancel booking',
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

function toDateFromKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`)
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function buildMonthDateWindow(monthDate = new Date()) {
  const activeMonth = startOfMonth(monthDate)
  const daysInMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) =>
    toDateKey(new Date(activeMonth.getFullYear(), activeMonth.getMonth(), index + 1)),
  )
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

function formatPesoFromCents(amountCents) {
  const amount = Number(amountCents ?? 0) / 100
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function getReservationPaymentStatusLabel(payment) {
  switch (payment?.status) {
    case 'paid':
      return 'Paid'
    case 'failed':
      return 'Payment failed'
    case 'cancelled':
      return 'Payment cancelled'
    case 'refunded':
      return 'Refund review'
    case 'expired':
      return 'Hold expired'
    default:
      return 'Awaiting payment'
  }
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

function toSortableTimeValue(value) {
  const normalizedValue = String(value ?? '').trim()
  const match = /^(\d{2}):(\d{2})/.exec(normalizedValue)

  if (!match) {
    return Number.POSITIVE_INFINITY
  }

  return Number(match[1]) * 60 + Number(match[2])
}

function compareSlotsByStartTime(left, right) {
  const startTimeDifference = toSortableTimeValue(left?.startTime) - toSortableTimeValue(right?.startTime)

  if (startTimeDifference !== 0) {
    return startTimeDifference
  }

  const endTimeDifference = toSortableTimeValue(left?.endTime) - toSortableTimeValue(right?.endTime)

  if (endTimeDifference !== 0) {
    return endTimeDifference
  }

  return String(left?.label ?? '').localeCompare(String(right?.label ?? ''))
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

function getCustomerLabel(record) {
  return record?.customerLabel || record?.customerName || record?.customerEmail || `User ${record?.userId ?? 'Unknown'}`
}

function getVehicleLabel(record) {
  return record?.vehicleLabel || record?.vehicleDisplayName || record?.plateNumber || `Vehicle ${record?.vehicleId ?? 'Unknown'}`
}

function flattenScheduleBookings(schedule) {
  return (schedule?.slots ?? []).flatMap((slot) =>
    (slot.bookings ?? []).map((booking) => ({
      ...booking,
      scheduledDate: schedule?.scheduledDate ?? booking?.scheduledDate ?? '',
      slotLabel: slot.label ?? 'Unassigned slot',
      slotWindow: formatTimeSlotWindow(slot) || slot.label || 'Time slot unavailable',
      serviceLabel: getServiceNames(booking),
      customerLabel: getCustomerLabel(booking),
      vehicleLabel: getVehicleLabel(booking),
    })),
  )
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

  return Array.from(byId.values()).sort(compareSlotsByStartTime)
}

function getBookingStatusActions(status) {
  return STAFF_ACTIONS_BY_STATUS[status] ?? []
}

function getBookingHandoffStateMeta(booking) {
  if (booking?.jobOrderId) {
    return { label: 'Job Order Created', cls: 'badge-green' }
  }

  return null
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
        pendingPaymentCount:
          summary.pendingPaymentCount +
          (slot.bookings ?? []).filter((booking) => booking.status === 'pending_payment').length,
        pendingCount: summary.pendingCount + (slot.pendingCount ?? 0),
        confirmedCount: summary.confirmedCount + (slot.confirmedCount ?? 0),
        inServiceCount: summary.inServiceCount + (slot.inServiceCount ?? 0),
        rescheduledCount: summary.rescheduledCount + (slot.rescheduledCount ?? 0),
      }
    },
    {
      totalBookings: 0,
      totalCapacity: 0,
      pendingPaymentCount: 0,
      pendingCount: 0,
      confirmedCount: 0,
      inServiceCount: 0,
      rescheduledCount: 0,
    },
  )
}

function resolveScheduleScope(statusFilter, scheduleScope) {
  return statusFilter === 'all' ? scheduleScope : undefined
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
    <div className="flex min-h-[180px] flex-col items-center justify-center px-5 py-8 text-center">
      <Icon size={22} className="mx-auto mb-3 text-ink-dim" />
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
    <div className="card p-5 transition-colors hover:border-[rgba(240,124,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(240, 124, 0, 0.14)', color: '#f07c00' }}
        >
          <Icon size={14} />
        </div>
      </div>
      <p className="text-3xl font-black tracking-tight tabular-nums text-ink-primary mt-3">{value}</p>
      {sub ? <p className="text-[11px] text-ink-muted mt-1.5">{sub}</p> : null}
    </div>
  )
}

function SlotDefinitionsPanel({
  slots,
  status,
  error,
  form,
  editForm,
  editingSlotId,
  mutationState,
  onFormChange,
  onEditFormChange,
  onCreate,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleActive,
  onDelete,
}) {
  if (status === 'loading' && slots.length === 0) {
    return (
      <div className="card p-4 text-xs text-ink-muted">
        Loading live slot definitions from the backend...
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        <div>
          <p className="card-title">Slot Definitions</p>
          <p className="text-xs text-ink-muted mt-1">
            Manage the appointment windows customers can choose from the mobile booking flow.
          </p>
        </div>
        {error ? <span className="badge badge-orange">Using last loaded definitions</span> : null}
      </div>

      <form onSubmit={onCreate} className="booking-slot-create-form">
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
          className="booking-slot-create-action"
        >
          {mutationState.status === 'submitting' && mutationState.target === 'create' ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Clock size={14} />
          )}
          Add Slot
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

      {slots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border bg-surface-panel px-4 py-3 text-xs text-ink-muted mt-4">
          {error || 'No time-slot definitions are available yet. Create the first slot here or seed slots before customers can book.'}
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
        {slots.map((slot) => {
          const isEditing = editingSlotId === slot.timeSlotId
          const isBusy = mutationState.status === 'submitting' && mutationState.target === slot.timeSlotId

          return (
            <div key={slot.timeSlotId} className="booking-slot-card">
              {isEditing ? (
                <div className="space-y-3">
                  <label className="text-xs text-ink-muted">
                    Label
                    <input
                      value={editForm.label}
                      onChange={(event) => onEditFormChange({ label: event.target.value })}
                      className="input mt-1 !py-2"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-ink-muted">
                      Start
                      <input
                        type="time"
                        value={editForm.startTime}
                        onChange={(event) => onEditFormChange({ startTime: event.target.value })}
                        className="input mt-1 !py-2"
                      />
                    </label>
                    <label className="text-xs text-ink-muted">
                      End
                      <input
                        type="time"
                        value={editForm.endTime}
                        onChange={(event) => onEditFormChange({ endTime: event.target.value })}
                        className="input mt-1 !py-2"
                      />
                    </label>
                  </div>
                  <label className="text-xs text-ink-muted">
                    Capacity
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={editForm.capacity}
                      onChange={(event) => onEditFormChange({ capacity: event.target.value })}
                      className="input mt-1 !py-2"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-primary !px-3 !py-2 !text-xs" onClick={() => onSaveEdit(slot)} disabled={isBusy}>
                      {isBusy ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      Save
                    </button>
                    <button type="button" className="btn-ghost !px-3 !py-2 !text-xs" onClick={onCancelEdit} disabled={isBusy}>
                      <X size={13} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="booking-slot-card-header">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-ink-primary">{slot.label}</p>
                      <p className="mt-1 text-sm text-ink-secondary">
                        {formatTimeSlotWindow(slot) || 'Time window unavailable'}
                      </p>
                    </div>
                    <span className={`badge ${slot.isActive === false ? 'badge-gray' : 'badge-green'}`}>
                      {slot.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-ink-muted">
                    Capacity {slot.capacity ?? 'unset'} booking{slot.capacity === 1 ? '' : 's'} per date.
                  </p>
                  <div className="booking-slot-card-actions">
                    <button
                      type="button"
                      disabled={mutationState.status === 'submitting'}
                      onClick={() => onStartEdit(slot)}
                      className="booking-slot-action-secondary"
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={mutationState.status === 'submitting'}
                      onClick={() => onToggleActive(slot)}
                      className={slot.isActive === false ? 'booking-slot-action-primary' : 'booking-slot-action-secondary'}
                    >
                      {isBusy ? <RefreshCw size={13} className="animate-spin" /> : null}
                      {slot.isActive === false ? 'Activate' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      disabled={mutationState.status === 'submitting'}
                      onClick={() => onDelete(slot)}
                      className="booking-slot-action-danger"
                    >
                      {isBusy ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Delete Slot
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
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

function ScheduleSlotCard({ slot, onStatusAction, onOpenJobOrder, busyBookingId }) {
  const bookings = slot.bookings ?? []
  const paymentHoldCount = bookings.filter((booking) => booking.status === 'pending_payment').length
  const activeCount =
    paymentHoldCount +
    (slot.pendingCount ?? 0) +
    (slot.confirmedCount ?? 0) +
    (slot.rescheduledCount ?? 0)
  const capacity = slot.totalCapacity ?? 0
  const utilization = capacity > 0 ? Math.min(100, Math.round((activeCount / capacity) * 100)) : 0
  const isHighPressure = capacity > 0 && activeCount >= capacity

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-surface-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-primary">{slot.label}</p>
            {formatTimeSlotWindow(slot) ? (
              <p className="text-xs text-ink-secondary mt-1">{formatTimeSlotWindow(slot)}</p>
            ) : null}
            <p className="text-[11px] text-ink-muted mt-0.5">
              {bookings.length} booking{bookings.length === 1 ? '' : 's'} · {capacity} capacity ·{' '}
              <span className="tabular-nums" style={{ color: isHighPressure ? '#ef4444' : '#f07c00' }}>
                {utilization}%
              </span>
              {isHighPressure ? ' · high-pressure' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px] shrink-0">
            <span className="badge badge-orange">{paymentHoldCount} awaiting fee</span>
            <span className="badge badge-orange">{slot.pendingCount ?? 0} pending</span>
            <span className="badge badge-green">{slot.confirmedCount ?? 0} confirmed</span>
            <span className="badge badge-blue">{slot.rescheduledCount ?? 0} rescheduled</span>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-surface-raised overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${utilization}%`,
              background: isHighPressure ? '#ef4444' : 'linear-gradient(90deg, #f07c00, #c9951a)',
            }}
          />
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings in this slot"
          copy="No matching bookings for the selected filters."
        />
      ) : (
        <div className="divide-y divide-surface-border">
          {bookings.map((booking) => {
            const actions = booking.jobOrderId ? [] : getBookingStatusActions(booking.status)
            const handoffStateMeta = getBookingHandoffStateMeta(booking)
            return (
              <div key={booking.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-mono text-[11px] font-bold tracking-wide" style={{ color: '#f07c00' }}>
                    {formatBookingReference(booking.id)}
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {handoffStateMeta ? <span className={`badge ${handoffStateMeta.cls}`}>{handoffStateMeta.label}</span> : null}
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
                <p className="text-sm font-semibold text-ink-primary mt-1.5 truncate">{getServiceNames(booking)}</p>
                <div className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  <p className="text-xs text-ink-muted truncate">
                    {getCustomerLabel(booking)}
                    {booking.customerEmail && booking.customerEmail !== getCustomerLabel(booking) ? ` · ${booking.customerEmail}` : ''}
                  </p>
                  <p className="text-xs text-ink-muted truncate">
                    {getVehicleLabel(booking)}
                    {booking.plateNumber && booking.plateNumber !== getVehicleLabel(booking) ? ` · Plate ${booking.plateNumber}` : ''}
                  </p>
                </div>

                {booking.notes ? (
                  <p className="text-xs text-ink-muted mt-3">
                    <span className="font-semibold text-ink-secondary">Notes:</span> {booking.notes}
                  </p>
                ) : null}

                {booking.reservationPayment ? (
                  <div className="mt-3 rounded-2xl border border-surface-border bg-surface p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink-secondary">Reservation fee</p>
                      <span className="badge badge-orange">
                        {getReservationPaymentStatusLabel(booking.reservationPayment)}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-ink-secondary">Amount:</span>{' '}
                        {formatPesoFromCents(booking.reservationPayment.amountCents)}
                      </p>
                      <p>
                        <span className="font-semibold text-ink-secondary">Expires:</span>{' '}
                        {booking.reservationPayment.expiresAt
                          ? formatDateTime(booking.reservationPayment.expiresAt)
                          : 'No expiry recorded'}
                      </p>
                      <p className="sm:col-span-2">
                        <span className="font-semibold text-ink-secondary">Reference:</span>{' '}
                        {booking.reservationPayment.referenceNumber || 'Generated after payment confirmation'}
                      </p>
                    </div>
                    {booking.reservationPayment.failureReason ? (
                      <p className="mt-2 text-xs text-rose-300">{booking.reservationPayment.failureReason}</p>
                    ) : booking.status === 'pending_payment' ? (
                      <p className="mt-2 text-xs text-amber-200">
                        Slot capacity stays on hold until the reservation fee is paid or the payment window expires.
                      </p>
                    ) : booking.reservationPayment.status === 'paid' ? (
                      <p className="mt-2 text-xs text-emerald-300">
                        Reservation fee is secured and should be deducted from the final invoice total.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {booking.jobOrderId ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-ghost min-h-10 w-full justify-center px-4 text-sm sm:w-auto sm:min-w-[152px]"
                      onClick={() => onOpenJobOrder(booking)}
                    >
                      <ListChecks size={13} />
                      Open Job Order
                    </button>
                  </div>
                ) : null}

                {actions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {actions.map((action) => {
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
                ) : null}
              </div>
            )
          })}
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
              <th className="px-5 py-3.5 font-semibold">Customer</th>
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
                  <p className="text-[11px] text-ink-secondary mt-1">{getCustomerLabel(item)}</p>
                  {item.customerEmail && item.customerEmail !== getCustomerLabel(item) ? (
                    <p className="text-[11px] text-ink-muted mt-1">{item.customerEmail}</p>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-xs text-ink-secondary">
                  <p>{getVehicleLabel(item)}</p>
                  {item.plateNumber && item.plateNumber !== getVehicleLabel(item) ? (
                    <p className="text-[11px] text-ink-muted mt-1">Plate {item.plateNumber}</p>
                  ) : null}
                </td>
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
  const selectedDateRef = useRef(toDateKey())
  const [tab, setTab] = useState('schedule')
  const [scheduleScope, setScheduleScope] = useState('active')
  const [selectedDate, setSelectedDate] = useState(() => toDateKey())
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [statusFilter, setStatusFilter] = useState('all')
  const [timeSlotFilter, setTimeSlotFilter] = useState('all')
  const [scheduleState, setScheduleState] = useState(initialLoadState)
  const [queueState, setQueueState] = useState(initialLoadState)
  const [scheduleWindowState, setScheduleWindowState] = useState(initialScheduleWindowState)
  const [calendarState, setCalendarState] = useState(initialCalendarState)
  const [slotDefinitionsState, setSlotDefinitionsState] = useState(initialLoadState)
  const [timeSlotOptions, setTimeSlotOptions] = useState([])
  const [slotForm, setSlotForm] = useState(initialSlotForm)
  const [editingSlotId, setEditingSlotId] = useState('')
  const [slotEditForm, setSlotEditForm] = useState(initialSlotForm)
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
  const [pendingAction, setPendingAction] = useState(null)
  const { toast } = useToast()

  const canReadBookingOperations = STAFF_BOOKING_ROLES.has(user?.role)

  useEffect(() => {
    selectedDateRef.current = selectedDate
  }, [selectedDate])

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

    const scheduleQuery = {
      scheduledDate: selectedDate,
      timeSlotId: timeSlotFilter === 'all' ? undefined : timeSlotFilter,
    }
    const queueQuery = {
      scheduledDate: toDateKey(),
      timeSlotId: timeSlotFilter === 'all' ? undefined : timeSlotFilter,
    }

    setScheduleState((previous) => ({ ...previous, status: 'loading', error: '' }))
    setQueueState((previous) => ({ ...previous, status: 'loading', error: '' }))

    const [scheduleResult, queueResult] = await Promise.allSettled([
      getDailySchedule(
        {
          ...scheduleQuery,
          status: statusFilter === 'all' ? undefined : statusFilter,
          scope: resolveScheduleScope(statusFilter, scheduleScope),
        },
        user.accessToken,
      ),
      getCurrentQueue(queueQuery, user.accessToken),
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
  }, [canReadBookingOperations, scheduleScope, selectedDate, statusFilter, timeSlotFilter, user?.accessToken])

  useEffect(() => {
    void loadStaffBookingReads()
  }, [loadStaffBookingReads])

  function handleSlotFormChange(patch) {
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
  }

  function handleSlotEditFormChange(patch) {
    setSlotEditForm((previous) => ({
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
  }

  function handleStartEditSlot(slot) {
    setEditingSlotId(slot.timeSlotId)
    setSlotEditForm({
      label: slot.label ?? '',
      startTime: slot.startTime ?? '08:00',
      endTime: slot.endTime ?? '09:00',
      capacity: String(slot.capacity ?? 1),
    })
    setSlotMutationState({
      status: 'idle',
      target: '',
      message: '',
    })
  }

  function handleCancelEditSlot() {
    setEditingSlotId('')
    setSlotEditForm(initialSlotForm)
  }

  async function handleCreateSlotDefinition(event) {
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
      await refreshBookingOperations()
    } catch (error) {
      setSlotMutationState({
        status: 'error',
        target: 'create',
        message: error?.message || 'Slot definition could not be created.',
      })
    }
  }

  async function handleToggleSlotActive(slot) {
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
        message: '',
      })
      toast({
        type: 'success',
        title: slot.isActive === false ? 'Slot activated' : 'Slot paused',
        message:
          slot.isActive === false
            ? 'Customers can select this slot again.'
            : 'Customers will no longer be able to select this slot.',
      })
      await refreshBookingOperations()
    } catch (error) {
      setSlotMutationState({
        status: 'error',
        target: slot.timeSlotId,
        message: error?.message || 'Slot definition could not be updated.',
      })
      toast({
        type: 'error',
        title: 'Slot update failed',
        message: error?.message || 'Slot definition could not be updated.',
      })
    }
  }

  async function handleSaveSlotDefinition(slot) {
    if (!slot?.timeSlotId || !user?.accessToken || !canReadBookingOperations) {
      setSlotMutationState({
        status: 'error',
        target: slot?.timeSlotId ?? '',
        message: 'Sign in with a service adviser or super admin account before managing slots.',
      })
      return
    }

    const payload = {
      label: slotEditForm.label.trim(),
      startTime: slotEditForm.startTime,
      endTime: slotEditForm.endTime,
      capacity: Number(slotEditForm.capacity),
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
        target: slot.timeSlotId,
        message: 'Add a label, start time, end time, and whole-number capacity before saving this slot.',
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
          ...payload,
        },
        user.accessToken,
      )
      setEditingSlotId('')
      setSlotEditForm(initialSlotForm)
      setSlotMutationState({
        status: 'success',
        target: '',
        message: 'Slot definition updated.',
      })
      await refreshBookingOperations()
    } catch (error) {
      setSlotMutationState({
        status: 'error',
        target: slot.timeSlotId,
        message: error?.message || 'Slot definition could not be saved.',
      })
    }
  }

  async function handleDeleteSlotDefinition(slot) {
    if (!slot?.timeSlotId || !user?.accessToken || !canReadBookingOperations) {
      setSlotMutationState({
        status: 'error',
        target: slot?.timeSlotId ?? '',
        message: 'Sign in with a service adviser or super admin account before deleting slots.',
      })
      return
    }

    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(`Delete ${slot.label}? This archives the slot and preserves historical bookings.`)

    if (!confirmed) return

    setSlotMutationState({
      status: 'submitting',
      target: slot.timeSlotId,
      message: '',
    })

    try {
      await deleteTimeSlotDefinition(slot.timeSlotId, user.accessToken)
      setEditingSlotId('')
      setSlotMutationState({
        status: 'success',
        target: '',
        message: 'Slot archived. Customers will no longer see it in booking choices.',
      })
      await refreshBookingOperations()
    } catch (error) {
      setSlotMutationState({
        status: 'error',
        target: slot.timeSlotId,
        message: error?.message || 'Slot definition could not be deleted.',
      })
    }
  }

  const loadUpcomingScheduleWindow = useCallback(async (activeSelectedDate = selectedDateRef.current) => {
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
            scope: 'active',
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

    const selectedDateSummary = dates.find((date) => date.dateKey === activeSelectedDate)
    const nearestBookedDate = dates.find((date) => date.totalBookings > 0)

    if (
      !hasAutoSelectedUpcomingDate.current &&
      activeSelectedDate === toDateKey() &&
      nearestBookedDate &&
      nearestBookedDate.dateKey !== activeSelectedDate &&
      (selectedDateSummary?.totalBookings ?? 0) === 0
    ) {
      hasAutoSelectedUpcomingDate.current = true
      setSelectedDate(nearestBookedDate.dateKey)
    }
  }, [canReadBookingOperations, user?.accessToken])

  useEffect(() => {
    void loadUpcomingScheduleWindow()
  }, [loadUpcomingScheduleWindow])

  const loadCalendarMonth = useCallback(async (activeMonth = calendarMonth) => {
    if (!user?.accessToken) {
      setCalendarState({
        status: 'unauthorized',
        dates: [],
        error: 'Sign in with a staff session before reading calendar booking visibility.',
      })
      return
    }

    if (!canReadBookingOperations) {
      setCalendarState({
        status: 'forbidden',
        dates: [],
        error: 'Only service advisers and super admins can open the bookings calendar view.',
      })
      return
    }

    const dateKeys = buildMonthDateWindow(activeMonth)
    const sharedQuery = {
      status: statusFilter === 'all' ? undefined : statusFilter,
      scope: resolveScheduleScope(statusFilter, scheduleScope),
      timeSlotId: timeSlotFilter === 'all' ? undefined : timeSlotFilter,
    }

    setCalendarState((previous) => ({
      ...previous,
      status: 'loading',
      error: '',
    }))

    const results = await Promise.allSettled(
      dateKeys.map((dateKey) =>
        getDailySchedule(
          {
            scheduledDate: dateKey,
            ...sharedQuery,
          },
          user.accessToken,
        ),
      ),
    )

    const fulfilledResults = results
      .map((result, index) => {
        if (result.status !== 'fulfilled') {
          return null
        }

        const data = result.value
        const summary = summarizeSchedule(data)

        return {
          dateKey: dateKeys[index],
          totalBookings: summary.totalBookings,
          pendingCount: summary.pendingCount,
          confirmedCount: summary.confirmedCount,
          inServiceCount: summary.inServiceCount,
          rescheduledCount: summary.rescheduledCount,
          bookings: flattenScheduleBookings(data),
        }
      })
      .filter(Boolean)

    if (fulfilledResults.length === 0) {
      const rejectedResult = results.find((result) => result.status === 'rejected')
      setCalendarState({
        status: 'error',
        dates: [],
        error: buildErrorState(rejectedResult?.reason, 'Calendar bookings could not be loaded.').error,
      })
      return
    }

    setCalendarState({
      status: 'success',
      dates: fulfilledResults,
      error: results.some((result) => result.status === 'rejected')
        ? 'Some days could not be loaded for this month. The visible days are still usable.'
        : '',
    })
  }, [calendarMonth, canReadBookingOperations, scheduleScope, statusFilter, timeSlotFilter, user?.accessToken])

  useEffect(() => {
    if (tab !== 'calendar') {
      return
    }

    void loadCalendarMonth(calendarMonth)
  }, [calendarMonth, loadCalendarMonth, tab])

  async function refreshBookingOperations() {
    setActionState((previous) => ({
      ...previous,
      message: '',
    }))

    const refreshTasks = [
      loadSlotDefinitions(),
      loadStaffBookingReads(),
      loadUpcomingScheduleWindow(selectedDateRef.current),
    ]

    if (tab === 'calendar') {
      refreshTasks.push(loadCalendarMonth(calendarMonth))
    }

    await Promise.allSettled(refreshTasks)
  }

  function openJobOrderFromBooking(booking, overrideJobOrderId) {
    const jobOrderId = overrideJobOrderId ?? booking?.jobOrderId

    if (!jobOrderId) {
      return
    }

    const params = new URLSearchParams()
    params.set('jobOrderId', jobOrderId)

    if (booking?.id) {
      params.set('bookingId', booking.id)
    }

    window.location.assign(`/admin/job-orders?${params.toString()}`)
  }

  function handleSelectedDateChange(nextDateKey) {
    const normalizedDate = nextDateKey || toDateKey()
    hasAutoSelectedUpcomingDate.current = true
    setSelectedDate(normalizedDate)
    setCalendarMonth(startOfMonth(toDateFromKey(normalizedDate)))
  }

  async function submitBookingStatusAction(booking, action) {
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
            : action.status === 'in_service'
              ? 'Booking handed off to workshop. It will stay active until the linked job order is finalized.'
            : `Booking moved to ${getStatusMeta(action.status).label.toLowerCase()}.`,
      })

      setPendingAction(null)
      await refreshBookingOperations()
    } catch (error) {
      setActionState({
        status: 'error',
        busyBookingId: '',
        message: error?.message || 'Booking status could not be updated.',
      })
      setPendingAction(null)
    }
  }

  function handleBookingStatusAction(booking, action) {
    if (action?.requiresConfirmation) {
      setPendingAction({ booking, action })
      return
    }

    void submitBookingStatusAction(booking, action)
  }

  function handlePendingActionCancel() {
    if (actionState.status === 'submitting') {
      return
    }

    setPendingAction(null)
  }

  function handlePendingActionConfirm() {
    if (!pendingAction) {
      return
    }

    void submitBookingStatusAction(pendingAction.booking, pendingAction.action)
  }

  const scheduleSummary = useMemo(() => summarizeSchedule(scheduleState.data), [scheduleState.data])
  const bookedScheduleDates = useMemo(
    () => scheduleWindowState.dates.filter((date) => date.totalBookings > 0),
    [scheduleWindowState.dates],
  )
  const calendarBookingsByDate = useMemo(
    () =>
      Object.fromEntries(
        calendarState.dates.map((date) => [date.dateKey, date.bookings ?? []]),
      ),
    [calendarState.dates],
  )
  const queueCount = queueState.data?.currentCount ?? 0
  const hasScheduleData = Boolean(scheduleState.data)
  const hasQueueData = Boolean(queueState.data)
  const scheduleSlots = useMemo(
    () => [...(scheduleState.data?.slots ?? [])].sort(compareSlotsByStartTime),
    [scheduleState.data?.slots],
  )
  const slotDefinitions = useMemo(
    () => [...(slotDefinitionsState.data ?? [])].sort(compareSlotsByStartTime),
    [slotDefinitionsState.data],
  )
  const slotMetaById = useMemo(
    () =>
      new Map(
        mergeSlotOptions(slotDefinitions, timeSlotOptions).map((slot) => [slot.timeSlotId, slot]),
      ),
    [slotDefinitions, timeSlotOptions],
  )
  const scheduleSlotsWithMeta = useMemo(
    () =>
      scheduleSlots.map((slot) => {
        const slotMeta = slotMetaById.get(slot.timeSlotId)

        return {
          ...slot,
          startTime: slot.startTime ?? slotMeta?.startTime,
          endTime: slot.endTime ?? slotMeta?.endTime,
        }
      }),
    [scheduleSlots, slotMetaById],
  )
  const scheduleHasBookings = scheduleSummary.totalBookings > 0
  const isLoadingSchedule = scheduleState.status === 'loading' && !hasScheduleData
  const isLoadingQueue = queueState.status === 'loading' && !hasQueueData
  const isLoadingCalendar = calendarState.status === 'loading' && calendarState.dates.length === 0
  const isRefreshingOperations =
    scheduleState.status === 'loading' || queueState.status === 'loading' || (tab === 'calendar' && calendarState.status === 'loading')

  return (
    <div className="booking-page-shell">
      <section className="booking-page-header">
        <div className="space-y-2">
          <p className="booking-page-kicker">Staff Booking Operations</p>
          <h1 className="booking-page-title">Schedule, Queue &amp; Booking Handling</h1>
          <p className="booking-page-copy">
            Service advisers and super admins can review customer-created bookings, adjust slot operations, and manage
            queue flow from one consistent control surface.
          </p>
        </div>
        <button
          onClick={refreshBookingOperations}
          disabled={isRefreshingOperations}
          className="btn-ghost min-h-11 min-w-[148px] self-start xl:self-auto"
        >
          <RefreshCw size={14} className={isRefreshingOperations ? 'animate-spin' : ''} />
          Refresh
        </button>
      </section>

      <section className="booking-control-strip">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="label">Schedule date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                handleSelectedDateChange(event.target.value || toDateKey())
              }}
              className="input"
            />
          </label>
          <label className="block">
            <span className="label">Schedule status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="select"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="block">
            <span className="label">Schedule view</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: 'active', label: 'Active' },
                { key: 'history', label: 'History' },
              ].map((view) => (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setScheduleScope(view.key)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    scheduleScope === view.key ? 'text-white' : 'text-ink-secondary'
                  }`}
                  style={
                    scheduleScope === view.key
                      ? { background: '#f07c00' }
                      : { background: 'rgba(240,124,0,0.08)' }
                  }
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="label">Slot filter</span>
            <select
              value={timeSlotFilter}
              onChange={(event) => setTimeSlotFilter(event.target.value)}
              className="select"
            >
              <option value="all">All slots</option>
              {timeSlotOptions.map((slot) => (
                <option key={slot.timeSlotId} value={slot.timeSlotId}>
                  {formatTimeSlotWindow(slot) ? `${slot.label} (${formatTimeSlotWindow(slot)})` : slot.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {scheduleScope === 'active' && bookedScheduleDates.length > 0 ? (
        <div
          className="flex flex-col md:flex-row md:items-center gap-3 rounded-lg border px-4 py-2.5"
          style={{ background: 'rgba(240,124,0,0.06)', borderColor: 'rgba(240,124,0,0.25)' }}
        >
          <div className="flex items-center gap-2.5 shrink-0">
            <BellRing size={16} style={{ color: '#f07c00' }} />
            <p className="text-xs font-semibold text-ink-primary">
              Pending customer bookings
              <span className="text-ink-muted font-normal"> — pick a date to review</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 md:ml-auto">
            {bookedScheduleDates.map((date) => {
              const isActive = selectedDate === date.dateKey
              return (
                <button
                  key={date.dateKey}
                  onClick={() => handleSelectedDateChange(date.dateKey)}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    isActive ? 'text-white' : 'hover:brightness-110'
                  }`}
                  style={
                    isActive
                      ? { background: '#f07c00', color: '#fff' }
                      : { background: 'rgba(240,124,0,0.12)', color: '#f07c00' }
                  }
                >
                  {formatDate(date.dateKey)} · {date.totalBookings}
                  {date.pendingCount ? `/${date.pendingCount} pending` : ''}
                </button>
              )
            })}
          </div>
        </div>
      ) : scheduleScope === 'active' && scheduleWindowState.status === 'loading' ? (
        <div className="text-xs text-ink-muted px-1">Scanning the next month for customer-created bookings...</div>
      ) : null}

      <SlotDefinitionsPanel
        slots={slotDefinitions}
        status={slotDefinitionsState.status}
        error={slotDefinitionsState.error}
        form={slotForm}
        editForm={slotEditForm}
        editingSlotId={editingSlotId}
        mutationState={slotMutationState}
        onFormChange={handleSlotFormChange}
        onEditFormChange={handleSlotEditFormChange}
        onCreate={handleCreateSlotDefinition}
        onStartEdit={handleStartEditSlot}
        onCancelEdit={handleCancelEditSlot}
        onSaveEdit={handleSaveSlotDefinition}
        onToggleActive={handleToggleSlotActive}
        onDelete={handleDeleteSlotDefinition}
      />

      <div className="booking-segmented-control">
        {[
          { key: 'schedule', icon: CalendarDays, label: 'Daily Schedule' },
          { key: 'calendar', icon: CalendarDays, label: 'Calendar View' },
          { key: 'queue', icon: ListChecks, label: 'Current Queue' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`booking-tab-button ${tab === item.key ? 'booking-tab-button-active' : ''}`}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'schedule' ? (
        <section className="space-y-5">
          {!hasScheduleData && ['unauthorized', 'forbidden', 'validation-error', 'error'].includes(scheduleState.status) ? (
            <BlockingState state={scheduleState} onRetry={refreshBookingOperations} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryTile
                  icon={CalendarDays}
                  label={scheduleScope === 'history' ? 'History Date' : 'Scheduled Date'}
                  value={formatDate(scheduleState.data?.scheduledDate ?? selectedDate)}
                  sub={
                    statusFilter === 'all'
                      ? `${scheduleScope === 'history' ? 'History' : 'Active'} booking records shown`
                      : `${getStatusMeta(statusFilter).label} filter active`
                  }
                />
                <SummaryTile
                  icon={Users}
                  label="Schedule Bookings"
                  value={scheduleSummary.totalBookings}
                  sub={`${scheduleSummary.pendingPaymentCount} awaiting fee / ${scheduleSummary.pendingCount} pending / ${scheduleSummary.confirmedCount} confirmed / ${scheduleSummary.inServiceCount} workshop`}
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
                  sub={scheduleScope === 'history' ? 'Queue stays active-only even in history view' : 'Queue remains derived, not appointment truth'}
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
                  {scheduleSlotsWithMeta.map((slot) => (
                    <ScheduleSlotCard
                      key={slot.timeSlotId}
                      slot={slot}
                      onStatusAction={handleBookingStatusAction}
                      onOpenJobOrder={openJobOrderFromBooking}
                      busyBookingId={actionState.busyBookingId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : null}

      {tab === 'calendar' ? (
        <BookingsCalendarView
          monthDate={calendarMonth}
          groupedBookingsByDate={calendarBookingsByDate}
          loading={isLoadingCalendar}
          error={calendarState.error}
          scope={scheduleScope}
          selectedDate={selectedDate}
          onSelectDate={handleSelectedDateChange}
          onPreviousMonth={() =>
            setCalendarMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() - 1, 1))
          }
          onNextMonth={() =>
            setCalendarMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + 1, 1))
          }
          onToday={() => handleSelectedDateChange(toDateKey())}
        />
      ) : null}

      {tab === 'queue' ? (
        <section className="space-y-5">
          {!hasQueueData && ['unauthorized', 'forbidden', 'validation-error', 'error'].includes(queueState.status) ? (
            <BlockingState state={queueState} onRetry={refreshBookingOperations} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <SummaryTile
                  icon={ListChecks}
                  label="Current Queue"
                  value={queueCount}
                  sub={`For ${formatDate(queueState.data?.scheduledDate ?? toDateKey())}`}
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
        </section>
      ) : null}

      <BookingActionConfirmModal
        visible={Boolean(pendingAction)}
        title="Confirm booking action"
        message={pendingAction?.action?.confirmMessage ?? ''}
        confirmLabel={pendingAction?.action?.confirmLabel ?? 'Confirm'}
        submitting={actionState.status === 'submitting'}
        onCancel={handlePendingActionCancel}
        onConfirm={handlePendingActionConfirm}
      />
    </div>
  )
}
