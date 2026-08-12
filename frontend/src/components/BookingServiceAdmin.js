'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, FolderPlus, PencilLine, RefreshCw, ShieldAlert, Wrench } from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import { ApiError } from '@/lib/authClient'
import {
  createBookingService,
  createBookingServiceCategory,
  listBookingServiceCategories,
  listBookingServices,
  updateBookingService,
  updateBookingServiceCategory,
} from '@/lib/bookingServiceAdminClient'
import { useUser } from '@/lib/userContext'
import {
  createDefaultBookingServiceListQuery,
  getBookingServiceListPresentation,
  getBookingServicePager,
  groupBookingServices,
} from './bookingServiceAdminView.mjs'

const EMPTY_CATEGORY_FORM = {
  name: '',
  description: '',
}

const EMPTY_SERVICE_FORM = {
  categoryId: '',
  name: '',
  description: '',
  basePricePhp: '0',
  durationMinutes: '45',
  isActive: true,
}

const EMPTY_CATEGORY_EDIT_FORM = {
  id: '',
  name: '',
  description: '',
  isActive: true,
}

const EMPTY_SERVICE_EDIT_FORM = {
  id: '',
  categoryId: '',
  name: '',
  description: '',
  basePricePhp: '0',
  durationMinutes: '45',
  isActive: true,
}

function buildServiceReference(service) {
  const compactName = String(service?.name ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12) || 'SERVICE'

  return `SVC-${compactName}-${String(service?.durationMinutes ?? 0).padStart(3, '0')}`
}

