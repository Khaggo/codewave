'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PackageCheck, RefreshCw, X } from 'lucide-react'

import {
  approveAccessoryRefund,
  cancelAccessoryStaffOrder,
  createAccessoryAdminRequestKey,
  formatAccessoryAdminMoney,
  getAccessoryStaffOrder,
  listAccessoryRefunds,
  listAccessoryStaffOrders,
  reassignAccessoryOrder,
  takeAccessoryOrder,
  transitionAccessoryOrder,
} from '@/lib/accessories/accessoriesAdminClient'
import PortalSelect from '@/components/ui/PortalSelect'
import { listStaffAccounts } from '@/lib/authClient'
import {
  getAccessoryOrderNextAction,
  normalizeAccessoryStaffOrderDetail,
} from '@/lib/accessories/accessoriesAdminModel.mjs'
import { useUser } from '@/lib/userContext'
import { AccessoriesHeader, AccessoriesNotice, AccessoriesState, StatusBadge } from './AccessoriesWorkspaceChrome'

const initialPage = {
  status: 'loading',
  items: [],
  currentCursor: null,
  nextCursor: null,
  cursorStack: [],
  error: '',
}

export default function AccessoryOrdersWorkspace() {
  const user = useUser()
  const [state, setState] = useState(initialPage)
  const [selected, setSelected] = useState(null)
  const [refunds, setRefunds] = useState([])
  const [action, setAction] = useState({ busy: '', error: '', message: '' })
  const [collection, setCollection] = useState({ reference: '', code: '' })
  const [admin, setAdmin] = useState({ reassignTo: '', reason: '', cancelReason: '' })
  const [staffOptions, setStaffOptions] = useState([])
  const actionLockRef = useRef(false)
  const drawerRef = useRef(null)
  const returnFocusRef = useRef(null)
  const canUse = ['service_adviser', 'super_admin'].includes(user?.role)

  const load = useCallback(async ({ cursor = null, cursorStack = [] } = {}) => {
    if (!user?.accessToken || !canUse) return
    setState((current) => ({ ...current, status: 'loading', error: '' }))
    try {
      const [page, refundPage] = await Promise.all([
        listAccessoryStaffOrders({ accessToken: user.accessToken, cursor }),
        user.role === 'super_admin'
          ? listAccessoryRefunds({ accessToken: user.accessToken })
          : Promise.resolve({ items: [] }),
      ])
      setState({
        status: 'ready',
        items: page.items ?? [],
        currentCursor: cursor,
        nextCursor: page.nextCursor ?? null,
        cursorStack,
        error: '',
      })
      setRefunds(Array.isArray(refundPage?.items) ? refundPage.items : [])
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error: error.message }))
    }
  }, [user?.accessToken, user?.role, canUse])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!user?.accessToken || user.role !== 'super_admin') {
      setStaffOptions([])
      return undefined
    }

    let active = true
    void listStaffAccounts(user.accessToken)
      .then((accounts) => {
        if (active) setStaffOptions(Array.isArray(accounts) ? accounts : [])
      })
      .catch(() => {
        if (active) setStaffOptions([])
      })

    return () => {
      active = false
    }
  }, [user?.accessToken, user?.role])

  const closeDrawer = useCallback(() => {
    setSelected(null)
    setTimeout(() => returnFocusRef.current?.focus?.(), 0)
  }, [])

  useEffect(() => {
    if (!selected) return undefined
    drawerRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeDrawer()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...drawerRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )]
      if (!focusable.length) {
        event.preventDefault()
        drawerRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selected, closeDrawer])

  const refreshDetail = useCallback(async (orderId) => {
    const detail = normalizeAccessoryStaffOrderDetail(
      await getAccessoryStaffOrder({ accessToken: user.accessToken, orderId }),
    )
    if (!detail) throw new Error('The order detail response is incomplete. Refresh the queue.')
    setSelected(detail)
    setCollection((current) => ({ reference: detail.order.orderReference, code: current.code }))
    return detail
  }, [user?.accessToken])

  const refreshCurrentPage = () => load({
    cursor: state.currentCursor,
    cursorStack: state.cursorStack,
  })

  const run = async (key, work, success, reloadDetail = true) => {
    if (actionLockRef.current) return null
    actionLockRef.current = true
    setAction({ busy: key, error: '', message: '' })
    try {
      const result = await work()
      await refreshCurrentPage()
      if (reloadDetail && selected?.order?.id) await refreshDetail(selected.order.id)
      setAction({ busy: '', error: '', message: success })
      return result
    } catch (error) {
      if (error?.status === 409) {
        await refreshCurrentPage()
        if (selected?.order?.id) {
          try { await refreshDetail(selected.order.id) } catch { closeDrawer() }
        }
        const conflictCode = error?.details?.code
        const staleConflict = !conflictCode || conflictCode === 'ACCESSORY_ORDER_CLAIM_CONFLICT'
        setAction({
          busy: '',
          error: staleConflict
            ? 'This order changed in another session. The latest queue and order details are now shown.'
            : error.message,
          message: '',
        })
      } else {
        setAction({ busy: '', error: error.message, message: '' })
      }
      return null
    } finally {
      actionLockRef.current = false
    }
  }

  const openOrder = async (orderId) => {
    if (actionLockRef.current) return
    actionLockRef.current = true
    returnFocusRef.current = document.activeElement
    setAction({ busy: 'open', error: '', message: '' })
    try {
      await refreshDetail(orderId)
      setAction({ busy: '', error: '', message: '' })
    } catch (error) {
      setAction({ busy: '', error: error.message, message: '' })
    } finally {
      actionLockRef.current = false
    }
  }

  const counts = useMemo(() => state.items.reduce(
    (result, order) => ({ ...result, [order.status]: (result[order.status] ?? 0) + 1 }),
    {},
  ), [state.items])

  if (!canUse) return <AccessoriesState status="error" title="Staff access required" message="Accessory fulfillment is available to service advisers and super admins." />
  if (state.status === 'loading') return <AccessoriesState status="loading" title="Loading accessory orders" message="Retrieving one bounded fulfillment page." />
  if (state.status === 'error') return <AccessoriesState status="error" title="Orders unavailable" message={state.error} onRetry={() => void refreshCurrentPage()} />

  const currentAction = selected ? getAccessoryOrderNextAction(selected.order, user.id) : null
  const interactionBusy = Boolean(action.busy)
  const pendingRefunds = refunds.filter((refund) => ['requested', 'pending'].includes(refund.status))

  return (
    <main className="mx-auto max-w-[1600px] space-y-5 p-4 lg:p-6">
      <AccessoriesHeader title="Accessory Orders" description="One pickup queue with explicit ownership, optimistic transitions, and one next action." actions={<button type="button" className="btn-ghost min-h-11" disabled={interactionBusy} onClick={() => void refreshCurrentPage()}><RefreshCw size={15} /> Refresh</button>} />
      <div className="flex flex-wrap gap-2"><StatusBadge value={`${state.items.length} on page`} /><StatusBadge value={`${counts.reserved ?? 0} reserved`} /><StatusBadge value={`${counts.preparing ?? 0} preparing`} /><StatusBadge value={`${counts.ready_for_pickup ?? 0} ready`} /></div>
      {action.error ? <AccessoriesNotice tone="error">{action.error}</AccessoriesNotice> : null}
      {action.message ? <AccessoriesNotice tone="success">{action.message}</AccessoriesNotice> : null}

      <section className="overflow-x-auto border-y border-surface-border">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-raised text-xs uppercase text-ink-secondary"><tr><th className="px-3 py-3">Reference</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Pickup contact</th><th className="px-3 py-3">Ownership</th><th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3 text-right">Action</th></tr></thead>
          <tbody>{state.items.map((order) => {
            const rowAction = getAccessoryOrderNextAction(order, user.id)
            return <tr key={order.id} className="border-b border-surface-border"><td className="px-3 py-3"><p className="font-semibold text-ink-primary">{order.orderReference}</p><p className="text-xs text-ink-secondary">{new Date(order.createdAt).toLocaleString()}</p></td><td className="px-3 py-3"><StatusBadge value={order.status} /></td><td className="px-3 py-3"><StatusBadge value={order.paymentStatus} /></td><td className="px-3 py-3 text-ink-secondary">{order.contactSnapshot?.name || 'Customer'}</td><td className="px-3 py-3 text-ink-secondary">{order.assignedToUserId === user.id ? 'Assigned to you' : order.assignedToUserId ? 'Handled by another staff member' : 'Unassigned'}</td><td className="px-3 py-3 text-right font-semibold tabular-nums text-ink-primary">{formatAccessoryAdminMoney(order.totalCents, order.currencyCode)}</td><td className="px-3 py-3 text-right"><div className="flex justify-end gap-2">{rowAction?.key === 'take' ? <button type="button" className="btn-primary min-h-11" disabled={interactionBusy} onClick={() => void run(`take-${order.id}`, () => takeAccessoryOrder({ accessToken: user.accessToken, orderId: order.id, version: order.version }), 'Order assigned to you.', false)}>Take</button> : null}<button type="button" className="btn-ghost min-h-11" disabled={interactionBusy} onClick={() => void openOrder(order.id)}>Open</button></div></td></tr>
          })}</tbody>
        </table>
        {!state.items.length ? <AccessoriesState status="empty" title="No accessory orders" message="The queue is empty. Existing history and reconciliation remain available when ordering is disabled." /> : null}
      </section>

      <nav className="flex justify-end gap-2" aria-label="Accessory order pages">
        <button type="button" className="btn-ghost min-h-11" disabled={interactionBusy || !state.cursorStack.length} onClick={() => { const previous = state.cursorStack.at(-1) ?? null; void load({ cursor: previous, cursorStack: state.cursorStack.slice(0, -1) }) }}>Previous</button>
        <button type="button" className="btn-ghost min-h-11" disabled={interactionBusy || !state.nextCursor} onClick={() => void load({ cursor: state.nextCursor, cursorStack: [...state.cursorStack, state.currentCursor] })}>Next</button>
      </nav>

      {selected ? <div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="accessory-order-drawer-title" tabIndex={-1} className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-surface-border bg-surface-card p-5 shadow-2xl outline-none">
        <div className="flex items-start justify-between gap-4 border-b border-surface-border pb-4"><div><h2 id="accessory-order-drawer-title" className="text-xl font-semibold text-ink-primary">{selected.order.orderReference}</h2><p className="mt-1 text-sm text-ink-secondary">{selected.order.contactSnapshot?.name} - {selected.order.contactSnapshot?.phone}</p></div><button type="button" className="btn-ghost min-h-11 min-w-11" aria-label="Close order details" disabled={interactionBusy} onClick={closeDrawer}><X size={17} /></button></div>
        <div className="space-y-5 py-5">
          <div className="flex flex-wrap gap-2"><StatusBadge value={selected.order.status} /><StatusBadge value={selected.order.paymentStatus} />{selected.order.assignedToUserId === user.id ? <StatusBadge value="assigned to you" /> : null}</div>
          <section><h3 className="font-semibold text-ink-primary">Items</h3><div className="mt-2 divide-y divide-surface-border border-y border-surface-border">{selected.items.length ? selected.items.map((item) => <div key={item.id} className="flex justify-between gap-4 py-3"><div><p className="font-medium text-ink-primary">{item.productNameSnapshot}</p><p className="text-xs text-ink-muted">{item.variantNameSnapshot} - {item.skuSnapshot}</p></div><p className="text-sm text-ink-secondary">{item.quantity} x {formatAccessoryAdminMoney(item.unitPriceCents)}</p></div>) : <p className="py-3 text-sm text-ink-secondary">No item details are available.</p>}</div></section>
          {currentAction?.key === 'take' ? <button type="button" className="btn-primary min-h-11" disabled={interactionBusy} onClick={() => void run('take', () => takeAccessoryOrder({ accessToken: user.accessToken, orderId: selected.order.id, version: selected.order.version }), 'Order assigned to you.')}>Take this order</button> : null}
          {currentAction && !['take', 'collected'].includes(currentAction.key) ? <button type="button" className="btn-primary min-h-11" disabled={interactionBusy} onClick={() => void run(currentAction.key, () => transitionAccessoryOrder({ accessToken: user.accessToken, orderId: selected.order.id, version: selected.order.version, payload: { status: currentAction.key, reason: currentAction.label } }), `${currentAction.label} completed.`)}><PackageCheck size={15} /> {currentAction.label}</button> : null}
          {currentAction?.key === 'collected' ? <form className="space-y-3 border-y border-surface-border py-4" onSubmit={(event) => { event.preventDefault(); void run('collected', () => transitionAccessoryOrder({ accessToken: user.accessToken, orderId: selected.order.id, version: selected.order.version, payload: { status: 'collected', orderReference: collection.reference, pickupCode: collection.code, reason: 'Pickup identity verified at collection.' } }), 'Order collected and stock consumed.') }}><h3 className="font-semibold text-ink-primary">Verify collection</h3><input className="input-field" aria-label="Order reference for collection" disabled={interactionBusy} value={collection.reference} onChange={(event) => setCollection((current) => ({ ...current, reference: event.target.value }))} required /><input className="input-field" aria-label="Six-digit pickup code" disabled={interactionBusy} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={collection.code} onChange={(event) => setCollection((current) => ({ ...current, code: event.target.value.replace(/\D/g, '').slice(0, 6) }))} required /><button className="btn-primary min-h-11" disabled={interactionBusy || collection.code.length !== 6}>Verify and collect</button></form> : null}
          {user.role === 'super_admin' ? <section className="space-y-3 border-y border-surface-border py-4"><h3 className="font-semibold text-ink-primary">Super-admin controls</h3><PortalSelect value={admin.reassignTo} onValueChange={(value) => setAdmin((current) => ({ ...current, reassignTo: value }))} placeholder="Choose staff owner" emptyOptionLabel="Unassigned" items={staffOptions.map((account) => ({ value: account.id, label: account.displayName || account.fullName || account.email || account.staffCode || 'Staff member', helper: account.roleLabel || account.staffCode || 'Staff account' }))} disabled={interactionBusy} triggerClassName="min-h-11" /><input className="input-field" aria-label="Reassignment reason" disabled={interactionBusy} placeholder="Required reassignment reason" value={admin.reason} onChange={(event) => setAdmin((current) => ({ ...current, reason: event.target.value }))} /><button type="button" className="btn-ghost min-h-11" disabled={interactionBusy || !admin.reassignTo || admin.reason.length < 3} onClick={() => void run('reassign', () => reassignAccessoryOrder({ accessToken: user.accessToken, orderId: selected.order.id, version: selected.order.version, payload: { assigneeUserId: admin.reassignTo, reason: admin.reason } }), 'Order reassigned.')}>Reassign</button><input className="input-field" aria-label="Cancellation exception reason" disabled={interactionBusy} placeholder="Cancellation exception reason" value={admin.cancelReason} onChange={(event) => setAdmin((current) => ({ ...current, cancelReason: event.target.value }))} /><button type="button" className="btn-ghost min-h-11 text-status-danger" disabled={interactionBusy || admin.cancelReason.length < 3 || ['collected', 'refunded'].includes(selected.order.status)} onClick={() => void run('cancel', () => cancelAccessoryStaffOrder({ accessToken: user.accessToken, orderId: selected.order.id, reason: admin.cancelReason, idempotencyKey: createAccessoryAdminRequestKey() }), 'Order cancellation recorded.')}>Cancel with audit reason</button></section> : null}
          <section><h3 className="font-semibold text-ink-primary">Audit timeline</h3><div className="mt-2 divide-y divide-surface-border border-y border-surface-border">{selected.history.length ? selected.history.map((entry) => <div key={entry.id} className="py-3"><StatusBadge value={entry.nextStatus} /><p className="mt-1 text-sm text-ink-secondary">{entry.reason || 'Status updated'}</p><p className="mt-1 text-xs text-ink-muted">{new Date(entry.createdAt).toLocaleString()}</p></div>) : <p className="py-3 text-sm text-ink-secondary">No audit entries are available.</p>}</div></section>
        </div>
      </div> : null}

      {user.role === 'super_admin' && pendingRefunds.length ? <section className="border-y border-surface-border py-4"><h2 className="font-semibold text-ink-primary">Pending full refunds</h2><div className="mt-3 divide-y divide-surface-border">{pendingRefunds.map((refund) => <div key={refund.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium text-ink-primary">{formatAccessoryAdminMoney(refund.amountCents, refund.currencyCode)}</p><p className="text-sm text-ink-muted">{refund.reason}</p></div><button type="button" className="btn-primary min-h-11" disabled={interactionBusy} onClick={() => void run(`refund-${refund.id}`, () => approveAccessoryRefund({ accessToken: user.accessToken, refundId: refund.id, reason: 'Approved full refund.', idempotencyKey: createAccessoryAdminRequestKey() }), 'Full refund approved.', false)}>Approve full refund</button></div>)}</div></section> : null}
    </main>
  )
}
