'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CarFront,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import PortalLink from '@/components/PortalLink'
import { ApiError, listAdminCustomers, updateAdminCustomerStatus } from '@/lib/authClient'
import { useUser } from '@/lib/userContext'

import {
  buildAddressLabel,
  buildVehicleDirectorySummary,
  buildVehicleLabel,
  filterCustomers,
  summarizeCustomers,
} from './customerDirectoryView.mjs'

function MetricCard({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-primary">{value}</p>
      <p className="mt-1 text-xs text-ink-secondary">{hint}</p>
    </div>
  )
}

function RowActionMenu({ customer, isUpdating, onToggleStatus }) {
  return (
    <details className="relative" onClick={(event) => event.stopPropagation()}>
      <summary className="btn-ghost min-h-9 w-9 cursor-pointer list-none justify-center px-0">
        <MoreHorizontal size={14} />
      </summary>
      <div className="absolute right-0 z-20 mt-2 min-w-[176px] rounded-2xl border border-surface-border bg-surface-card p-2 shadow-2xl">
        <button
          type="button"
          onClick={() => onToggleStatus(customer)}
          disabled={isUpdating}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-ink-primary hover:bg-surface-raised disabled:opacity-60"
        >
          <RefreshCw size={13} className={isUpdating ? 'animate-spin' : ''} />
          {customer.isActive ? 'Deactivate account' : 'Activate account'}
        </button>
      </div>
    </details>
  )
}

