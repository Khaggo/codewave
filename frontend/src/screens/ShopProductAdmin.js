'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Archive, FolderPlus, PencilLine, Plus, RefreshCcw, Tag, X } from 'lucide-react'

import { useToast } from '@/components/Toast.jsx'
import PageHeader from '@/components/ui/PageHeader'
import { ApiError } from '@/lib/authClient'
import {
  createStaffInventoryCategory,
  createStaffInventoryProduct,
  loadStaffInventorySnapshot,
  updateStaffInventoryProduct,
} from '@/lib/inventoryAdminClient'
import { useUser } from '@/lib/userContext'

const EMPTY_PRODUCT_FORM = {
  name: '',
  categoryId: '',
  price: '',
  sku: '',
  description: '',
}

const EMPTY_MODAL_FORM = {
  id: '',
  name: '',
  categoryId: '',
  price: '',
  sku: '',
  description: '',
  isActive: true,
}

const createInitialState = () => ({
  status: 'idle',
  products: [],
  categories: [],
  errors: { products: '', categories: '' },
})

function formatCurrencyFromCents(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: value % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0) / 100)
}

function buildModalForm(product) {
  return {
    id: product.id,
    name: product.name ?? '',
    categoryId: product.categoryId ?? '',
    price: String((product.priceCents ?? 0) / 100),
    sku: product.sku ?? '',
    description: product.description ?? '',
    isActive: product.visibilityLabel === 'Published',
  }
}