function formatServiceCurrency(priceCents) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format((Number(priceCents) || 0) / 100)
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
    <section className="card min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-surface-border bg-surface-raised/70 px-5 py-4">
        <div className="min-w-0">
          <p className="card-title">{title}</p>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        {action}
      </div>
      <div className="min-w-0 p-5">{children}</div>
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
    pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
    message: '',
  })
  const [serviceListQuery, setServiceListQuery] = useState(createDefaultBookingServiceListQuery)
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM)
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE_FORM)
  const [categoryEditForm, setCategoryEditForm] = useState(EMPTY_CATEGORY_EDIT_FORM)
  const [serviceEditForm, setServiceEditForm] = useState(EMPTY_SERVICE_EDIT_FORM)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [categoryAction, setCategoryAction] = useState({ status: 'idle', message: '' })
  const [serviceAction, setServiceAction] = useState({ status: 'idle', message: '' })

  const loadDirectory = useCallback(async () => {
    if (!user?.accessToken) return
    setCategoriesState((current) => ({ ...current, status: 'loading', message: '' }))
    setServicesState((current) => ({ ...current, status: 'loading', message: '' }))

    const [categoriesResult, servicesResult] = await Promise.allSettled([
      listBookingServiceCategories(),
      listBookingServices({ accessToken: user.accessToken, ...serviceListQuery }),
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
        items: servicesResult.value.items,
        pagination: {
          page: servicesResult.value.page,
          limit: servicesResult.value.limit,
          total: servicesResult.value.total,
          totalPages: servicesResult.value.totalPages,
        },
        message: servicesResult.value.items.length ? '' : 'No booking services match the current filters.',
      })
    } else {
      setServicesState({
        status: 'error',
        items: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
        message:
          servicesResult.reason instanceof ApiError
            ? servicesResult.reason.message
            : 'Booking services could not be loaded.',
      })
    }
  }, [serviceListQuery, user?.accessToken])

  useEffect(() => {
    void loadDirectory()
  }, [loadDirectory])

  const groupedServices = useMemo(
    () => groupBookingServices(categoriesState.items, servicesState.items),
    [categoriesState.items, servicesState.items],
  )
  const serviceListPresentation = useMemo(
    () => getBookingServiceListPresentation({
      requestStatus: servicesState.status,
      itemCount: servicesState.items.length,
      query: serviceListQuery,
    }),
    [serviceListQuery, servicesState.items.length, servicesState.status],
  )
  const servicePager = useMemo(
    () => getBookingServicePager({
      page: servicesState.pagination.page,
      totalPages: servicesState.pagination.totalPages,
      requestStatus: servicesState.status,
    }),
    [servicesState.pagination.page, servicesState.pagination.totalPages, servicesState.status],
  )
  const selectedCategory = useMemo(
    () => categoriesState.items.find((category) => category.id === selectedCategoryId) ?? null,
    [categoriesState.items, selectedCategoryId],
  )
  const selectedService = useMemo(
    () => servicesState.items.find((service) => service.id === selectedServiceId) ?? null,
    [servicesState.items, selectedServiceId],
  )

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryEditForm(EMPTY_CATEGORY_EDIT_FORM)
      return
    }

    setCategoryEditForm({
      id: selectedCategory.id,
      name: selectedCategory.name ?? '',
      description: selectedCategory.description ?? '',
      isActive: Boolean(selectedCategory.isActive),
    })
  }, [selectedCategory])

  useEffect(() => {
    if (!selectedService) {
      setServiceEditForm(EMPTY_SERVICE_EDIT_FORM)
      return
    }

    setServiceEditForm({
      id: selectedService.id,
      categoryId: selectedService.categoryId ?? '',
      name: selectedService.name ?? '',
      description: selectedService.description ?? '',
      basePricePhp: String(((selectedService.basePriceCents ?? 0) / 100).toFixed(2)).replace(/\.00$/, ''),
      durationMinutes: String(selectedService.durationMinutes ?? 45),
      isActive: Boolean(selectedService.isActive),
    })
  }, [selectedService])

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
          basePricePhp: serviceForm.basePricePhp,
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

  const handleUpdateCategory = async () => {
    if (!canManageServices || !user?.accessToken || !selectedCategory) return

    setCategoryAction({ status: 'submitting', message: '' })
    try {
      await updateBookingServiceCategory(
        {
          categoryId: selectedCategory.id,
          name: categoryEditForm.name.trim(),
          description: categoryEditForm.description.trim(),
          isActive: categoryEditForm.isActive,
        },
        user.accessToken,
      )
      setCategoryAction({ status: 'success', message: 'Service category updated.' })
      await loadDirectory()
    } catch (error) {
      setCategoryAction({
        status: 'error',
        message: error instanceof ApiError ? error.message : 'Service category could not be updated.',
      })
    }
  }

  const handleToggleCategoryStatus = async (category) => {
    if (!canManageServices || !user?.accessToken) return

    setCategoryAction({ status: 'submitting', message: '' })
    try {
      await updateBookingServiceCategory(
        {
          categoryId: category.id,
          isActive: !category.isActive,
        },
        user.accessToken,
      )
      setCategoryAction({
        status: 'success',
        message: !category.isActive ? 'Service category activated.' : 'Service category deactivated.',
      })
      await loadDirectory()
    } catch (error) {
      setCategoryAction({
        status: 'error',
        message: error instanceof ApiError ? error.message : 'Service category visibility could not be updated.',
      })
    }
  }

  const handleUpdateService = async () => {
    if (!canManageServices || !user?.accessToken || !selectedService) return

    setServiceAction({ status: 'submitting', message: '' })
    try {
      await updateBookingService(
        {
          serviceId: selectedService.id,
          categoryId: serviceEditForm.categoryId,
          name: serviceEditForm.name.trim(),
          description: serviceEditForm.description.trim(),
          basePricePhp: serviceEditForm.basePricePhp,
          durationMinutes: Number(serviceEditForm.durationMinutes),
          isActive: serviceEditForm.isActive,
        },
        user.accessToken,
      )
      setServiceAction({ status: 'success', message: 'Booking service updated.' })
      await loadDirectory()
    } catch (error) {
      setServiceAction({
        status: 'error',
        message: error instanceof ApiError ? error.message : 'Booking service could not be updated.',
      })
    }
  }

  const handleToggleServiceStatus = async (service) => {
    if (!canManageServices || !user?.accessToken) return

    setServiceAction({ status: 'submitting', message: '' })
    try {
      await updateBookingService(
        {
          serviceId: service.id,
          isActive: !service.isActive,
        },
        user.accessToken,
      )
      setServiceAction({
        status: 'success',
        message: !service.isActive ? 'Booking service activated.' : 'Booking service deactivated.',
      })
      await loadDirectory()
    } catch (error) {
      setServiceAction({
        status: 'error',
        message: error instanceof ApiError ? error.message : 'Booking service visibility could not be updated.',
      })
    }
  }

  const resetServiceListFilters = () => {
    setSelectedServiceId('')
    setServiceListQuery(createDefaultBookingServiceListQuery())
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
            <span className="badge badge-gray">{servicesState.pagination.total} services</span>
          </>
        }
      />

      <section className="ops-summary-grid">
        <SummaryTile label="Service Categories" value={categoriesState.items.length} sub="Live booking taxonomy" icon={FolderPlus} />
        <SummaryTile label="Booking Services" value={servicesState.pagination.total} sub="Staff catalog records" icon={Wrench} />
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
              <label className="label">Base Price (PHP)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={serviceForm.basePricePhp}
                onChange={(event) => setServiceForm((current) => ({ ...current, basePricePhp: event.target.value }))}
                className="input"
                placeholder="850"
              />
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SectionShell
          title="Service Category Directory"
          description="Review live categories, then edit or deactivate them without recreating records."
        >
          <Notice
            tone={categoryAction.status === 'error' ? 'error' : categoryAction.status === 'success' ? 'success' : 'neutral'}
            message={categoryAction.message}
          />
          {categoriesState.items.length ? (
            <div className="space-y-4">
              <div className="table-surface">
                <div className="table-scroll">
                  <table className="data-table" aria-label="Booking service categories">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoriesState.items.map((category) => (
                        <tr key={category.id}>
                          <td>
                            <p className="font-semibold text-ink-primary">{category.name}</p>
                            <p className="mt-1 text-xs text-ink-muted">
                              {category.description || 'No description saved yet.'}
                            </p>
                          </td>
                          <td>
                            <span className={`badge ${category.isActive ? 'badge-green' : 'badge-gray'}`}>
                              {category.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
                                onClick={() => setSelectedCategoryId(category.id)}
                              >
                                <PencilLine size={14} />
                                Edit
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
                                onClick={() => void handleToggleCategoryStatus(category)}
                              >
                                <Archive size={14} />
                                {category.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedCategory ? (
                <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                  <p className="text-sm font-semibold text-ink-primary">Edit category</p>
                  <div className="mt-3 grid gap-3">
                    <label>
                      <span className="label">Category Name</span>
                      <input
                        className="input"
                        value={categoryEditForm.name}
                        onChange={(event) => setCategoryEditForm((current) => ({ ...current, name: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span className="label">Description</span>
                      <textarea
                        className="input min-h-[96px]"
                        value={categoryEditForm.description}
                        onChange={(event) => setCategoryEditForm((current) => ({ ...current, description: event.target.value }))}
                      />
                    </label>
                    <label className="inline-flex items-center gap-3 text-sm text-ink-secondary">
                      <input
                        type="checkbox"
                        checked={categoryEditForm.isActive}
                        onChange={(event) => setCategoryEditForm((current) => ({ ...current, isActive: event.target.checked }))}
                      />
                      Category is active
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleUpdateCategory()} className="btn-primary">
                        Save Category
                      </button>
                      <button type="button" onClick={() => setSelectedCategoryId('')} className="btn-ghost">
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-panel">
              No booking service categories are available yet.
            </div>
          )}
        </SectionShell>

        <SectionShell
          title="Live Booking Services"
          description="Search every service state, then edit, activate, or deactivate without exposing raw UUIDs."
        >
          <Notice
            tone={serviceAction.status === 'error' ? 'error' : serviceAction.status === 'success' ? 'success' : 'neutral'}
            message={serviceAction.message}
          />
          {serviceListPresentation.showStableList ? (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_220px]">
                <label>
                  <span className="label">Search services</span>
                  <input
                    className="input"
                    value={serviceListQuery.search}
                    placeholder="Name or description"
                    disabled={servicesState.status === 'loading'}
                    onChange={(event) => setServiceListQuery((current) => ({ ...current, search: event.target.value, page: 1 }))}
                  />
                </label>
                <label>
                  <span className="label">Publication</span>
                  <select
                    className="select"
                    value={serviceListQuery.status}
                    disabled={servicesState.status === 'loading'}
                    onChange={(event) => setServiceListQuery((current) => ({ ...current, status: event.target.value, page: 1 }))}
                  >
                    <option value="all">All states</option>
                    <option value="active">Active / published</option>
                    <option value="inactive">Inactive / draft</option>
                  </select>
                </label>
                <label>
                  <span className="label">Category</span>
                  <select
                    className="select"
                    value={serviceListQuery.categoryId}
                    disabled={servicesState.status === 'loading'}
                    onChange={(event) => setServiceListQuery((current) => ({ ...current, categoryId: event.target.value, page: 1 }))}
                  >
                    <option value="">All categories</option>
                    {categoriesState.items.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-xs text-ink-muted">
                {servicesState.pagination.total} {servicesState.pagination.total === 1 ? 'result' : 'results'}
              </p>
              {servicesState.status === 'loading' && !groupedServices.length ? (
                <div className="empty-panel" role="status">Loading booking services…</div>
              ) : groupedServices.length ? (
                <>
                  <div className="flex flex-wrap gap-2">
                {groupedServices.map((group) => (
                  <span key={group.key} className="badge badge-gray">
                    {group.label}: {group.services.length}
                  </span>
                ))}
                  </div>
                  <div className="table-surface min-w-0 max-w-full">
                    <div className="table-scroll min-w-0 max-w-full">
                      <table className="data-table w-full min-w-[860px] table-fixed" aria-label="Live booking services">
                    <colgroup>
                      <col className="w-[28%]" />
                      <col className="w-[14%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[10%]" />
                      <col className="w-[10%]" />
                      <col className="w-[14%]" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Category</th>
                        <th>Duration</th>
                        <th>Base Price</th>
                        <th>Status</th>
                        <th>Service Code</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedServices.flatMap((group) =>
                        group.services.map((service) => (
                          <tr key={service.id}>
                            <td className="max-w-0 break-words">
                              <p className="font-semibold text-ink-primary">{service.name}</p>
                              <p className="mt-1 break-words text-xs text-ink-muted">
                                {service.description || 'No description saved yet.'}
                              </p>
                            </td>
                            <td className="max-w-0 break-words">{group.label}</td>
                            <td className="whitespace-nowrap">{service.durationMinutes} minutes</td>
                            <td className="whitespace-nowrap font-semibold text-ink-primary">{formatServiceCurrency(service.basePriceCents ?? 0)}</td>
                            <td className="whitespace-nowrap">
                              <span className={`badge ${service.isActive ? 'badge-green' : 'badge-gray'}`}>
                                {service.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="max-w-0">
                              <span className="block break-all text-xs font-semibold text-ink-secondary">
                                {buildServiceReference(service)}
                              </span>
                            </td>
                            <td className="min-w-0">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
                                  onClick={() => setSelectedServiceId(service.id)}
                                >
                                  <PencilLine size={14} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
                                  onClick={() => void handleToggleServiceStatus(service)}
                                >
                                  <Archive size={14} />
                                  {service.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )),
                      )}
                    </tbody>
                      </table>
                    </div>
                  </div>

                  {selectedService ? (
                <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                  <p className="text-sm font-semibold text-ink-primary">Edit booking service</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label>
                      <span className="label">Service Name</span>
                      <input
                        className="input"
                        value={serviceEditForm.name}
                        onChange={(event) => setServiceEditForm((current) => ({ ...current, name: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span className="label">Category</span>
                      <select
                        className="select"
                        value={serviceEditForm.categoryId}
                        onChange={(event) => setServiceEditForm((current) => ({ ...current, categoryId: event.target.value }))}
                      >
                        <option value="">Uncategorized</option>
                        {categoriesState.items.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="label">Base Price (PHP)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={serviceEditForm.basePricePhp}
                        onChange={(event) => setServiceEditForm((current) => ({ ...current, basePricePhp: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span className="label">Duration (Minutes)</span>
                      <input
                        type="number"
                        min="1"
                        className="input"
                        value={serviceEditForm.durationMinutes}
                        onChange={(event) => setServiceEditForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                      />
                    </label>
                    <label className="inline-flex items-center gap-3 pt-7 text-sm text-ink-secondary">
                      <input
                        type="checkbox"
                        checked={serviceEditForm.isActive}
                        onChange={(event) => setServiceEditForm((current) => ({ ...current, isActive: event.target.checked }))}
                      />
                      Service is active
                    </label>
                    <label className="md:col-span-2">
                      <span className="label">Description</span>
                      <textarea
                        className="input min-h-[96px]"
                        value={serviceEditForm.description}
                        onChange={(event) => setServiceEditForm((current) => ({ ...current, description: event.target.value }))}
                      />
                    </label>
                    <div className="md:col-span-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleUpdateService()} className="btn-primary">
                        Save Service
                      </button>
                      <button type="button" onClick={() => setSelectedServiceId('')} className="btn-ghost">
                        Done
                      </button>
                    </div>
                  </div>
                </div>
                  ) : null}
                </>
              ) : serviceListPresentation.isFilteredEmpty ? (
                <div className="empty-panel" role="status">
                  <p>No services match the current filters.</p>
                  <button type="button" className="btn-ghost mt-4" onClick={resetServiceListFilters}>
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="empty-panel">
                  No booking services are available yet. Create the first service using the form above.
                </div>
              )}
              <div className="flex flex-col gap-3 border-t border-surface-border pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Booking service pagination">
                <p className="text-xs text-ink-muted">Page {servicePager.page} of {servicePager.totalPages}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={servicePager.previousDisabled}
                    onClick={() => setServiceListQuery((current) => ({ ...current, page: servicePager.page - 1 }))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={servicePager.nextDisabled}
                    onClick={() => setServiceListQuery((current) => ({ ...current, page: servicePager.page + 1 }))}
                  >
                    Next
                  </button>
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
    </div>
  )
}