export default function AdminCustomersPage() {
  const user = useUser()
  const canReadCustomers = ['service_adviser', 'super_admin'].includes(user?.role)
  const [state, setState] = useState({ status: 'idle', customers: [], error: '' })
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [actionState, setActionState] = useState({ status: 'idle', customerId: '', message: '' })

  const loadCustomers = useCallback(async () => {
    if (!user?.accessToken || !canReadCustomers) return

    setState((current) => ({ ...current, status: 'loading', error: '' }))
    try {
      const customers = await listAdminCustomers(user.accessToken)
      setState({ status: 'success', customers, error: '' })
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error:
          error instanceof ApiError
            ? error.message
            : 'Unable to load customer records right now.',
      }))
    }
  }, [canReadCustomers, user?.accessToken])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  const handleToggleStatus = useCallback(async (customer) => {
    if (!user?.accessToken) {
      return
    }

    setActionState({
      status: 'loading',
      customerId: customer.id,
      message: '',
    })

    try {
      const updatedCustomer = await updateAdminCustomerStatus(
        customer.id,
        {
          isActive: !customer.isActive,
          reason: customer.isActive
            ? 'Deactivated from customer administration.'
            : 'Reactivated from customer administration.',
        },
        user.accessToken,
      )

      setState((current) => ({
        ...current,
        customers: current.customers.map((entry) => (entry.id === updatedCustomer.id ? updatedCustomer : entry)),
      }))
      setActionState({
        status: 'success',
        customerId: updatedCustomer.id,
        message: `${updatedCustomer.displayName} is now ${updatedCustomer.isActive ? 'active' : 'inactive'}.`,
      })
    } catch (error) {
      setActionState({
        status: 'error',
        customerId: customer.id,
        message:
          error instanceof ApiError
            ? error.message
            : 'Unable to update this customer account right now.',
      })
    }
  }, [user?.accessToken])

  const filteredCustomers = useMemo(
    () =>
      filterCustomers(state.customers, {
        query,
        statusFilter,
        vehicleFilter,
      }),
    [query, state.customers, statusFilter, vehicleFilter],
  )
  const summary = useMemo(() => summarizeCustomers(state.customers), [state.customers])
  const selectedCustomer = useMemo(
    () => filteredCustomers.find((customer) => customer.id === selectedCustomerId) ?? filteredCustomers[0] ?? null,
    [filteredCustomers, selectedCustomerId],
  )

  useEffect(() => {
    if (!filteredCustomers.length) {
      setSelectedCustomerId('')
      return
    }

    setSelectedCustomerId((current) => {
      if (current && filteredCustomers.some((customer) => customer.id === current)) {
        return current
      }

      return filteredCustomers[0]?.id ?? ''
    })
  }, [filteredCustomers])

  if (!canReadCustomers) {
    return (
      <div className="ops-page-shell">
        <PageHeader
          eyebrow="Customer Records"
          title="Customers & Vehicles"
          description="Customer and vehicle records are available to service advisers and admins only."
        />
        <div className="empty-panel">
          <ShieldAlert size={28} className="mx-auto text-brand-orange" />
          <p className="mt-3 text-sm font-semibold text-ink-primary">Access is limited for this workspace</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Use an authorized service adviser or admin account to review customer profiles, vehicles, and account access.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Customer Records"
        title="Customers & Vehicles"
        description="Review customer profiles, confirm vehicle ownership details, and manage whether each customer account can still sign in."
        actions={(
          <button type="button" onClick={loadCustomers} className="btn-primary" disabled={state.status === 'loading'}>
            <RefreshCw size={14} className={state.status === 'loading' ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
        meta={(
          <>
            <span className="badge badge-gray">{filteredCustomers.length} visible</span>
            <span className="badge badge-orange">{summary.total} total records</span>
          </>
        )}
      />

      <section className="ops-summary-grid">
        <MetricCard label="Total customers" value={summary.total} hint="All customer accounts in the directory" />
        <MetricCard label="Active accounts" value={summary.activeCount} hint="Accounts that can currently sign in" />
        <MetricCard label="Inactive accounts" value={summary.inactiveCount} hint="Accounts currently blocked from sign-in" />
        <MetricCard label="With vehicles" value={summary.withVehiclesCount} hint="Customers that already have vehicle records" />
      </section>

      <section className="toolbar-surface">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Filter the directory</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Search by customer name, email, phone, plate number, make, model, or year.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:min-w-[760px]">
            <label>
              <span className="label">Account status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="select">
                <option value="all">All accounts</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>
            <label>
              <span className="label">Vehicle state</span>
              <select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} className="select">
                <option value="all">All vehicle states</option>
                <option value="with_vehicles">With vehicles</option>
                <option value="without_vehicles">Without vehicles</option>
              </select>
            </label>
            <label>
              <span className="label">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input"
                placeholder="Search customers or vehicles"
              />
            </label>
          </div>
        </div>
      </section>

      {state.error ? <div className="status-message status-message-danger">{state.error}</div> : null}

      {actionState.message ? (
        <div
          className={
            actionState.status === 'success'
              ? 'status-message status-message-success'
              : actionState.status === 'error'
                ? 'status-message status-message-danger'
                : 'status-message status-message-warning'
          }
        >
          {actionState.message}
        </div>
      ) : null}

      {state.status === 'loading' && !state.customers.length ? (
        <div className="empty-panel">
          <p className="text-sm font-semibold text-ink-primary">Loading customer records</p>
          <p className="mt-2 text-sm text-ink-secondary">The latest customer profiles and vehicle links will appear here once the directory finishes syncing.</p>
        </div>
      ) : null}

      {filteredCustomers.length ? (
        <div className="table-surface">
          <div className="border-b border-surface-border px-5 py-4">
            <p className="card-title">Customer directory</p>
            <p className="mt-1 text-sm leading-6 text-ink-secondary">
              Account access, contact details, saved address, and vehicle records stay together in one searchable operations view.
            </p>
          </div>
          <div className="table-scroll">
            <table className="data-table min-w-[960px]">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Vehicles</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const profile = customer.profile ?? {}
                  const vehicles = customer.vehicles ?? []
                  const address = customer.defaultAddress ?? customer.addresses?.[0] ?? null
                  const vehicleSummary = buildVehicleDirectorySummary(vehicles)
                  const isUpdating =
                    actionState.status === 'loading' && actionState.customerId === customer.id
                  const isSelected = selectedCustomer?.id === customer.id

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={isSelected ? 'bg-brand-orange/5' : ''}
                    >
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className="flex w-full items-start gap-3 text-left"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                            <UserRound size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink-primary">{customer.displayName}</p>
                            <p className="mt-0.5 truncate text-xs text-ink-secondary">{customer.email}</p>
                          </div>
                          <ChevronRight size={14} className="ml-auto mt-1 shrink-0 text-ink-muted" />
                        </button>
                      </td>
                      <td className="text-xs text-ink-secondary">
                        <p>{profile.phone || 'No phone'}</p>
                        <p className="mt-0.5 text-ink-muted">
                          Birthday: {profile.birthday || 'No birthday'}
                        </p>
                      </td>
                      <td>
                        <div className="max-w-[220px]">
                          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
                            <MapPin size={13} className="text-brand-orange" />
                            Primary address
                          </div>
                          <p className="text-xs leading-5 text-ink-secondary">{buildAddressLabel(address)}</p>
                        </div>
                      </td>
                      <td>
                        <div className="max-w-[220px] rounded-xl border border-surface-border bg-surface-raised/70 px-3 py-2.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary">
                            <CarFront size={13} className="text-brand-orange" />
                            <span>{vehicleSummary.primary}</span>
                          </div>
                          {vehicleSummary.secondary ? (
                            <p className="mt-1 text-[11px] text-ink-muted">{vehicleSummary.secondary}</p>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${customer.isActive ? 'badge-green' : 'badge-gray'}`}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerId(customer.id)}
                            className="btn-ghost min-h-9 px-3 text-xs"
                          >
                            Review
                          </button>
                          <RowActionMenu
                            customer={customer}
                            isUpdating={isUpdating}
                            onToggleStatus={handleToggleStatus}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : state.status !== 'loading' ? (
        <div className="empty-panel">
          <UserRound size={28} className="mx-auto text-ink-muted" />
          <p className="mt-3 text-sm font-semibold text-ink-primary">No matching customer records</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Adjust the filters or search terms to find a different customer, or wait for new registrations and vehicle onboarding to appear.
          </p>
        </div>
      ) : null}

      {selectedCustomer ? (
        <section className="ops-panel">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="card-title">Selected Customer</p>
              <p className="mt-1 text-sm leading-6 text-ink-secondary">
                Review the customer record first, then use secondary actions only when account access really needs to change.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PortalLink href="/vehicles" className="btn-ghost">
                <CarFront size={14} />
                Open Vehicle View
              </PortalLink>
              <span className={`badge ${selectedCustomer.isActive ? 'badge-green' : 'badge-gray'}`}>
                {selectedCustomer.isActive ? 'Account Active' : 'Account Inactive'}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Customer</p>
                <p className="mt-2 text-sm font-semibold text-ink-primary">{selectedCustomer.displayName}</p>
                <p className="mt-1 text-xs text-ink-secondary">{selectedCustomer.email}</p>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Contact</p>
                <p className="mt-2 text-sm font-semibold text-ink-primary">{selectedCustomer.profile?.phone || 'No phone'}</p>
                <p className="mt-1 text-xs text-ink-secondary">Birthday: {selectedCustomer.profile?.birthday || 'No birthday'}</p>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3 md:col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Primary Address</p>
                <p className="mt-2 text-sm text-ink-primary">{buildAddressLabel(selectedCustomer.defaultAddress ?? selectedCustomer.addresses?.[0] ?? null)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface-card p-4">
              <p className="text-sm font-bold text-ink-primary">Linked Vehicles</p>
              <p className="mt-1 text-xs text-ink-muted">
                Vehicle details stay flatter here so service staff can scan the directory quickly.
              </p>
              <div className="mt-3 grid gap-2">
                {(selectedCustomer.vehicles ?? []).length ? (
                  selectedCustomer.vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="rounded-xl border border-surface-border bg-surface-raised px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">{buildVehicleLabel(vehicle)}</p>
                          <p className="mt-1 text-xs text-ink-secondary">
                            {vehicle.plateNumber ? `Plate ${vehicle.plateNumber}` : 'No plate'}
                            {vehicle.color ? ` • ${vehicle.color}` : ''}
                          </p>
                        </div>
                        <span className={`badge ${vehicle.isActive ? 'badge-green' : 'badge-gray'}`}>
                          {vehicle.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-surface-border bg-surface-raised px-4 py-4 text-sm text-ink-secondary">
                    No vehicle linked yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
