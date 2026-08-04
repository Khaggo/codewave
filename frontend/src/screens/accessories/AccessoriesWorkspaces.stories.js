import { expect, fn, userEvent, within } from 'storybook/test'

import { UserProvider } from '@/lib/userContext'
import AccessoryCatalogWorkspace from './AccessoryCatalogWorkspace'
import AccessoryOrdersWorkspace from './AccessoryOrdersWorkspace'
import AccessoryStockWorkspace from './AccessoryStockWorkspace'

const admin = { id: '11111111-1111-4111-8111-111111111111', role: 'super_admin', accessToken: 'storybook-token' }
const adviser = { id: '22222222-2222-4222-8222-222222222222', role: 'service_adviser', accessToken: 'storybook-token' }
const product = { id: '33333333-3333-4333-8333-333333333333', categoryId: '44444444-4444-4444-8444-444444444444', slug: 'led-fog-lights', name: 'LED fog light pair', description: 'Compact lighting upgrade.', status: 'active', isLighting: true, version: 3, createdAt: new Date().toISOString() }
const variant = { id: '55555555-5555-4555-8555-555555555555', productId: product.id, sku: 'LIGHT-001', name: 'White beam', priceCents: 189900, currencyCode: 'PHP', version: 1, isActive: true, createdAt: new Date().toISOString() }
const order = { id: '66666666-6666-4666-8666-666666666666', orderReference: 'ACC-260803-ABC123', status: 'reserved', paymentMethod: 'pay_at_shop', paymentStatus: 'pending', totalCents: 189900, currencyCode: 'PHP', contactSnapshot: { name: 'Queue Customer', phone: '09171234567' }, assignedToUserId: null, version: 0, createdAt: new Date().toISOString() }

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const installFetch = (handler) => {
  const original = globalThis.fetch
  globalThis.fetch = fn(handler)
  return () => { globalThis.fetch = original }
}
const withUser = (user) => {
  const UserDecorator = (Story) => <UserProvider user={user}><Story /></UserProvider>
  UserDecorator.displayName = 'AccessoriesUserDecorator'
  return UserDecorator
}

const meta = { title: 'Accessories/Staff workspaces' }

export default meta

export const Catalog = {
  render: () => <AccessoryCatalogWorkspace />,
  decorators: [withUser(admin)],
  beforeEach: () => installFetch(async (input) => {
    const url = String(input)
    if (url.includes('/catalog/categories')) return jsonResponse([{ id: '44444444-4444-4444-8444-444444444444', slug: 'lighting', name: 'Lighting', status: 'active' }])
    if (url.includes('/catalog/products')) return jsonResponse({ items: [{ product, category: { id: product.categoryId, name: 'Lighting' } }], nextCursor: null })
    return jsonResponse({})
  }),
}

export const Stock = {
  render: () => <AccessoryStockWorkspace />,
  decorators: [withUser(admin)],
  beforeEach: () => installFetch(async () => jsonResponse({ items: [{ product, variant, inventory: { onHandQuantity: 12, reservedQuantity: 3 } }], nextCursor: null })),
}

export const FulfillmentQueue = {
  render: () => <AccessoryOrdersWorkspace />,
  decorators: [withUser(adviser)],
  beforeEach: () => installFetch(async () => jsonResponse({ items: [order], nextCursor: null })),
}

export const FulfillmentDrawer = {
  render: () => <AccessoryOrdersWorkspace />,
  decorators: [withUser(adviser)],
  beforeEach: () => installFetch(async (input) => {
    const url = String(input)
    if (url.endsWith(`/orders/${order.id}`)) {
      return jsonResponse({ order, items: [], history: [], paymentAttempts: [], refunds: [] })
    }
    return jsonResponse({ items: [order], nextCursor: null })
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: 'Open' }))
    await expect(await canvas.findByRole('dialog', { name: order.orderReference })).toBeVisible()
  },
}

export const TerminalOrderIsReadOnly = {
  render: () => <AccessoryOrdersWorkspace />,
  decorators: [withUser(adviser)],
  beforeEach: () => installFetch(async () => jsonResponse({
    items: [{ ...order, status: 'payment_exception', paymentStatus: 'exception' }],
    nextCursor: null,
  })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('button', { name: 'Open' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Take' })).not.toBeInTheDocument()
  },
}
