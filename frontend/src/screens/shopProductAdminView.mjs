export function parseImageUrls(value) {
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function buildModalForm(product) {
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

export function getCatalogImageCount(products) {
  return products.reduce((total, product) => total + (product.images?.length ?? 0), 0)
}
