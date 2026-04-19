import { appointments as initialAppointments, shopProducts as initialProducts } from './mockData.js'

export const LOW_STOCK_THRESHOLD = 5

function normalizeCategoryName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : ''
}

function cloneProduct(product) {
  return {
    ...product,
    images: [...(product.images ?? [])],
  }
}

function cloneCategory(category) {
  return { ...category }
}

function cloneAppointment(appointment) {
  return {
    ...appointment,
    chosenServices: [...appointment.chosenServices],
  }
}

function cloneActivityEvent(event) {
  return { ...event }
}

function buildCatalogSeed() {
  const categories = []
  const categoriesByName = new Map()
  const now = new Date().toISOString()

  const products = initialProducts.map((product) => {
    const categoryName = typeof product.category === 'string' ? product.category.trim() : ''
    let category = categoriesByName.get(categoryName)

    if (!category) {
      category = {
        id: `cat-${categories.length + 1}`,
        name: categoryName,
        createdAt: product.createdAt ?? now,
      }
      categories.push(category)
      categoriesByName.set(categoryName, category)
    }

    return {
      ...product,
      categoryId: category.id,
      sku: product.sku ?? '',
      description: product.description ?? '',
      images: [...(product.images ?? [])],
      status: product.status ?? 'published',
      createdAt: product.createdAt ?? now,
      publishedAt:
        product.publishedAt ?? (product.status === 'published' ? product.createdAt ?? now : null),
    }
  })

  return { categories, products }
}

function cloneAppointments() {
  return initialAppointments.map((appointment) => ({
    ...appointment,
    chosenServices: [...appointment.chosenServices],
  }))
}

function buildInitialState() {
  const catalogSeed = buildCatalogSeed()

  return {
    products: catalogSeed.products,
    categories: catalogSeed.categories,
    appointments: cloneAppointments(),
    activity: [],
    counters: {
      appointment: initialAppointments.length + 1,
      checkout: 1,
      jobOrder: 7,
      activity: 1,
      category: catalogSeed.categories.length + 1,
      product: catalogSeed.products.length + 1,
    },
  }
}

function getStore() {
  if (!globalThis.__AUTOCARE_OPERATIONS_STORE__) {
    globalThis.__AUTOCARE_OPERATIONS_STORE__ = {
      state: buildInitialState(),
      listeners: new Set(),
    }
  }

  return globalThis.__AUTOCARE_OPERATIONS_STORE__
}

function emitChange() {
  getStore().listeners.forEach((listener) => listener())
}

function addActivity(event) {
  const store = getStore()
  const nextEvent = {
    id: `evt-${store.state.counters.activity}`,
    createdAt: new Date().toISOString(),
    ...event,
  }

  store.state = {
    ...store.state,
    counters: {
      ...store.state.counters,
      activity: store.state.counters.activity + 1,
    },
    activity: [nextEvent, ...store.state.activity].slice(0, 12),
  }
}

export function subscribeOperations(listener) {
  const store = getStore()
  store.listeners.add(listener)

  return () => {
    store.listeners.delete(listener)
  }
}

export function getInventoryProductsSnapshot() {
  return getStore().state.products.map(cloneProduct)
}

export function getCatalogCategoriesSnapshot() {
  return getStore().state.categories.map(cloneCategory)
}

export function getPublishedCatalogProductsSnapshot() {
  return getInventoryProductsSnapshot().filter((product) => product.status === 'published')
}

export function getAppointmentsSnapshot() {
  return getStore().state.appointments.map(cloneAppointment)
}

export function getOperationsActivitySnapshot() {
  return getStore().state.activity.map(cloneActivityEvent)
}

export function getLowStockProducts(threshold = LOW_STOCK_THRESHOLD) {
  return getInventoryProductsSnapshot().filter((product) => product.stock < threshold)
}

function normalizeTimestamp(value) {
  return value ?? new Date().toISOString()
}

