'use client'

import { useEffect, useMemo, useState } from 'react'
import { Archive, FolderPlus, ImagePlus, PackagePlus, PencilLine, Tag, X } from 'lucide-react'
import {
  addCatalogCategory,
  addInventoryProduct,
  archiveInventoryProduct,
  updateInventoryProduct,
} from '@autocare/shared'

import { useToast } from '@/components/Toast.jsx'
import { useCatalogCategories, usePublishedCatalogProducts } from '@/hooks/useOperationsStore.js'

const EMPTY_PRODUCT_FORM = {
  name: '',
  category: '',
  price: '',
  stock: '',
  sku: '',
  description: '',
  images: '',
}

const EMPTY_MODAL_FORM = {
  id: '',
  name: '',
  category: '',
  price: '',
  stock: '',
  sku: '',
  description: '',
  imageInput: '',
  images: [],
}

function formatCurrency(value) {
  return `PHP ${Number(value ?? 0).toLocaleString()}`
}

function parseImageUrls(value) {
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildModalForm(product) {
  return {
    id: product.id,
    name: product.name ?? '',
    category: product.category ?? '',
    price: String(product.price ?? ''),
    stock: String(product.stock ?? ''),
    sku: product.sku ?? '',
    description: product.description ?? '',
    imageInput: '',
    images: [...(product.images ?? [])],
  }
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

                  <div>
                    <label className="label" htmlFor="edit-product-stock">Stock</label>
                    <input
                      id="edit-product-stock"
                      type="number"
                      min="0"
                      className="input"
                      value={form.stock}
                      onChange={(event) => onChange('stock', event.target.value)}
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
                      <div className="rounded-xl border border-dashed border-surface-border bg-surface-card px-4 py-6 text-sm text-ink-muted">
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
  const { toast } = useToast()
  const categories = useCatalogCategories()
  const publishedProducts = usePublishedCatalogProducts()
  const [categoryName, setCategoryName] = useState('')
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM)
  const [editForm, setEditForm] = useState(EMPTY_MODAL_FORM)
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [submittingCategory, setSubmittingCategory] = useState(false)
  const [submittingProduct, setSubmittingProduct] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [archivingProductId, setArchivingProductId] = useState(null)

  const selectedProduct = useMemo(
    () => publishedProducts.find((product) => product.id === selectedProductId) ?? null,
    [publishedProducts, selectedProductId],
  )

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
    setEditForm(buildModalForm(product))
  }

  function closeProductEditor() {
    setSelectedProductId(null)
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
        stock: productForm.stock,
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
        message: `${createdProduct.name} is now live in the catalog.`,
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
    if (!selectedProduct) return

    setSavingProduct(true)

    try {
      const updatedProduct = updateInventoryProduct(selectedProduct.id, {
        name: editForm.name,
        category: editForm.category,
        price: editForm.price,
        stock: editForm.stock,
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
      if (selectedProductId === productId) {
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
      <section className="ops-page-header">
        <div className="space-y-2">
          <p className="ops-page-kicker">Catalog Administration</p>
          <h1 className="ops-page-title">Publish Storefront-Ready Shop Products</h1>
          <p className="ops-page-copy">
            Create categories, publish catalog products, and maintain live storefront entries from one clean admin workspace.
          </p>
        </div>
      </section>

      <section className="ops-summary-grid">
        <SummaryTile label="Categories" value={categories.length} sub="Available for product publishing" icon={FolderPlus} />
        <SummaryTile label="Published Products" value={publishedProducts.length} sub="Live in the customer catalog" icon={PackagePlus} />
        <SummaryTile
          label="Product Images"
          value={publishedProducts.reduce((total, product) => total + product.images.length, 0)}
          sub="Catalog image URLs attached to live products"
          icon={ImagePlus}
        />
        <SummaryTile label="Edit Flow" value="Modal" sub="Click any product to edit fields and images" icon={PencilLine} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.38fr)]">
        <SectionShell
          title="Add Category"
          description="New categories become available in the publish form right away."
        >
          <form className="space-y-4" onSubmit={handleAddCategory}>
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

          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category.id} className="badge badge-gray">
                {category.name}
              </span>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          title="Create And Publish Product"
          description="Required fields match the shared catalog store so published products stay consistent across apps."
        >
          <form className="space-y-4" onSubmit={handlePublishProduct}>
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

              <div>
                <label className="label" htmlFor="catalog-product-stock">Stock</label>
                <input
                  id="catalog-product-stock"
                  type="number"
                  min="0"
                  className="input"
                  value={productForm.stock}
                  onChange={(event) => updateProductForm('stock', event.target.value)}
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
        </SectionShell>
      </div>

      <SectionShell
        title="Published Products"
        description="Click any product row to open the edit modal and manage product details or images."
        action={<span className="badge badge-orange">{publishedProducts.length} live</span>}
      >
        <div className="overflow-hidden rounded-2xl border border-surface-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm" aria-label="Published products">
              <thead>
                <tr className="border-b border-surface-border bg-surface-raised text-left text-xs text-ink-muted">
                  <th className="px-5 py-3.5 font-semibold">Product</th>
                  <th className="px-5 py-3.5 font-semibold">Category</th>
                  <th className="px-5 py-3.5 font-semibold">Price</th>
                  <th className="px-5 py-3.5 font-semibold">Stock</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Images</th>
                  <th className="px-5 py-3.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {publishedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-muted">
                      No published products yet.
                    </td>
                  </tr>
                ) : (
                  publishedProducts.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-surface-hover">
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => openProductEditor(product)}
                        >
                          <p className="font-semibold text-ink-primary">{product.name}</p>
                          <p className="mt-1 text-xs text-ink-muted">{product.sku || 'No SKU assigned'}</p>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-ink-secondary">{product.category}</td>
                      <td className="px-5 py-4 font-semibold text-ink-primary">{formatCurrency(product.price)}</td>
                      <td className="px-5 py-4 font-semibold text-ink-primary">{product.stock}</td>
                      <td className="px-5 py-4">
                        <span className="badge badge-green">{product.status}</span>
                      </td>
                      <td className="px-5 py-4 text-ink-secondary">{product.images.length}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
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

      {selectedProduct ? (
        <ProductEditModal
          categories={categories}
          form={editForm}
          saving={savingProduct}
          archiving={archivingProductId === selectedProduct.id}
          onChange={updateEditForm}
          onAddImage={handleAddImageToEditForm}
          onRemoveImage={handleRemoveImageFromEditForm}
          onClose={closeProductEditor}
          onSave={handleSaveProductEdits}
          onArchive={() => handleArchiveProduct(selectedProduct.id, selectedProduct.name)}
        />
      ) : null}
    </div>
  )
}
