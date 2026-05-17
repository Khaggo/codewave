'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FolderPlus, RefreshCw, ShieldAlert, Wrench } from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import { ApiError } from '@/lib/authClient'
import {
  createBookingService,
  createBookingServiceCategory,
  listBookingServiceCategories,
  listBookingServices,
} from '@/lib/bookingServiceAdminClient'
import { useUser } from '@/lib/userContext'
import { groupBookingServices } from './bookingServiceAdminView.mjs'

const EMPTY_CATEGORY_FORM = {
  name: '',
  description: '',
}

const EMPTY_SERVICE_FORM = {
  categoryId: '',
  name: '',
  description: '',
  durationMinutes: '45',
  isActive: true,
}

function SummaryTile({ label, value, sub, icon: Icon }) {
  return (
    <div className="card p-5 transition-colors hover:border-[rgba(240,124,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight tabular-nums text-ink-primary">{value}</p>
          {sub ? <p className="mt-1.5 text-[11px] text-ink-muted">{sub}</p> : null}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
          <Icon size={14} />
        </div>
      </div>
    </div>
  )
}

function SectionShell({ title, description, children, action }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-surface-border bg-surface-raised/70 px-5 py-4">
        <div>
          <p className="card-title">{title}</p>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Notice({ tone = 'neutral', message }) {
  if (!message) return null

  const toneClassName =
    tone === 'error'
      ? 'status-message status-message-danger'
      : tone === 'success'
        ? 'status-message status-message-success'
        : 'status-message status-message-warning'

  return (
    <div className={toneClassName}>
      {message}
    </div>
  )
}

export default function BookingServiceAdmin() {
  const user = useUser()
  const canManageServices = ['service_adviser', 'super_admin'].includes(user?.role)
  const [categoriesState, setCategoriesState] = useState({
    status: 'idle',
    items: [],
    message: '',
  })
  const [servicesState, setServicesState] = useState({
    status: 'idle',
    items: [],
    message: '',
  })
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM)
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE_FORM)
  const [categoryAction, setCategoryAction] = useState({ status: 'idle', message: '' })
  const [serviceAction, setServiceAction] = useState({ status: 'idle', message: '' })

  const loadDirectory = useCallback(async () => {
    setCategoriesState((current) => ({ ...current, status: 'loading', message: '' }))
    setServicesState((current) => ({ ...current, status: 'loading', message: '' }))

    const [categoriesResult, servicesResult] = await Promise.allSettled([
      listBookingServiceCategories(),
      listBookingServices(),
    ])

    if (categoriesResult.status === 'fulfilled') {
      setCategoriesState({
        status: 'success',
        items: categoriesResult.value,
        message: categoriesResult.value.length ? '' : 'No booking service categories exist yet.',
      })
    } else {
      setCategoriesState({
        status: 'error',
        items: [],
        message:
          categoriesResult.reason instanceof ApiError
            ? categoriesResult.reason.message
            : 'Booking service categories could not be loaded.',
      })
    }

    if (servicesResult.status === 'fulfilled') {
      setServicesState({
        status: 'success',
        items: servicesResult.value,
        message: servicesResult.value.length ? '' : 'No booking services exist yet.',
      })
    } else {
      setServicesState({
        status: 'error',
        items: [],
        message:
          servicesResult.reason instanceof ApiError
            ? servicesResult.reason.message
            : 'Booking services could not be loaded.',
      })
    }
  }, [])

  useEffect(() => {
    void loadDirectory()
  }, [loadDirectory])

  const groupedServices = useMemo(
    () => groupBookingServices(categoriesState.items, servicesState.items),
    [categoriesState.items, servicesState.items],
  )

  const handleCreateCategory = async (event) => {
    event.preventDefault()
    if (!canManageServices || !user?.accessToken) return

    setCategoryAction({ status: 'submitting', message: '' })
    try {
      await createBookingServiceCategory(
        {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
        },
        user.accessToken,
      )
      setCategoryForm(EMPTY_CATEGORY_FORM)
      setCategoryAction({ status: 'success', message: 'Service category created.' })
      await loadDirectory()
    } catch (error) {
      setCategoryAction({
        status: 'error',
        message: error instanceof ApiError ? error.message : 'Service category could not be created.',
      })
    }
  }

  const handleCreateService = async (event) => {
    event.preventDefault()
    if (!canManageServices || !user?.accessToken) return

    setServiceAction({ status: 'submitting', message: '' })
    try {
      await createBookingService(
        {
          categoryId: serviceForm.categoryId,
          name: serviceForm.name.trim(),
          description: serviceForm.description.trim(),
          durationMinutes: Number(serviceForm.durationMinutes),
          isActive: serviceForm.isActive,
        },
        user.accessToken,
      )
      setServiceForm(EMPTY_SERVICE_FORM)
      setServiceAction({ status: 'success', message: 'Booking service created.' })
      await loadDirectory()
    } catch (error) {
      setServiceAction({
        status: 'error',
        message: error instanceof ApiError ? error.message : 'Booking service could not be created.',
      })
    }
  }

  if (!canManageServices) {
    return (
      <section className="empty-panel text-left">
        <ShieldAlert size={24} className="text-brand-orange" />
        <h1 className="mt-3 text-2xl font-black text-ink-primary">Booking Services</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">
          Booking service management is available to admin operations staff and super admins only.
        </p>
      </section>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Service Operations"
        title="Booking Service Creation"
        description="Create booking categories and publish live booking services."
        actions={
          <button type="button" onClick={loadDirectory} className="btn-ghost min-w-[148px]">
            <RefreshCw size={14} />
            Refresh
          </button>
        }
        meta={
          <>
            <span className="badge badge-gray">{categoriesState.items.length} categories</span>
            <span className="badge badge-gray">{servicesState.items.length} services</span>
          </>
        }
      />

      <section className="ops-summary-grid">
        <SummaryTile label="Service Categories" value={categoriesState.items.length} sub="Live booking taxonomy" icon={FolderPlus} />
        <SummaryTile label="Booking Services" value={servicesState.items.length} sub="Ready for booking discovery" icon={Wrench} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SectionShell
          title="Create Service Category"
          description="Create a category before publishing services."
        >
          <Notice
            tone={categoriesState.status === 'error' ? 'error' : 'neutral'}
            message={categoriesState.message}
          />
          <form onSubmit={handleCreateCategory} className="mt-5 space-y-4">
            <div>
              <label className="label">Category Name</label>
              <input
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                className="input"
                placeholder="Preventive Maintenance"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={categoryForm.description}
                onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="input"
                placeholder="Routine maintenance bundles and recurring upkeep work."
              />
            </div>
            <Notice
              tone={categoryAction.status === 'error' ? 'error' : categoryAction.status === 'success' ? 'success' : 'neutral'}
              message={categoryAction.message}
            />
            <button type="submit" disabled={categoryAction.status === 'submitting'} className="ops-action-primary">
              {categoryAction.status === 'submitting' ? <RefreshCw size={14} className="animate-spin" /> : <FolderPlus size={14} />}
              Create Category
            </button>
          </form>
        </SectionShell>

        <SectionShell
          title="Create Booking Service"
          description="Publish services with valid category records only."
        >
          <Notice
            tone={servicesState.status === 'error' ? 'error' : 'neutral'}
            message={servicesState.message}
          />
          <form onSubmit={handleCreateService} className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Service Name</label>
              <input
                value={serviceForm.name}
                onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
                className="input"
                placeholder="Oil Change"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                value={serviceForm.categoryId}
                onChange={(event) => setServiceForm((current) => ({ ...current, categoryId: event.target.value }))}
                className="select"
              >
                <option value="">Uncategorized</option>
                {categoriesState.items.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={serviceForm.durationMinutes}
                onChange={(event) => setServiceForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                className="input"
                placeholder="45"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary">
                <input
                  type="checkbox"
                  checked={serviceForm.isActive}
                  onChange={(event) => setServiceForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Publish as active
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea
                value={serviceForm.description}
                onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="input"
                placeholder="Replace engine oil and inspect basic consumables."
              />
            </div>
            <div className="md:col-span-2">
              <Notice
                tone={serviceAction.status === 'error' ? 'error' : serviceAction.status === 'success' ? 'success' : 'neutral'}
                message={serviceAction.message}
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={serviceAction.status === 'submitting'} className="ops-action-primary">
                {serviceAction.status === 'submitting' ? <RefreshCw size={14} className="animate-spin" /> : <Wrench size={14} />}
                Create Booking Service
              </button>
            </div>
          </form>
        </SectionShell>
      </div>

      <SectionShell
        title="Live Booking Services"
        description="Review live services from the booking catalog."
      >
        {groupedServices.length ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {groupedServices.map((group) => (
                <span key={group.key} className="badge badge-gray">
                  {group.label}: {group.services.length}
                </span>
              ))}
            </div>
            <div className="table-surface">
              <div className="table-scroll">
                <table className="data-table" aria-label="Live booking services">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Category</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Service ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedServices.flatMap((group) =>
                      group.services.map((service) => (
                        <tr key={service.id}>
                          <td>
                            <p className="font-semibold text-ink-primary">{service.name}</p>
                            <p className="mt-1 text-xs text-ink-muted">
                              {service.description || 'No description saved yet.'}
                            </p>
                          </td>
                          <td>{group.label}</td>
                          <td>{service.durationMinutes} minutes</td>
                          <td>
                            <span className={`badge ${service.isActive ? 'badge-green' : 'badge-gray'}`}>
                              {service.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <span className="break-all text-xs text-ink-muted">{service.id}</span>
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-panel">
            No booking services are available yet.
          </div>
        )}
      </SectionShell>
    </div>
  )
}