export function sanitizeProductInput(input = {}, { categoryId, categoryName } = {}) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const images = Array.isArray(input.images)
    ? input.images.map((image) => String(image).trim()).filter(Boolean)
    : []
  const stock = Number(input.stock)
  const price = Number(input.price)
  const sku = typeof input.sku === 'string' ? input.sku.trim() : ''
  const status = input.status ?? 'published'
  const resolvedCategoryId = categoryId ?? input.categoryId ?? null
  const resolvedCategoryName = categoryName ?? input.category ?? ''

  if (!name) {
    throw new Error('Product name is required.')
  }

  if (!resolvedCategoryId) {
    throw new Error('Product category is required.')
  }

  if (!description) {
    throw new Error('Product description is required.')
  }

  if (!images.length) {
    throw new Error('Product images are required.')
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Product price must be zero or greater.')
  }

  if (!Number.isFinite(stock) || stock < 0) {
    throw new Error('Product stock must be zero or greater.')
  }

  const createdAt = normalizeTimestamp(input.createdAt)
  const publishedAt =
    status === 'published' ? normalizeTimestamp(input.publishedAt ?? createdAt) : input.publishedAt ?? null

  return {
    name,
    categoryId: resolvedCategoryId,
    category: resolvedCategoryName,
    price,
    stock,
    sku,
    description,
    images,
    status,
    createdAt,
    publishedAt,
  }
}

export function addCatalogCategory(name) {
  const categoryName = typeof name === 'string' ? name.trim() : ''

  if (!categoryName) {
    throw new Error('Category name is required.')
  }

  const store = getStore()
  const existing = store.state.categories.find(
    (category) => normalizeCategoryName(category.name) === normalizeCategoryName(categoryName)
  )

  if (existing) {
    return cloneCategory(existing)
  }

  const category = {
    id: `cat-${store.state.counters.category}`,
    name: categoryName,
    createdAt: new Date().toISOString(),
  }

  store.state = {
    ...store.state,
    counters: {
      ...store.state.counters,
      category: store.state.counters.category + 1,
    },
    categories: [...store.state.categories, category],
  }

  emitChange()
  return cloneCategory(category)
}

export function addInventoryProduct(input) {
  const store = getStore()
  const category = store.state.categories.find(
    (entry) =>
      entry.id === input?.categoryId ||
      normalizeCategoryName(entry.name) === normalizeCategoryName(input?.category)
  )

  if (!category) {
    throw new Error('Product category does not exist.')
  }

  const product = sanitizeProductInput(input, {
    categoryId: category.id,
    categoryName: category.name,
  })

  const nextProduct = {
    id: `p${store.state.counters.product}`,
    ...product,
    category: category.name,
    categoryId: category.id,
    images: [...product.images],
  }

  store.state = {
    ...store.state,
    counters: {
      ...store.state.counters,
      product: store.state.counters.product + 1,
    },
    products: [...store.state.products, nextProduct],
  }

  emitChange()
  return cloneProduct(nextProduct)
}

export function archiveInventoryProduct(productId) {
  const store = getStore()
  let archivedProduct = null

  store.state = {
    ...store.state,
    products: store.state.products.map((product) => {
      if (product.id !== productId) {
        return product
      }

      archivedProduct = {
        ...product,
        status: 'archived',
        archivedAt: new Date().toISOString(),
      }

      return archivedProduct
    }),
  }

  if (!archivedProduct) {
    throw new Error(`Product ${productId} does not exist.`)
  }

  emitChange()
  return cloneProduct(archivedProduct)
}

