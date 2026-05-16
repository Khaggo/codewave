'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Archive, FolderPlus, ImagePlus, PackagePlus, PencilLine, Tag, X } from 'lucide-react'
import {
  addCatalogCategory,
  addInventoryProduct,
  archiveInventoryProduct,
  updateInventoryProduct,
} from '@autocare/shared'

import { useToast } from '@/components/Toast.jsx'
import PageHeader from '@/components/ui/PageHeader'
import { useCatalogCategories, usePublishedCatalogProducts } from '@/hooks/useOperationsStore.js'
import { buildModalForm, getCatalogImageCount, parseImageUrls } from './shopProductAdminView.mjs'

const EMPTY_PRODUCT_FORM = {
  name: '',
  category: '',
  price: '',
  sku: '',
  description: '',
  images: '',
}

const EMPTY_MODAL_FORM = {
  id: '',
  name: '',
  category: '',
  price: '',
  sku: '',
  description: '',
  imageInput: '',
  images: [],
}

function formatCurrency(value) {
  return `PHP ${Number(value ?? 0).toLocaleString()}`
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
  onAddImage,
  onRemoveImage,
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
        <div className="card max-h-[90vh] w-full max-w-4xl overflow-hidden shadow-card-md">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border bg-surface-raised/70 px-5 py-4">
            <div>
              <p className="card-title">Edit Product</p>
              <p className="mt-1 text-sm text-ink-muted">
                Update product details, maintain image URLs, and archive outdated catalog entries from one editor.
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
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="edit-product-name">Product Name</label>
                    <input
                      id="edit-product-name"
                      className="input"
                      value={form.name}
                      onChange={(event) => onChange('name', event.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-product-category">Category</label>
                    <select
                      id="edit-product-category"
                      className="select"
                      value={form.category}
                      onChange={(event) => onChange('category', event.target.value)}
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-product-price">Price</label>
                    <input
                      id="edit-product-price"
                      type="number"
                      min="0"
                      className="input"
                      value={form.price}
                      onChange={(event) => onChange('price', event.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label" htmlFor="edit-product-sku">SKU</label>
                    <div className="relative">
                      <Tag size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
                      <input
                        id="edit-product-sku"
                        className="input pl-10"
                        value={form.sku}
                        onChange={(event) => onChange('sku', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label" htmlFor="edit-product-description">Description</label>
                    <textarea
                      id="edit-product-description"
                      className="input min-h-32 resize-y"
                      value={form.description}
                      onChange={(event) => onChange('description', event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="card-raised p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">Product Images</p>
                  <p className="mt-2 text-sm text-ink-muted">
                    Add one image URL at a time and remove outdated product images directly from this editor.
                  </p>

                  <div className="mt-4 flex gap-2">
                    <input
                      className="input"
                      value={form.imageInput}
                      onChange={(event) => onChange('imageInput', event.target.value)}
                      placeholder="https://example.test/product-side.jpg"
                    />
                    <button type="button" className="ops-action-secondary min-w-[112px]" onClick={onAddImage}>
                      <ImagePlus size={14} />
                      Add
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {form.images.length ? (
                      form.images.map((image, index) => (
                        <div key={`${image}-${index}`} className="rounded-xl border border-surface-border bg-surface-card p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                                Image {index + 1}
                              </p>
                              <p className="mt-1 break-all text-sm text-ink-primary">{image}</p>
                            </div>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/15"
                              onClick={() => onRemoveImage(index)}
                              aria-label={`Remove image ${index + 1}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-panel px-4 py-6 text-sm text-ink-muted">
                        No product images added yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-raised p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">Actions</p>
                  <div className="mt-4 flex flex-wrap gap-3">
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
          </div>
        </div>
      </div>
    </>
  )
}

export default function ShopProductAdmin() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const categories = useCatalogCategories()
  const publishedProducts = usePublishedCatalogProducts()
  const [catalogQuery, setCatalogQuery] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM)
  const [editForm, setEditForm] = useState(EMPTY_MODAL_FORM)
  const [editorProductId, setEditorProductId] = useState(null)
  const [submittingCategory, setSubmittingCategory] = useState(false)
  const [submittingProduct, setSubmittingProduct] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [archivingProductId, setArchivingProductId] = useState(null)
  const editorProduct = useMemo(
    () => publishedProducts.find((product) => product.id === editorProductId) ?? null,
    [editorProductId, publishedProducts],
  )
  const visibleProducts = useMemo(() => {
    const normalizedQuery = catalogQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return publishedProducts
    }

    return publishedProducts.filter((product) => {
      const searchFields = [product.name, product.category, product.sku, product.description]
      return searchFields.some((field) => field?.toLowerCase().includes(normalizedQuery))
    })
  }, [catalogQuery, publishedProducts])

  useEffect(() => {
    const requestedEditorProductId = searchParams?.get('product')

    if (!requestedEditorProductId) {
      return
    }

    if (publishedProducts.some((product) => product.id === requestedEditorProductId)) {
      setEditorProductId(requestedEditorProductId)
    }
  }, [publishedProducts, searchParams])

  function updateProductForm(field, value) {
    setProductForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateEditForm(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function openProductEditor(product) {
    setSelectedProductId(product.id)
    setEditorProductId(product.id)
    setEditForm(buildModalForm(product))
  }

  function closeProductEditor() {
    setEditorProductId(null)
    setEditForm(EMPTY_MODAL_FORM)
  }

  function handleAddCategory(event) {
    event.preventDefault()
    setSubmittingCategory(true)

    try {
      const category = addCatalogCategory(categoryName)
      setCategoryName('')
      setProductForm((current) => ({
        ...current,
        category: current.category || category.name,
      }))
      toast({
        type: 'success',
        title: 'Category added',
        message: `${category.name} is now available for catalog publishing.`,
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Unable to add category',
        message: error.message,
      })
    } finally {
      setSubmittingCategory(false)
    }
  }

  function handlePublishProduct(event) {
    event.preventDefault()
    setSubmittingProduct(true)

    try {
      const createdProduct = addInventoryProduct({
        name: productForm.name,
        category: productForm.category,
        price: productForm.price,
        stock: 0,
        sku: productForm.sku,
        description: productForm.description,
        images: parseImageUrls(productForm.images),
        status: 'published',
      })

      setProductForm({
        ...EMPTY_PRODUCT_FORM,
        category: productForm.category,
      })

      toast({
        type: 'success',
        title: 'Product published',
        message: `${createdProduct.name} is now live in the catalog. Manage stock from Inventory.`,
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Unable to publish product',
        message: error.message,
      })
    } finally {
      setSubmittingProduct(false)
    }
  }

  function handleAddImageToEditForm() {
    const nextImage = editForm.imageInput.trim()
    if (!nextImage) return

    setEditForm((current) => ({
      ...current,
      imageInput: '',
      images: [...current.images, nextImage],
    }))
  }

  function handleRemoveImageFromEditForm(index) {
    setEditForm((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
    }))
  }

  function handleSaveProductEdits() {
    if (!editorProduct) return

    setSavingProduct(true)

    try {
      const updatedProduct = updateInventoryProduct(editorProduct.id, {
        name: editForm.name,
        category: editForm.category,
        price: editForm.price,
        sku: editForm.sku,
        description: editForm.description,
        images: editForm.images,
      })

      setEditForm(buildModalForm(updatedProduct))
      toast({
        type: 'success',
        title: 'Product updated',
        message: `${updatedProduct.name} was updated successfully.`,
      })
    } catch (error) {
      toast({
        type: 'error',
        title: 'Unable to update product',
        message: error.message,
      })
    } finally {
      setSavingProduct(false)
    }
  }

  function handleArchiveProduct(productId, productName) {
    setArchivingProductId(productId)

    try {
      archiveInventoryProduct(productId)
      toast({
        type: 'info',
        title: 'Product archived',
        message: `${productName} has been removed from the published catalog.`,
      })
      if (editorProductId === productId) {
        closeProductEditor()
      }
    } catch (error) {
      toast({
        type: 'error',
        title: 'Unable to archive product',
        message: error.message,
      })
    } finally {
      setArchivingProductId(null)
    }
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Marketplace publishing"
        title="Catalog Admin"
        description="Publish and manage customer-visible marketplace products."
        meta={
          <>
            <span className="badge badge-gray">{categories.length} categories</span>
            <span className="badge badge-gray">{publishedProducts.length} live products</span>
          </>
        }
      />

      <SectionShell
        title="Published Products"
        description="Search published products, review status, and choose the next listing to manage."
        action={<span className="badge badge-orange">{visibleProducts.length} shown</span>}
      >
        <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div>
            <label className="label" htmlFor="catalog-product-search">Search published products</label>
            <input
              id="catalog-product-search"
              className="input"
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="Search by name, category, SKU, or description"
            />
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-raised/70 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Categories</p>
            <p className="mt-2 text-xl font-black tracking-tight text-ink-primary">{categories.length}</p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-raised/70 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Images</p>
            <p className="mt-2 text-xl font-black tracking-tight text-ink-primary">{getCatalogImageCount(publishedProducts)}</p>
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
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Images</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {publishedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-sm text-ink-muted">
                      No published products yet.
                    </td>
                  </tr>
                ) : visibleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-sm text-ink-muted">
                      No published products match the current search.
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
                      <td>{product.category}</td>
                      <td className="font-semibold text-ink-primary">{formatCurrency(product.price)}</td>
                      <td className="font-semibold text-ink-primary">{product.stock}</td>
                      <td>
                        <span className="badge badge-green">{product.status}</span>
                      </td>
                      <td>{product.images.length}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`/admin/inventory?product=${product.id}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
                          >
                            Manage Stock
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
                            aria-label={`Archive ${product.name}`}
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
        description="Create categories and publish new marketplace listings after reviewing the current catalog."
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.38fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-surface-border bg-surface-raised/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">Add Category</p>
              <p className="mt-2 text-sm text-ink-muted">Create a category for product publishing.</p>

              <form className="mt-4 space-y-4" onSubmit={handleAddCategory}>
                <div>
                  <label className="label" htmlFor="catalog-category-name">New Category Name</label>
                  <input
                    id="catalog-category-name"
                    className="input"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="e.g. Accessories"
                  />
                </div>

                <button
                  type="submit"
                  className="ops-action-primary w-full"
                  disabled={submittingCategory}
                >
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
                      {category.name}
                    </span>
                  ))
                ) : (
                  <div className="empty-panel w-full px-4 py-6 text-sm text-ink-muted">
                    No catalog categories yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-raised/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">Create And Publish Product</p>
            <p className="mt-2 text-sm text-ink-muted">
              Publish products with customer-facing fields only. Set stock later from Inventory.
            </p>

            <form className="mt-4 space-y-4" onSubmit={handlePublishProduct}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label" htmlFor="catalog-product-name">Product Name</label>
                  <input
                    id="catalog-product-name"
                    className="input"
                    value={productForm.name}
                    onChange={(event) => updateProductForm('name', event.target.value)}
                    placeholder="e.g. Seat Cover Deluxe"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="catalog-product-category">Category</label>
                  <select
                    id="catalog-product-category"
                    className="select"
                    value={productForm.category}
                    onChange={(event) => updateProductForm('category', event.target.value)}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="catalog-product-price">Price</label>
                  <input
                    id="catalog-product-price"
                    type="number"
                    min="0"
                    className="input"
                    value={productForm.price}
                    onChange={(event) => updateProductForm('price', event.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label" htmlFor="catalog-product-sku">SKU</label>
                  <div className="relative">
                    <Tag size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
                    <input
                      id="catalog-product-sku"
                      className="input pl-10"
                      value={productForm.sku}
                      onChange={(event) => updateProductForm('sku', event.target.value)}
                      placeholder="Optional internal SKU"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="label" htmlFor="catalog-product-description">Description</label>
                  <textarea
                    id="catalog-product-description"
                    className="input min-h-28 resize-y"
                    value={productForm.description}
                    onChange={(event) => updateProductForm('description', event.target.value)}
                    placeholder="Explain fitment, material, or usage details."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label" htmlFor="catalog-product-images">Image URLs</label>
                  <div className="relative">
                    <ImagePlus size={15} className="pointer-events-none absolute left-3 top-4 text-ink-dim" />
                    <textarea
                      id="catalog-product-images"
                      className="input min-h-28 resize-y pl-10"
                      value={productForm.images}
                      onChange={(event) => updateProductForm('images', event.target.value)}
                      placeholder={'One image URL per line\nhttps://example.test/product-front.jpg'}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="ops-action-primary w-full"
                disabled={submittingProduct}
              >
                <PackagePlus size={15} />
                {submittingProduct ? 'Publishing Product...' : 'Publish Product'}
              </button>
            </form>
          </div>
        </div>
      </SectionShell>

      {editorProduct ? (
        <ProductEditModal
          categories={categories}
          form={editForm}
          saving={savingProduct}
          archiving={archivingProductId === editorProduct.id}
          onChange={updateEditForm}
          onAddImage={handleAddImageToEditForm}
          onRemoveImage={handleRemoveImageFromEditForm}
          onClose={closeProductEditor}
          onSave={handleSaveProductEdits}
          onArchive={() => handleArchiveProduct(editorProduct.id, editorProduct.name)}
        />
      ) : null}
    </div>
  )
}
