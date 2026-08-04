'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, RefreshCw, ShieldCheck, Upload } from 'lucide-react'

import {
  createAccessoryCategory,
  createAccessoryFitment,
  createAccessoryProduct,
  createAccessoryVariant,
  getAccessoryAdminProduct,
  listAccessoryAdminCategories,
  listAccessoryAdminProducts,
  publishAccessoryProduct,
  reviewAccessoryLighting,
  updateAccessoryVariant,
  uploadAccessoryMedia,
} from '@/lib/accessories/accessoriesAdminClient'
import { normalizeAccessoryAdminCategories, normalizeAccessoryAdminProductDetail } from '@/lib/accessories/accessoriesAdminModel.mjs'
import { createAccessoryAdminMutationCoordinator } from '@/lib/accessories/accessoriesAdminMutationCoordinator.mjs'
import { useUser } from '@/lib/userContext'
import { AccessoriesHeader, AccessoriesNotice, AccessoriesState, StatusBadge } from './AccessoriesWorkspaceChrome'

const emptyProduct = { categoryId: '', slug: '', name: '', description: '', isLighting: false }
const emptyVariant = { sku: '', name: '', pricePhp: '', attributes: '' }
const emptyFitment = { variantId: '', status: 'unverified', make: '', model: '', yearFrom: '', yearTo: '', note: '' }

