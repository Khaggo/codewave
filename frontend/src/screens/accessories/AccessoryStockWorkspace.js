'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Boxes, RefreshCw } from 'lucide-react'

import { adjustAccessoryStock, createAccessoryAdminRequestKey, listAccessoryStock } from '@/lib/accessories/accessoriesAdminClient'
import { createAccessoryAdminMutationCoordinator } from '@/lib/accessories/accessoriesAdminMutationCoordinator.mjs'
import { useUser } from '@/lib/userContext'
import { AccessoriesHeader, AccessoriesNotice, AccessoriesState, StatusBadge } from './AccessoriesWorkspaceChrome'

export default function AccessoryStockWorkspace() {
  const user = useUser()
  const [state, setState] = useState({ status: 'loading', items: [], currentCursor: null, nextCursor: null, cursorStack: [], error: '' })
  const [adjustment, setAdjustment] = useState({ variantId: '', quantityDelta: '', reason: '' })
  const [action, setAction] = useState({ busy: false, error: '', message: '' })
  const mutationCoordinatorRef = useRef(null)
  if (!mutationCoordinatorRef.current) {
    mutationCoordinatorRef.current = createAccessoryAdminMutationCoordinator()
  }
  const load = useCallback(async ({ cursor = null, cursorStack = [] } = {}) => {
    if (!user?.accessToken || user.role !== 'super_admin') return
    setState((current) => ({ ...current, status: 'loading', error: '' }))
    try {
      const page = await listAccessoryStock({ accessToken: user.accessToken, cursor })
      setState({ status: 'ready', items: page.items ?? [], currentCursor: cursor, nextCursor: page.nextCursor ?? null, cursorStack, error: '' })
    } catch (error) { setState((current) => ({ ...current, status: 'error', error: error.message })) }
  }, [user?.accessToken, user?.role])
  useEffect(() => { void load() }, [load])

  if (user?.role !== 'super_admin') return <AccessoriesState status="error" title="Super-admin access required" message="Only super admins can view or adjust accessory inventory." />
  if (state.status === 'loading') return <AccessoriesState status="loading" title="Loading accessory stock" message="Retrieving current on-hand and reserved balances." />
  if (state.status === 'error') return <AccessoriesState status="error" title="Stock unavailable" message={state.error} onRetry={() => void load()} />

  const submit = async (event) => {
    event.preventDefault()
    const token = mutationCoordinatorRef.current.begin('stock-adjustment')
    if (!token) return
    setAction({ busy: true, error: '', message: '' })
    try {
      await adjustAccessoryStock({ accessToken: user.accessToken, idempotencyKey: createAccessoryAdminRequestKey(), payload: { variantId: adjustment.variantId, quantityDelta: Number(adjustment.quantityDelta), reason: adjustment.reason } })
      setAction({ busy: false, error: '', message: 'Stock adjustment recorded in the immutable movement history.' })
      setAdjustment({ variantId: '', quantityDelta: '', reason: '' })
      await load({ cursor: state.currentCursor, cursorStack: state.cursorStack })
    } catch (error) {
      await load({ cursor: state.currentCursor, cursorStack: state.cursorStack }).catch(() => undefined)
      setAction({
        busy: false,
        error: error?.status === 409
          ? 'Stock changed in another session. Current balances have been reloaded; review them before trying again.'
          : error.message,
        message: '',
      })
    } finally {
      mutationCoordinatorRef.current.finish(token)
    }
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 lg:p-6">
      <AccessoriesHeader title="Accessory Stock" description="On-hand, reserved, and available units. Every mutation requires an idempotency key and reason." actions={<button type="button" className="btn-ghost min-h-11" disabled={action.busy} onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>} />
      {action.error ? <AccessoriesNotice tone="error">{action.error}</AccessoriesNotice> : null}
      {action.message ? <AccessoriesNotice tone="success">{action.message}</AccessoriesNotice> : null}
      <form onSubmit={submit} className="grid gap-4 rounded-lg border border-surface-border bg-surface-card p-4 md:grid-cols-[minmax(240px,1fr)_150px_minmax(280px,1.3fr)_auto] md:items-end">
        <label className="block"><span className="label">Variant</span><select className="input-field" aria-label="Accessory variant" value={adjustment.variantId} onChange={(event) => setAdjustment((current) => ({ ...current, variantId: event.target.value }))} required disabled={!state.items.length}><option value="">Select a variant…</option>{state.items.map((row) => <option key={row.variant.id} value={row.variant.id}>{row.product.name} - {row.variant.name}</option>)}</select></label>
        <label className="block"><span className="label">Quantity change</span><input className="input-field" aria-label="Signed stock adjustment" type="number" placeholder="e.g. +10…" value={adjustment.quantityDelta} onChange={(event) => setAdjustment((current) => ({ ...current, quantityDelta: event.target.value }))} required disabled={!state.items.length} /></label>
        <label className="block"><span className="label">Audit reason</span><input className="input-field" aria-label="Stock adjustment reason" placeholder="Why is stock changing?…" minLength={3} value={adjustment.reason} onChange={(event) => setAdjustment((current) => ({ ...current, reason: event.target.value }))} required disabled={!state.items.length} /></label>
        <button className="btn-primary min-h-11" disabled={action.busy || !state.items.length}><Boxes size={15} /> Adjust stock</button>
      </form>
      <section className="overflow-x-auto border-y border-surface-border">
        <table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-surface-border bg-surface-raised text-xs uppercase text-ink-secondary"><tr><th className="px-3 py-3">Product / variant</th><th className="px-3 py-3">SKU</th><th className="px-3 py-3 text-right">On hand</th><th className="px-3 py-3 text-right">Reserved</th><th className="px-3 py-3 text-right">Available</th><th className="px-3 py-3">State</th></tr></thead><tbody>{state.items.map((row) => { const onHand = Number(row.inventory?.onHandQuantity ?? 0); const reserved = Number(row.inventory?.reservedQuantity ?? 0); const available = Number(row.inventory?.availableQuantity ?? Math.max(0, onHand - reserved)); return <tr key={row.variant.id} className="border-b border-surface-border"><td className="px-3 py-3"><p className="font-semibold text-ink-primary">{row.product.name}</p><p className="text-xs text-ink-secondary">{row.variant.name}</p></td><td className="px-3 py-3 font-mono text-xs text-ink-secondary">{row.variant.sku}</td><td className="px-3 py-3 text-right tabular-nums text-ink-primary">{onHand}</td><td className="px-3 py-3 text-right tabular-nums text-ink-secondary">{reserved}</td><td className="px-3 py-3 text-right font-semibold tabular-nums text-ink-primary">{available}</td><td className="px-3 py-3"><StatusBadge value={available <= 0 ? 'out of stock' : available <= 3 ? 'low stock' : 'available'} /></td></tr> })}</tbody></table>
        {!state.items.length ? <AccessoriesState status="empty" title="No accessory variants" message="Create catalog variants before recording stock." /> : null}
      </section>
      <nav className="flex justify-end gap-2" aria-label="Accessory stock pages">
        <button type="button" className="btn-ghost min-h-11" disabled={action.busy || !state.cursorStack.length} onClick={() => { const previous = state.cursorStack.at(-1) ?? null; void load({ cursor: previous, cursorStack: state.cursorStack.slice(0, -1) }) }}>Previous</button>
        <button type="button" className="btn-ghost min-h-11" disabled={action.busy || !state.nextCursor} onClick={() => void load({ cursor: state.nextCursor, cursorStack: [...state.cursorStack, state.currentCursor] })}>Next</button>
      </nav>
    </main>
  )
}
