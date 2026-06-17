'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FolderPlus, RefreshCw, ShieldAlert, Wrench } from 'lucide-react'

import { ApiError } from '@/lib/authClient'
import {
  createBookingService,
  createBookingServiceCategory,
  listBookingServiceCategories,
  listBookingServices,
} from '@/lib/bookingServiceAdminClient'
import { useUser } from '@/lib/userContext'

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
      ? 'border-red-500/25 bg-red-500/10 text-red-300'
      : tone === 'success'
        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
        : 'border-surface-border bg-surface-raised text-ink-muted'

  return (
    <div className={`rounded-xl border px-4 py-3 text-xs ${toneClassName}`}>
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

  const groupedServices = useMemo(() => {
    const categoryMap = new Map(categoriesState.items.map((category) => [category.id, category.name]))
    const groups = new Map()

    servicesState.items.forEach((service) => {
      const groupKey = service.categoryId || 'uncategorized'
      const groupLabel = service.categoryId ? categoryMap.get(service.categoryId) || 'Unknown category' : 'Uncategorized'
      const nextGroup = groups.get(groupKey) ?? { key: groupKey, label: groupLabel, services: [] }
      nextGroup.services.push(service)
      groups.set(groupKey, nextGroup)
    })

    return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label))
  }, [categoriesState.items, servicesState.items])

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
      <section className="card p-6">
        <ShieldAlert size={24} className="text-brand-orange" />
        <h1 className="mt-3 text-2xl font-black text-ink-primary">Booking Services</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">
          Booking service management is available to admin operations staff and super admins only.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <section className="ops-page-header">
        <div className="space-y-2">
          <p className="ops-page-kicker">Service Operations</p>
          <h1 className="ops-page-title">Booking Service Creation</h1>
          <p className="ops-page-copy">
            Create booking service categories and publish service offerings from the live main-service catalog. Category-linked
            fields stay on dropdowns so the service payload always uses valid backend IDs.
          </p>
        </div>
      </section>

      <section className="ops-summary-grid">
        <SummaryTile label="Service Categories" value={categoriesState.items.length} sub="Live booking taxonomy" icon={FolderPlus} />
        <SummaryTile label="Booking Services" value={servicesState.items.length} sub="Selectable in booking discovery" icon={Wrench} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SectionShell
          title="Create Service Category"
          description="Create the category first so service creation can use a real dropdown instead of a typed category id."
          action={
            <button type="button" onClick={loadDirectory} className="ops-action-secondary min-w-[148px]">
              <RefreshCw size={14} />
              Refresh
            </button>
          }
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
          description="Only valid service-category records appear in the dropdown so the backend receives the exact category id it expects."
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
        description="These service offerings come from the live booking catalog in main-service."
      >
        {groupedServices.length ? (
          <div className="space-y-4">
            {groupedServices.map((group) => (
              <div key={group.key} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink-primary">{group.label}</p>
                    <p className="mt-1 text-xs text-ink-muted">{group.services.length} service{group.services.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.services.map((service) => (
                    <article key={service.id} className="rounded-xl border border-surface-border bg-surface-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-ink-primary">{service.name}</p>
                          <p className="mt-1 text-xs text-ink-muted">{service.durationMinutes} minutes</p>
                        </div>
                        <span className={`badge ${service.isActive ? 'badge-green' : 'badge-gray'}`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-ink-secondary">
                        {service.description || 'No description saved yet.'}
                      </p>
                      <p className="mt-3 break-all text-[11px] text-ink-muted">{service.id}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No booking services are available yet.</p>
        )}
      </SectionShell>
    </div>
  )
}