function normalizeCatalogSku(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()
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

function ProductEditModal({
  categories,
  form,
  saving,
  archiving,
  onChange,
  onClose,
  onSave,
  onArchive,
}) {
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="card max-h-[90vh] w-full max-w-3xl overflow-hidden shadow-card-md">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border bg-surface-raised/70 px-5 py-4">
            <div>
              <p className="card-title">Edit Product</p>
              <p className="mt-1 text-sm text-ink-muted">
                Update live catalog metadata backed by the ecommerce service.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-card text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink-primary"
              aria-label="Close product editor"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[calc(90vh-76px)] overflow-y-auto p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="label">Product Name</span>
                <input className="input" value={form.name} onChange={(event) => onChange('name', event.target.value)} />
              </label>

              <label>
                <span className="label">Category</span>
                <select className="select" value={form.categoryId} onChange={(event) => onChange('categoryId', event.target.value)}>
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="label">Price</span>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.price}
                  onChange={(event) => onChange('price', event.target.value)}
                />
              </label>

              <label className="md:col-span-2">
                <span className="label">SKU (required)</span>
                <div className="relative">
                  <Tag size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
                  <input
                    className="input pl-10"
                    value={form.sku}
                    onChange={(event) => onChange('sku', event.target.value)}
                    placeholder="UPPERCASE-SKU"
                  />
                </div>
                <p className="mt-2 text-xs text-ink-muted">Use uppercase letters, numbers, and hyphens only.</p>
              </label>

              <label className="md:col-span-2">
                <span className="label">Description</span>
                <textarea
                  className="input min-h-32 resize-y"
                  value={form.description}
                  onChange={(event) => onChange('description', event.target.value)}
                />
              </label>

              <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-card px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(form.isActive)}
                  onChange={(event) => onChange('isActive', event.target.checked)}
                />
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Published in customer catalog</p>
                  <p className="text-sm text-ink-secondary">Turn this off to hide the product without deleting it.</p>
                </div>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" disabled={saving} className="ops-action-primary min-w-[144px]" onClick={onSave}>
                <PencilLine size={14} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" disabled={archiving} className="ops-action-danger min-w-[144px]" onClick={onArchive}>
                <Archive size={14} />
                {archiving ? 'Archiving...' : 'Archive Product'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ShopProductAdmin() {
  const searchParams = useSearchParams()
  const user = useUser()
  const { toast } = useToast()
  const [state, setState] = useState(createInitialState)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM)
  const [editForm, setEditForm] = useState(EMPTY_MODAL_FORM)
  const [editorProductId, setEditorProductId] = useState(null)
  const [submittingCategory, setSubmittingCategory] = useState(false)
  const [submittingProduct, setSubmittingProduct] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [archivingProductId, setArchivingProductId] = useState(null)

  const loadSnapshot = useCallback(async () => {
    if (!user?.accessToken) {
      setState({
        status: 'error',
        products: [],
        categories: [],
        errors: { products: 'Sign in as staff before loading catalog admin.', categories: '' },
      })
      return
    }

    setState((current) => ({ ...current, status: 'loading' }))

    try {
      const snapshot = await loadStaffInventorySnapshot({ accessToken: user.accessToken })
      setState({
        status: 'ready',
        products: snapshot.products,
        categories: snapshot.categories,
        errors: snapshot.errors,
      })
    } catch (error) {
      setState({
        status: 'error',
        products: [],
        categories: [],
        errors: {
          products: error instanceof Error ? error.message : 'Unable to load the live catalog admin surface.',
          categories: '',
        },
      })
    }
  }, [user?.accessToken])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  const categories = state.categories
  const products = state.products
  const editorProduct = useMemo(
    () => products.find((product) => product.id === editorProductId) ?? null,
    [editorProductId, products],
  )

  const visibleProducts = useMemo(() => {
    const normalizedQuery = catalogQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return products
    }

    return products.filter((product) => {
      const searchFields = [product.name, product.categoryLabel, product.sku, product.description]
      return searchFields.some((field) => String(field ?? '').toLowerCase().includes(normalizedQuery))
    })
  }, [catalogQuery, products])

  useEffect(() => {
    const requestedEditorProductId = searchParams?.get('product')
    if (!requestedEditorProductId) {
      return
    }
    if (products.some((product) => product.id === requestedEditorProductId)) {
      const product = products.find((entry) => entry.id === requestedEditorProductId)
      setEditorProductId(requestedEditorProductId)
      setEditForm(buildModalForm(product))
    }
  }, [products, searchParams])

  function updateProductForm(field, value) {
    setProductForm((current) => ({
      ...current,
      [field]: field === 'sku' ? normalizeCatalogSku(value) : value,
    }))
  }

  function updateEditForm(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: field === 'sku' ? normalizeCatalogSku(value) : value,
    }))
  }

  function openProductEditor(product) {
    setEditorProductId(product.id)
    setEditForm(buildModalForm(product))
  }

  function closeProductEditor() {
    setEditorProductId(null)
    setEditForm(EMPTY_MODAL_FORM)
  }

  async function handleAddCategory(event) {
    event.preventDefault()
    setSubmittingCategory(true)

    try {
      const category = await createStaffInventoryCategory({
        accessToken: user?.accessToken,
        name: categoryName,
      })
      setCategoryName('')
      setProductForm((current) => ({ ...current, categoryId: current.categoryId || category.id }))
      await loadSnapshot()
      toast({
        type: 'success',
        title: 'Category added',
        message: `${category.label} is now available for live catalog publishing.`,
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Unable to add category',
        message: error instanceof Error ? error.message : 'Unable to add category right now.',
      })
    } finally {
      setSubmittingCategory(false)
    }
  }

  async function handlePublishProduct(event) {
    event.preventDefault()
    const normalizedSku = normalizeCatalogSku(productForm.sku)

    if (!normalizedSku) {
      toast({
        type: 'error',
        title: 'SKU required',
        message: 'Catalog products need a SKU before they can be published.',
      })
      return
    }

    setSubmittingProduct(true)

    try {
      const createdProduct = await createStaffInventoryProduct({
        accessToken: user?.accessToken,
        categoryId: productForm.categoryId,
        name: productForm.name,
        sku: normalizedSku,
        description: productForm.description,
        pricePhp: productForm.price,
      })

      setProductForm((current) => ({
        ...EMPTY_PRODUCT_FORM,
        categoryId: current.categoryId,
      }))
      await loadSnapshot()
      toast({
        type: 'success',
        title: 'Product published',
        message: `${createdProduct.name} is now live in the ecommerce catalog.`,
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Unable to publish product',
        message: error instanceof Error ? error.message : 'Unable to publish the product right now.',
      })
    } finally {
      setSubmittingProduct(false)
    }
  }

  async function handleSaveProductEdits() {
    if (!editorProduct) return
    const normalizedSku = normalizeCatalogSku(editForm.sku)

    if (!normalizedSku) {
      toast({
        type: 'error',
        title: 'SKU required',
        message: 'Catalog products need a SKU before they can stay published or active.',
      })
      return
    }

    setSavingProduct(true)
    try {
      const updatedProduct = await updateStaffInventoryProduct({
        accessToken: user?.accessToken,
        productId: editorProduct.id,
        categoryId: editForm.categoryId,
        name: editForm.name,
        sku: normalizedSku,
        description: editForm.description,
        pricePhp: editForm.price,
        isActive: editForm.isActive,
      })

      setEditForm(buildModalForm(updatedProduct))
      await loadSnapshot()
      toast({
        type: 'success',
        title: 'Product updated',
        message: `${updatedProduct.name} was updated successfully.`,
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Unable to update product',
        message: error instanceof Error ? error.message : 'Unable to update the product right now.',
      })
    } finally {
      setSavingProduct(false)
    }
  }

  async function handleArchiveProduct(productId, productName) {
    setArchivingProductId(productId)

    try {
      await updateStaffInventoryProduct({
        accessToken: user?.accessToken,
        productId,
        isActive: false,
      })
      await loadSnapshot()
      toast({
        type: 'info',
        title: 'Product archived',
        message: `${productName} has been hidden from the live customer catalog.`,
      })
      if (editorProductId === productId) {
        closeProductEditor()
      }
    } catch (error) {
      toast({
        type: 'error',
        title: 'Unable to archive product',
        message: error instanceof Error ? error.message : 'Unable to archive the product right now.',
      })
    } finally {
      setArchivingProductId(null)
    }
  }

  const loadingAction = (
    <button type="button" className="btn-ghost" onClick={() => void loadSnapshot()} disabled={state.status === 'loading'}>
      <RefreshCcw size={14} className={state.status === 'loading' ? 'animate-spin' : ''} />
      Refresh
    </button>
  )

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Marketplace publishing"
        title="Catalog Admin"
        description="Manage live ecommerce categories and product listings from the actual ecommerce runtime."
        actions={loadingAction}
        meta={
          <>
            <span className="badge badge-gray">{categories.length} categories</span>
            <span className="badge badge-gray">{products.length} live products</span>
          </>
        }
      />

      {state.errors.products ? (
        <div className="status-message status-message-warning">
          <p className="font-bold text-ink-primary">Catalog runtime warning</p>
          <p className="mt-1 text-sm text-ink-secondary">{state.errors.products}</p>
        </div>
      ) : null}

      <SectionShell
        title="Published Products"
        description="Search live catalog products, review visibility, and open a listing for editing."
        action={<span className="badge badge-orange">{visibleProducts.length} shown</span>}
      >
        <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label className="label" htmlFor="catalog-product-search">Search live products</label>
            <input
              id="catalog-product-search"
              className="input"
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="Search by name, category, SKU, or description"
            />
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-raised/70 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Visible rows</p>
            <p className="mt-2 text-xl font-black tracking-tight text-ink-primary">{visibleProducts.length}</p>
          </div>
        </div>

        <div className="table-surface">
          <div className="table-scroll">
            <table className="data-table w-full min-w-[860px]" aria-label="Published products">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Visibility</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-ink-muted">
                      No live products are available yet.
                    </td>
                  </tr>
                ) : visibleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-ink-muted">
                      No live products match the current search.
                    </td>
                  </tr>
                ) : (
                  visibleProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="text-left">
                          <p className="font-semibold text-ink-primary">{product.name}</p>
                          <p className="mt-1 text-xs text-ink-muted">{product.sku || 'No SKU assigned'}</p>
                        </div>
                      </td>
                      <td>{product.categoryLabel}</td>
                      <td className="font-semibold text-ink-primary">{formatCurrencyFromCents(product.priceCents)}</td>
                      <td>
                        <span className={`badge ${product.visibilityLabel === 'Published' ? 'badge-green' : 'badge-gray'}`}>
                          {product.visibilityLabel}
                        </span>
                      </td>
                      <td className="text-sm text-ink-secondary">{new Date(product.updatedAt).toLocaleString('en-PH')}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`/admin/inventory?product=${product.id}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
                          >
                            View Inventory
                          </a>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
                            onClick={() => openProductEditor(product)}
                          >
                            <PencilLine size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/15"
                            onClick={() => handleArchiveProduct(product.id, product.name)}
                            disabled={archivingProductId === product.id}
                          >
                            <Archive size={14} />
                            {archivingProductId === product.id ? 'Archiving...' : 'Archive'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SectionShell>

      <SectionShell
        title="Publishing Controls"
        description="Create categories and publish new live marketplace listings."
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.38fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-surface-border bg-surface-raised/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">Add Category</p>
              <form className="mt-4 space-y-4" onSubmit={handleAddCategory}>
                <label>
                  <span className="label">New Category Name</span>
                  <input
                    className="input"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="e.g. Accessories"
                  />
                </label>
                <button type="submit" className="ops-action-primary w-full" disabled={submittingCategory}>
                  <FolderPlus size={15} />
                  {submittingCategory ? 'Adding Category...' : 'Add Category'}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">Active Categories</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.length ? (
                  categories.map((category) => (
                    <span key={category.id} className="badge badge-gray">
                      {category.label}
                    </span>
                  ))
                ) : (
                  <div className="empty-panel w-full px-4 py-6 text-sm text-ink-muted">
                    No live catalog categories yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-raised/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">Create And Publish Product</p>
            <p className="mt-2 text-sm text-ink-muted">
              Publish supported product fields directly through the live ecommerce service.
            </p>

            <form className="mt-4 space-y-4" onSubmit={handlePublishProduct}>
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="label">Product Name</span>
                  <input
                    className="input"
                    value={productForm.name}
                    onChange={(event) => updateProductForm('name', event.target.value)}
                    placeholder="e.g. Seat Cover Deluxe"
                  />
                </label>

                <label>
                  <span className="label">Category</span>
                  <select
                    className="select"
                    value={productForm.categoryId}
                    onChange={(event) => updateProductForm('categoryId', event.target.value)}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="label">Price</span>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={productForm.price}
                    onChange={(event) => updateProductForm('price', event.target.value)}
                    placeholder="0"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="label">SKU (required)</span>
                  <div className="relative">
                    <Tag size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
                    <input
                      className="input pl-10"
                      value={productForm.sku}
                      onChange={(event) => updateProductForm('sku', event.target.value)}
                      placeholder="UPPERCASE-SKU"
                    />
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">Use uppercase letters, numbers, and hyphens only.</p>
                </label>

                <label className="md:col-span-2">
                  <span className="label">Description</span>
                  <textarea
                    className="input min-h-28 resize-y"
                    value={productForm.description}
                    onChange={(event) => updateProductForm('description', event.target.value)}
                    placeholder="Explain fitment, material, or usage details."
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-4 text-sm text-ink-secondary">
                Product images are not part of the live ecommerce product contract yet, so this admin screen only edits fields the backend currently stores.
              </div>

              <button type="submit" className="ops-action-primary w-full" disabled={submittingProduct}>
                <Plus size={15} />
                {submittingProduct ? 'Publishing Product...' : 'Publish Product'}
              </button>
            </form>
          </div>
        </div>
      </SectionShell>

      {editorProductId ? (
        <ProductEditModal
          categories={categories}
          form={editForm}
          saving={savingProduct}
          archiving={archivingProductId === editorProductId}
          onChange={updateEditForm}
          onClose={closeProductEditor}
          onSave={handleSaveProductEdits}
          onArchive={() => handleArchiveProduct(editorProductId, editorProduct?.name ?? 'This product')}
        />
      ) : null}
    </div>
  )
}
