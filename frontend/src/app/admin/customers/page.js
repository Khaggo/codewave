'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CarFront, MapPin, RefreshCw, ShieldAlert, UserRound } from 'lucide-react'

import { ApiError, listAdminCustomers } from '@/lib/authClient'
import { useUser } from '@/lib/userContext'

const buildAddressLabel = (address) => {
  if (!address) return 'No address saved'

  return [address.addressLine1, address.addressLine2, address.city, address.province, address.postalCode]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ')
}

const buildVehicleLabel = (vehicle) =>
  [vehicle?.year, vehicle?.make, vehicle?.model]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ') || vehicle?.plateNumber || 'Vehicle details pending'

function CustomerCard({ customer }) {
  const profile = customer.profile ?? {}
  const vehicles = customer.vehicles ?? []
  const address = customer.defaultAddress ?? customer.addresses?.[0] ?? null

  return (
    <article className="card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
              <UserRound size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-ink-primary">{customer.displayName}</h2>
              <p className="truncate text-sm text-ink-secondary">{customer.email}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div className="card-raised p-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Phone</p>
              <p className="mt-1 font-semibold text-ink-primary">{profile.phone || 'Not provided'}</p>
            </div>
            <div className="card-raised p-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Birthday</p>
              <p className="mt-1 font-semibold text-ink-primary">{profile.birthday || 'Not provided'}</p>
            </div>
            <div className="card-raised p-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Vehicles</p>
              <p className="mt-1 font-semibold text-ink-primary">{vehicles.length}</p>
            </div>
          </div>
        </div>
        <span className={`badge ${customer.isActive ? 'badge-green' : 'badge-gray'}`}>
          {customer.isActive ? 'Active customer' : 'Inactive customer'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-primary">
            <MapPin size={16} className="text-brand-orange" />
            Customer Address
          </div>
          <p className="text-sm leading-6 text-ink-secondary">{buildAddressLabel(address)}</p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-primary">
            <CarFront size={16} className="text-brand-orange" />
            Vehicles
          </div>
          {vehicles.length ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-lg border border-surface-border bg-surface-card px-3 py-3">
                  <p className="text-sm font-bold text-ink-primary">{buildVehicleLabel(vehicle)}</p>
                  <p className="mt-1 text-xs text-ink-muted">Plate: {vehicle.plateNumber || 'Not provided'}</p>
                  <p className="mt-1 text-xs text-ink-muted">Color: {vehicle.color || 'Not provided'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No vehicles are attached to this customer yet.</p>
          )}
        </div>
      </div>
    </article>
  )
}

export default function AdminCustomersPage() {
  const user = useUser()
  const canReadCustomers = ['service_adviser', 'super_admin'].includes(user?.role)
  const [state, setState] = useState({ status: 'idle', customers: [], error: '' })
  const [query, setQuery] = useState('')

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

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return state.customers

    return state.customers.filter((customer) =>
      [
        customer.displayName,
        customer.email,
        customer.profile?.phone,
        ...(customer.vehicles ?? []).flatMap((vehicle) => [
          vehicle.plateNumber,
          vehicle.make,
          vehicle.model,
          vehicle.year,
        ]),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [query, state.customers])

  if (!canReadCustomers) {
    return (
      <section className="card p-6">
        <ShieldAlert size={24} className="text-brand-orange" />
        <h1 className="mt-3 text-2xl font-black text-ink-primary">Customer Directory</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">
          Customer and vehicle records are available to service advisers and admins only.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <section className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-brand-orange/10 to-transparent" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">Customer Records</p>
            <h1 className="mt-3 text-3xl font-black text-ink-primary">Customers & Vehicles</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
              Review customer profile details and every vehicle currently attached to each account.
              This is a read-focused demo surface for staff coordination.
            </p>
          </div>
          <button type="button" onClick={loadCustomers} className="btn-primary" disabled={state.status === 'loading'}>
            <RefreshCw size={14} className={state.status === 'loading' ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-ink-primary">{filteredCustomers.length} customer records</p>
            <p className="mt-1 text-xs text-ink-muted">Search by name, email, phone, plate, make, or model.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input md:max-w-sm"
            placeholder="Search customers or vehicles..."
          />
        </div>
      </section>

      {state.status === 'loading' && !state.customers.length ? (
        <div className="card p-8 text-center text-sm text-ink-muted">Loading customer records...</div>
      ) : null}

      {state.error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      {filteredCustomers.length ? (
        <div className="space-y-4">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      ) : state.status !== 'loading' ? (
        <div className="card p-8 text-center">
          <UserRound size={28} className="mx-auto text-ink-muted" />
          <p className="mt-3 text-sm font-bold text-ink-primary">No matching customers</p>
          <p className="mt-2 text-xs text-ink-muted">
            Customer registrations and vehicle onboarding will appear here after they are saved.
          </p>
        </div>
      ) : null}
    </div>
  )
}
