'use client'

import { useState } from 'react'
import { Archive, FolderPlus, ImagePlus, PackagePlus, Tag } from 'lucide-react'
import {
  addCatalogCategory,
  addInventoryProduct,
  archiveInventoryProduct,
} from '@autocare/shared'
import { useToast } from '@/components/Toast.jsx'
import {
  useCatalogCategories,
  usePublishedCatalogProducts,
} from '@/hooks/useOperationsStore.js'

const EMPTY_PRODUCT_FORM = {
  name: '',
  category: '',
  price: '',
  stock: '',
  sku: '',
  description: '',
  images: '',
}

function formatCurrency(value) {
  return `PHP ${Number(value ?? 0).toLocaleString()}`
}

function parseImageUrls(value) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function ShopProductAdmin() {
  const { toast } = useToast()
  const categories = useCatalogCategories()
  const publishedProducts = usePublishedCatalogProducts()
  const [categoryName, setCategoryName] = useState('')
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM)
  const [submittingCategory, setSubmittingCategory] = useState(false)
  const [submittingProduct, setSubmittingProduct] = useState(false)
  const [archivingProductId, setArchivingProductId] = useState(null)

  function updateProductForm(field, value) {
    setProductForm((current) => ({
      ...current,
      [field]: value,
    }))
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

  function handleArchiveProduct(productId, productName) {
    setArchivingProductId(productId)

    try {
      archiveInventoryProduct(productId)
      toast({
        type: 'info',
        title: 'Product archived',
        message: `${productName} has been removed from the published catalog.`,
      })
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
    <div className="space-y-6">
      <section className="card relative overflow-hidden p-6 md:p-7">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-brand-orange/10 to-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">Catalog Admin</p>
            <h1 className="mt-3 text-3xl font-bold text-ink-primary">Publish storefront-ready shop products</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
              Create categories, launch published products immediately, and archive outdated offers without leaving the web admin workspace.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-surface-border bg-surface-raised px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Categories</p>
              <p className="mt-2 text-2xl font-bold text-ink-primary">{categories.length}</p>
            </div>
            <div className="rounded-3xl border border-surface-border bg-surface-raised px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Published Products</p>
              <p className="mt-2 text-2xl font-bold text-ink-primary">{publishedProducts.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.35fr)]">
        <section className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
              <FolderPlus size={18} />
            </div>
            <div>
              <p className="text-lg font-bold text-ink-primary">Add category</p>
              <p className="text-sm text-ink-secondary">New categories become available in the publish form right away.</p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleAddCategory}>
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
              className="btn-primary w-full justify-center"
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
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
              <PackagePlus size={18} />
            </div>
            <div>
              <p className="text-lg font-bold text-ink-primary">Create and publish product</p>
              <p className="text-sm text-ink-secondary">Required fields match the shared catalog store so published products stay consistent across apps.</p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handlePublishProduct}>
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
              className="btn-primary w-full justify-center"
              disabled={submittingProduct}
            >
              <PackagePlus size={15} />
              {submittingProduct ? 'Publishing Product...' : 'Publish Product'}
            </button>
          </form>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div>
            <p className="text-lg font-bold text-ink-primary">Published products</p>
            <p className="mt-1 text-sm text-ink-secondary">Only storefront-ready products stay visible here.</p>
          </div>
          <span className="badge badge-orange">{publishedProducts.length} live</span>
        </div>

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
                  <tr key={product.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-ink-primary">{product.name}</p>
                        <p className="mt-1 text-xs text-ink-muted">{product.sku || 'No SKU assigned'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-ink-secondary">{product.category}</td>
                    <td className="px-5 py-4 font-semibold text-ink-primary">{formatCurrency(product.price)}</td>
                    <td className="px-5 py-4 font-semibold text-ink-primary">{product.stock}</td>
                    <td className="px-5 py-4">
                      <span className="badge badge-green">{product.status}</span>
                    </td>
                    <td className="px-5 py-4 text-ink-secondary">{product.images.length}</td>
                    <td className="px-5 py-4">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