export default function AccessoryCatalogWorkspace() {
  const user = useUser()
  const [state, setState] = useState({ status: 'loading', categories: [], products: [], currentCursor: null, nextCursor: null, cursorStack: [], error: '' })
  const [selected, setSelected] = useState(null)
  const [productForm, setProductForm] = useState(emptyProduct)
  const [categoryForm, setCategoryForm] = useState({ slug: '', name: '', description: '' })
  const [variantForm, setVariantForm] = useState(emptyVariant)
  const [fitmentForm, setFitmentForm] = useState(emptyFitment)
  const [action, setAction] = useState({ busy: '', error: '', message: '' })
  const mutationCoordinatorRef = useRef(null)
  if (!mutationCoordinatorRef.current) {
    mutationCoordinatorRef.current = createAccessoryAdminMutationCoordinator()
  }

  const load = useCallback(async ({ cursor = null, cursorStack = [] } = {}) => {
    if (!user?.accessToken || user.role !== 'super_admin') return
    setState((current) => ({ ...current, status: 'loading', error: '' }))
    try {
      const [categories, page] = await Promise.all([
        listAccessoryAdminCategories({ accessToken: user.accessToken }),
        listAccessoryAdminProducts({ accessToken: user.accessToken, cursor, limit: 25 }),
      ])
      const safeCategories = normalizeAccessoryAdminCategories(categories)
      setState({ status: 'ready', categories: safeCategories, products: page.items ?? [], currentCursor: cursor, nextCursor: page.nextCursor ?? null, cursorStack, error: '' })
      setProductForm((current) => ({ ...current, categoryId: current.categoryId || safeCategories[0]?.id || '' }))
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error: error.message }))
    }
  }, [user?.accessToken, user?.role])

  useEffect(() => { void load() }, [load])

  if (user?.role !== 'super_admin') return <AccessoriesState status="error" title="Super-admin access required" message="Catalog, pricing, fitment, publication, and lighting review are restricted." />
  if (state.status === 'loading') return <AccessoriesState status="loading" title="Loading accessory catalog" message="Retrieving the first bounded catalog page." />
  if (state.status === 'error') return <AccessoriesState status="error" title="Catalog unavailable" message={state.error} onRetry={() => void load()} />

  const run = async (key, work, success, after) => {
    const token = mutationCoordinatorRef.current.begin(key)
    if (!token) return
    setAction({ busy: key, error: '', message: '' })
    try {
      const result = await work()
      await after?.(result)
      setAction({ busy: '', error: '', message: success })
    } catch (error) {
      if (error?.status === 409) {
        await Promise.allSettled([
          load({ cursor: state.currentCursor, cursorStack: state.cursorStack }),
          selected?.product?.slug ? refreshSelected() : Promise.resolve(),
        ])
        setAction({ busy: '', error: 'This catalog record changed in another session. Current data has been reloaded; review it before trying again.', message: '' })
      } else {
        setAction({ busy: '', error: error.message, message: '' })
      }
    } finally {
      mutationCoordinatorRef.current.finish(token)
    }
  }
  const openProduct = async (product) => run('detail', () => getAccessoryAdminProduct({ accessToken: user.accessToken, slug: product.slug }), '', (rawDetail) => { const detail = normalizeAccessoryAdminProductDetail(rawDetail); if (!detail) throw new Error('The product detail response is incomplete.'); setSelected(detail); setVariantForm(emptyVariant); setFitmentForm(emptyFitment) })
  const refreshSelected = async () => {
    if (!selected?.product?.slug) return
    const detail = normalizeAccessoryAdminProductDetail(await getAccessoryAdminProduct({ accessToken: user.accessToken, slug: selected.product.slug }))
    if (!detail) throw new Error('The product detail response is incomplete.')
    setSelected(detail)
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 lg:p-6">
      <AccessoriesHeader title="Accessory Catalog" description="Publish vehicle accessories only after price, fitment, media, and required lighting review are ready." actions={<button type="button" className="btn-ghost min-h-11" disabled={Boolean(action.busy)} onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>} />
      {action.error ? <AccessoriesNotice tone="error">{action.error}</AccessoriesNotice> : null}
      {action.message ? <AccessoriesNotice tone="success">{action.message}</AccessoriesNotice> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
        <section className="min-w-0 border-y border-surface-border">
          <div className="flex items-center justify-between px-3 py-3"><div><h2 className="font-semibold text-ink-primary">Products</h2><p className="text-xs text-ink-secondary">Up to 25 records per page</p></div><StatusBadge value={`${state.products.length} loaded`} /></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-surface-border bg-surface-raised text-xs uppercase text-ink-secondary"><tr><th className="px-3 py-3">Product</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Action</th></tr></thead>
              <tbody>{state.products.map((row) => <tr key={row.product.id} className="border-b border-surface-border"><td className="px-3 py-3"><p className="font-semibold text-ink-primary">{row.product.name}</p><p className="text-xs text-ink-secondary">{row.product.slug}</p></td><td className="px-3 py-3 text-ink-secondary">{row.category.name}</td><td className="px-3 py-3 text-ink-secondary">{row.product.isLighting ? 'Lighting' : 'Accessory'}</td><td className="px-3 py-3"><StatusBadge value={row.product.status} /></td><td className="px-3 py-3 text-right"><button type="button" className="btn-ghost min-h-11" disabled={Boolean(action.busy)} onClick={() => void openProduct(row.product)}>Manage</button></td></tr>)}</tbody>
            </table>
          </div>
          {!state.products.length ? <AccessoriesState status="empty" title="No products yet" message="Create the first category and product from the setup panel." /> : null}
        </section>

        <aside className="space-y-5">
          <form className="space-y-3 border-y border-surface-border py-4" onSubmit={(event) => { event.preventDefault(); void run('category', () => createAccessoryCategory({ accessToken: user.accessToken, payload: categoryForm }), 'Category created.', async () => { setCategoryForm({ slug: '', name: '', description: '' }); await load() }) }}>
            <h2 className="font-semibold text-ink-primary">New category</h2>
            <input className="input-field" aria-label="Category name" placeholder="Category name" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} required />
            <input className="input-field" aria-label="Category slug" placeholder="category-slug" value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} required />
            <textarea className="input-field min-h-20" aria-label="Category description" placeholder="Description" value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
            <button className="btn-primary min-h-11" disabled={Boolean(action.busy)}><Plus size={15} /> Create category</button>
          </form>

          <form className="space-y-3 border-y border-surface-border py-4" onSubmit={(event) => { event.preventDefault(); void run('product', () => createAccessoryProduct({ accessToken: user.accessToken, payload: productForm }), 'Product draft created.', async () => { setProductForm({ ...emptyProduct, categoryId: state.categories[0]?.id || '' }); await load() }) }}>
            <h2 className="font-semibold text-ink-primary">New product draft</h2>
            <select className="input-field" aria-label="Product category" value={productForm.categoryId} onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))} required><option value="">Select category</option>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
            <input className="input-field" aria-label="Product name" placeholder="Product name" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} required />
            <input className="input-field" aria-label="Product slug" placeholder="product-slug" value={productForm.slug} onChange={(event) => setProductForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} required />
            <textarea className="input-field min-h-20" aria-label="Product description" placeholder="Customer-visible description" value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
            <label className="flex min-h-11 items-center gap-3 text-sm text-ink-secondary"><input type="checkbox" checked={productForm.isLighting} onChange={(event) => setProductForm((current) => ({ ...current, isLighting: event.target.checked }))} /> Lighting product</label>
            <button className="btn-primary min-h-11" disabled={Boolean(action.busy)}><Plus size={15} /> Create draft</button>
          </form>
        </aside>
      </div>

      <nav className="flex justify-end gap-2" aria-label="Accessory catalog pages">
        <button type="button" className="btn-ghost min-h-11" disabled={Boolean(action.busy) || !state.cursorStack.length} onClick={() => { const previous = state.cursorStack.at(-1) ?? null; void load({ cursor: previous, cursorStack: state.cursorStack.slice(0, -1) }) }}>Previous</button>
        <button type="button" className="btn-ghost min-h-11" disabled={Boolean(action.busy) || !state.nextCursor} onClick={() => void load({ cursor: state.nextCursor, cursorStack: [...state.cursorStack, state.currentCursor] })}>Next</button>
      </nav>

      {selected ? <section className="space-y-4 border-y border-surface-border py-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink-primary">{selected.product.name}</h2><p className="text-sm text-ink-secondary">Variants, price, fitment, media, and publication</p></div><StatusBadge value={selected.product.status} /></div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3"><h3 className="font-semibold text-ink-primary">Variants</h3>{selected.variants.map((row) => <form key={row.variant.id} className="grid gap-2 border-b border-surface-border pb-3 sm:grid-cols-[1fr_140px_auto]" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(`variant-${row.variant.id}`, () => updateAccessoryVariant({ accessToken: user.accessToken, variantId: row.variant.id, version: row.variant.version, payload: { name: data.get('name'), priceCents: Math.round(Number(data.get('pricePhp')) * 100), attributes: row.variant.attributes, isActive: row.variant.isActive } }), 'Variant updated.', refreshSelected) }}><input name="name" className="input-field" aria-label={`${row.variant.sku} name`} defaultValue={row.variant.name} /><input name="pricePhp" className="input-field" aria-label={`${row.variant.sku} price in pesos`} type="number" min="0" step="0.01" defaultValue={(row.variant.priceCents / 100).toFixed(2)} /><button className="btn-ghost min-h-11" disabled={Boolean(action.busy)}>Save</button></form>)}
            <form className="grid gap-2 border-t border-surface-border pt-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void run('variant-new', () => createAccessoryVariant({ accessToken: user.accessToken, payload: { productId: selected.product.id, sku: variantForm.sku, name: variantForm.name, priceCents: Math.round(Number(variantForm.pricePhp) * 100), attributes: {} } }), 'Variant created.', async () => { setVariantForm(emptyVariant); await refreshSelected() }) }}><input className="input-field" aria-label="Variant SKU" placeholder="SKU" value={variantForm.sku} onChange={(event) => setVariantForm((current) => ({ ...current, sku: event.target.value.toUpperCase() }))} required /><input className="input-field" aria-label="Variant name" placeholder="Variant name" value={variantForm.name} onChange={(event) => setVariantForm((current) => ({ ...current, name: event.target.value }))} required /><input className="input-field" aria-label="Variant price in pesos" type="number" min="0" step="0.01" placeholder="Price in PHP" value={variantForm.pricePhp} onChange={(event) => setVariantForm((current) => ({ ...current, pricePhp: event.target.value }))} required /><button className="btn-primary min-h-11" disabled={Boolean(action.busy)}><Plus size={15} /> Add variant</button></form>
          </div>
          <div className="space-y-4">
            <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void run('fitment', () => createAccessoryFitment({ accessToken: user.accessToken, payload: { variantId: fitmentForm.variantId, status: fitmentForm.status, make: fitmentForm.make || undefined, model: fitmentForm.model || undefined, yearFrom: fitmentForm.yearFrom ? Number(fitmentForm.yearFrom) : undefined, yearTo: fitmentForm.yearTo ? Number(fitmentForm.yearTo) : undefined, note: fitmentForm.note || undefined } }), 'Fitment rule recorded.', () => setFitmentForm(emptyFitment)) }}><h3 className="font-semibold text-ink-primary">Fitment rule</h3><select className="input-field" aria-label="Fitment variant" value={fitmentForm.variantId} onChange={(event) => setFitmentForm((current) => ({ ...current, variantId: event.target.value }))} required><option value="">Select variant</option>{selected.variants.map((row) => <option key={row.variant.id} value={row.variant.id}>{row.variant.name}</option>)}</select><select className="input-field" aria-label="Fitment status" value={fitmentForm.status} onChange={(event) => setFitmentForm((current) => ({ ...current, status: event.target.value }))}>{['universal', 'compatible', 'incompatible', 'unverified'].map((value) => <option key={value}>{value}</option>)}</select><div className="grid grid-cols-2 gap-2"><input className="input-field" aria-label="Vehicle make" placeholder="Make" value={fitmentForm.make} onChange={(event) => setFitmentForm((current) => ({ ...current, make: event.target.value }))} /><input className="input-field" aria-label="Vehicle model" placeholder="Model" value={fitmentForm.model} onChange={(event) => setFitmentForm((current) => ({ ...current, model: event.target.value }))} /><input className="input-field" aria-label="Year from" placeholder="Year from" type="number" value={fitmentForm.yearFrom} onChange={(event) => setFitmentForm((current) => ({ ...current, yearFrom: event.target.value }))} /><input className="input-field" aria-label="Year to" placeholder="Year to" type="number" value={fitmentForm.yearTo} onChange={(event) => setFitmentForm((current) => ({ ...current, yearTo: event.target.value }))} /></div><button className="btn-ghost min-h-11" disabled={Boolean(action.busy)}><ShieldCheck size={15} /> Record fitment</button></form>
            <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const file = data.get('file'); if (!file?.size) return; void run('media', () => uploadAccessoryMedia({ accessToken: user.accessToken, productId: selected.product.id, altText: data.get('altText'), displayOrder: selected.media.length, file }), 'Media uploaded.', refreshSelected) }}><h3 className="font-semibold text-ink-primary">Product media</h3><input name="altText" className="input-field" aria-label="Media alternative text" placeholder="Describe the product image" required /><input name="file" className="input-field py-2" aria-label="Product image" type="file" accept="image/jpeg,image/png,image/webp" required /><button className="btn-ghost min-h-11" disabled={Boolean(action.busy)}><Upload size={15} /> Upload image</button></form>
            {selected.product.isLighting ? <button type="button" className="btn-ghost min-h-11" disabled={Boolean(action.busy)} onClick={() => void run('lighting', () => reviewAccessoryLighting({ accessToken: user.accessToken, productId: selected.product.id, payload: { compatibilityApproved: true, complianceApproved: true, reason: 'Super-admin compatibility and compliance review completed.' } }), 'Lighting review recorded.', refreshSelected)}><ShieldCheck size={15} /> Record lighting review</button> : null}
            <div className="flex flex-wrap gap-2"><button type="button" className="btn-primary min-h-11" disabled={Boolean(action.busy)} onClick={() => void run('publish', () => publishAccessoryProduct({ accessToken: user.accessToken, productId: selected.product.id, version: selected.product.version, payload: { status: 'active', reason: 'Catalog readiness verified.' } }), 'Product published.', async () => { await refreshSelected(); await load() })}>Publish</button><button type="button" className="btn-ghost min-h-11" disabled={Boolean(action.busy)} onClick={() => void run('archive', () => publishAccessoryProduct({ accessToken: user.accessToken, productId: selected.product.id, version: selected.product.version, payload: { status: 'archived', reason: 'Archived by super admin.' } }), 'Product archived.', async () => { await refreshSelected(); await load() })}>Archive</button></div>
          </div>
        </div>
      </section> : null}
    </main>
  )
}