export function checkoutCart({ customerId, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart must contain at least one item.')
  }

  const store = getStore()
  const productsById = new Map(store.state.products.map((product) => [product.id, product]))
  const aggregatedItems = new Map()

  items.forEach((item) => {
    const product = productsById.get(item.productId)
    const quantity = Number(item.quantity)

    if (!product) {
      throw new Error(`Product ${item.productId} does not exist.`)
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Quantity must be greater than zero.')
    }

    const existing = aggregatedItems.get(product.id)

    if (existing) {
      existing.quantity += quantity
      return
    }

    aggregatedItems.set(product.id, {
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
      subtotal: product.price * quantity,
      stock: product.stock,
    })
  })

  const normalizedItems = [...aggregatedItems.values()].map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.unitPrice * item.quantity,
  }))

  normalizedItems.forEach((item) => {
    const product = productsById.get(item.productId)
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}.`)
    }
  })

  const receiptCheckoutNumber = store.state.counters.checkout
  store.state = {
    ...store.state,
    counters: {
      ...store.state.counters,
      checkout: store.state.counters.checkout + 1,
    },
    products: store.state.products.map((product) => {
      const matchedItem = aggregatedItems.get(product.id)

      if (!matchedItem) {
        return product
      }

      return {
        ...product,
        stock: product.stock - matchedItem.quantity,
      }
    }),
  }

  const receipt = {
    id: `co-${String(receiptCheckoutNumber).padStart(4, '0')}`,
    customerId,
    totalItems: normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
    items: normalizedItems,
  }

  addActivity({
    type: 'checkout',
    title: 'Mobile checkout completed',
    message: `${receipt.totalItems} item(s) sold from the customer app.`,
    referenceId: receipt.id,
  })

  emitChange()
  return receipt
}

export function createAppointment({
  customerId,
  vehicleId,
  slot,
  chosenServices,
  notes = '',
  shopName,
}) {
  if (!vehicleId || !slot || !Array.isArray(chosenServices) || chosenServices.length === 0 || !shopName) {
    throw new Error('Appointment details are incomplete.')
  }

  if (Number.isNaN(Date.parse(slot))) {
    throw new Error('Appointment slot is invalid.')
  }

  const store = getStore()
  const nextAppointment = {
    id: `a${store.state.counters.appointment}`,
    vehicleId,
    customerId,
    slot,
    status: 'pending',
    serviceStage: null,
    chosenServices: [...chosenServices],
    notes,
    shopName,
    jobOrderId: null,
  }

  store.state = {
    ...store.state,
    counters: {
      ...store.state.counters,
      appointment: store.state.counters.appointment + 1,
    },
    appointments: [...store.state.appointments, nextAppointment].sort(
      (left, right) => new Date(left.slot).getTime() - new Date(right.slot).getTime()
    ),
  }

  addActivity({
    type: 'appointment',
    title: 'Mobile booking received',
    message: `${chosenServices[0]} scheduled for ${slot}.`,
    referenceId: nextAppointment.id,
  })

  emitChange()
  return cloneAppointment(nextAppointment)
}

export function convertAppointmentToJobOrder(appointmentId) {
  const store = getStore()
  const target = store.state.appointments.find((appointment) => appointment.id === appointmentId)

  if (!target) {
    throw new Error(`Appointment ${appointmentId} does not exist.`)
  }

  if (target.jobOrderId) {
    return cloneAppointment(target)
  }

  const year = new Date(target.slot).getFullYear()
  const nextJobOrderId = `JO-${year}-${String(store.state.counters.jobOrder).padStart(3, '0')}`
  let convertedAppointment = null

  store.state = {
    ...store.state,
    counters: {
      ...store.state.counters,
      jobOrder: store.state.counters.jobOrder + 1,
    },
    appointments: store.state.appointments.map((appointment) => {
      if (appointment.id !== appointmentId) {
        return appointment
      }

      convertedAppointment = {
        ...appointment,
        jobOrderId: nextJobOrderId,
        status: 'confirmed',
        serviceStage: 'intake',
      }

      return convertedAppointment
    }),
  }

  addActivity({
    type: 'job-order',
    title: 'Appointment converted to job order',
    message: `${convertedAppointment.chosenServices[0]} now starts the service lifecycle.`,
    referenceId: convertedAppointment.jobOrderId,
  })

  emitChange()
  return cloneAppointment(convertedAppointment)
}

const STAGE_ORDER = ['intake', 'in_repair', 'qc', 'ready']

export function updateAppointmentStage(appointmentId, stage) {
  if (!STAGE_ORDER.includes(stage)) {
    throw new Error(`Unknown service stage: ${stage}`)
  }

  const store = getStore()
  const target = store.state.appointments.find((a) => a.id === appointmentId)
  if (!target) {
    throw new Error(`Appointment ${appointmentId} does not exist.`)
  }

  const nextStatus = stage === 'ready' ? 'completed' : 'in_progress'
  let updated = null

  store.state = {
    ...store.state,
    appointments: store.state.appointments.map((a) => {
      if (a.id !== appointmentId) return a
      updated = { ...a, serviceStage: stage, status: nextStatus }
      return updated
    }),
  }

  addActivity({
    type: 'service-stage',
    title: 'Service stage updated',
    message: `${updated.chosenServices[0]} is now at ${stage.replace('_', ' ')}.`,
    referenceId: updated.jobOrderId ?? updated.id,
  })

  emitChange()
  return cloneAppointment(updated)
}

export function resetOperationsState() {
  const store = getStore()
  store.state = buildInitialState()
  emitChange()
}
