const stockStateMeta = {
  in_stock: {
    label: 'In stock',
    badgeClassName: 'badge badge-green',
    fieldClassName: 'surface-tone-success',
  },
  low_stock: {
    label: 'Low stock',
    badgeClassName: 'badge badge-orange',
    fieldClassName: 'border-brand-orange/15 bg-brand-orange/10 text-brand-orange',
  },
  out_of_stock: {
    label: 'Out of stock',
    badgeClassName: 'badge badge-red',
    fieldClassName: 'surface-tone-danger',
  },
}

const normalizeSearchValue = (value) => String(value ?? '').trim().toLowerCase()

export function filterInventoryProducts(products = [], query = '') {
  const normalizedQuery = normalizeSearchValue(query)

  if (!normalizedQuery) {
    return products
  }

  return products.filter((product) =>
    [product?.name, product?.sku, product?.category, product?.description]
      .filter(Boolean)
      .some((value) => normalizeSearchValue(value).includes(normalizedQuery)),
  )
}

export function buildInventorySummary(products = []) {
  return products.reduce(
    (summary, product) => {
      summary.totalProducts += 1

      if (product?.stockState === 'low_stock') {
        summary.lowStockProducts += 1
      }

      if (product?.stockState === 'out_of_stock') {
        summary.outOfStockProducts += 1
      }

      if (product?.status === 'published') {
        summary.publishedProducts += 1
      }

      return summary
    },
    {
      totalProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      publishedProducts: 0,
    },
  )
}

export function getInventoryStockStateMeta(stockState) {
  return stockStateMeta[stockState] ?? stockStateMeta.in_stock
}

export function formatInventoryDelta(delta) {
  const numericDelta = Number(delta) || 0

  if (numericDelta > 0) {
    return `+${numericDelta}`
  }

  return String(numericDelta)
}

export function formatInventoryTimestamp(value) {
  if (!value) {
    return 'Not recorded'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatInventoryVisibility(status) {
  return status === 'published' ? 'Published' : 'Hidden'
}

export function getInventoryActorLabel(user) {
  return (
    user?.displayName ||
    user?.name ||
    user?.fullName ||
    user?.roleLabel ||
    user?.email ||
    user?.id ||
    'Inventory Staff'
  )
}
