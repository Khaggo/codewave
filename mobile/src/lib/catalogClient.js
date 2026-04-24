import { ApiError, getApiBaseUrl } from './authClient';

const DEFAULT_ECOMMERCE_API_BASE_URL = 'http://127.0.0.1:3001';
const CATALOG_REQUEST_TIMEOUT_MS = 8000;

const deriveEcommerceApiBaseUrl = () => {
  const explicitBaseUrl = String(process.env.EXPO_PUBLIC_ECOMMERCE_API_BASE_URL ?? '').trim();

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, '');
  }

  const mainApiBaseUrl = getApiBaseUrl();

  try {
    const parsedBaseUrl = new URL(mainApiBaseUrl);
    parsedBaseUrl.port = '3001';
    return parsedBaseUrl.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_ECOMMERCE_API_BASE_URL;
  }
};

const ECOMMERCE_API_BASE_URL = deriveEcommerceApiBaseUrl();

const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const asArray = (value) => (Array.isArray(value) ? value : []);

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

const toNumber = (value) => {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
};

const formatCurrencyLabel = (priceCents) => {
  const pesoAmount = toNumber(priceCents) / 100;

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: pesoAmount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pesoAmount);
};

const formatCatalogDateLabel = (value) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Recently updated';
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const request = async (path, options = {}) => {
  const {
    body,
    headers,
    timeoutMs = CATALOG_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const abortController =
    typeof AbortController === 'function' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? new AbortController()
      : null;
  let timeoutId = null;

  try {
    const runRequest = async () => {
      const response = await fetch(`${ECOMMERCE_API_BASE_URL}${path}`, {
        ...rest,
        signal: abortController?.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const rawText = await response.text();
      let data = null;

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = rawText;
        }
      }

      if (!response.ok) {
        const message =
          data?.message && typeof data.message === 'string'
            ? data.message
            : `Request failed with status ${response.status}`;

        throw new ApiError(message, response.status, data);
      }

      return data;
    };

    const timeoutPromise =
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              abortController?.abort();
              reject(
                new ApiError(
                  `Timed out reaching ${ECOMMERCE_API_BASE_URL}${path} after ${timeoutMs}ms. Start ecommerce-service on port 3001 or set EXPO_PUBLIC_ECOMMERCE_API_BASE_URL.`,
                  0,
                  {
                    path,
                    apiBaseUrl: ECOMMERCE_API_BASE_URL,
                    timeoutMs,
                    reason: 'timeout',
                  },
                ),
              );
            }, timeoutMs);
          })
        : null;

    return timeoutPromise
      ? await Promise.race([runRequest(), timeoutPromise])
      : await runRequest();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the ecommerce API server.';

    throw new ApiError(
      `Unable to reach ${ECOMMERCE_API_BASE_URL}${path}. Start ecommerce-service on port 3001 or set EXPO_PUBLIC_ECOMMERCE_API_BASE_URL. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl: ECOMMERCE_API_BASE_URL,
        timeoutMs,
        reason: 'network',
      },
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const normalizeCatalogCategory = (category) => {
  if (!category || typeof category !== 'object') {
    return null;
  }

  const id = trimOrNull(category.id);
  const name = trimOrNull(category.name);
  const slug = trimOrNull(category.slug);

  if (!id || !name || !slug) {
    return null;
  }

  return {
    id,
    name,
    slug,
    description: trimOrNull(category.description),
    isActive: Boolean(category.isActive),
    createdAt: trimOrNull(category.createdAt),
    updatedAt: trimOrNull(category.updatedAt),
  };
};

const normalizeCatalogProduct = (product) => {
  if (!product || typeof product !== 'object') {
    return null;
  }

  const id = trimOrNull(product.id);
  const name = trimOrNull(product.name);
  const slug = trimOrNull(product.slug);
  const sku = trimOrNull(product.sku);

  if (!id || !name || !slug || !sku) {
    return null;
  }

  const category = normalizeCatalogCategory(product.category);
  const description =
    trimOrNull(product.description) ??
    'No product description has been published for this catalog item yet.';
  const priceCents = toNumber(product.priceCents);

  return {
    key: id,
    id,
    name,
    slug,
    sku,
    description,
    descriptionPreview: description,
    priceCents,
    priceAmount: priceCents / 100,
    priceLabel: formatCurrencyLabel(priceCents),
    isActive: Boolean(product.isActive),
    visibilityLabel: product.isActive ? 'Published' : 'Hidden',
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? 'Uncategorized',
    categorySlug: category?.slug ?? null,
    categoryDescription: category?.description ?? null,
    createdAt: trimOrNull(product.createdAt),
    updatedAt: trimOrNull(product.updatedAt),
    updatedLabel: formatCatalogDateLabel(product.updatedAt ?? product.createdAt),
  };
};

export const getEcommerceApiBaseUrl = () => ECOMMERCE_API_BASE_URL;

export const createEmptyCustomerCatalogSnapshot = () => ({
  categories: [],
  products: [],
});

export const loadCustomerCatalogSnapshot = async ({ accessToken } = {}) => {
  const [categoryData, productData] = await Promise.all([
    request('/api/product-categories', {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
    request('/api/products', {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
  ]);

  return {
    categories: asArray(categoryData).map(normalizeCatalogCategory).filter(Boolean),
    products: asArray(productData).map(normalizeCatalogProduct).filter(Boolean),
  };
};

export const loadCustomerCatalogProductDetail = async ({ productId, accessToken } = {}) => {
  const normalizedProductId = String(productId ?? '').trim();

  if (!normalizedProductId) {
    throw new ApiError('Select a catalog product before opening its detail.', 400, {
      productId,
      reason: 'missing_product_id',
    });
  }

  const data = await request(`/api/products/${encodeURIComponent(normalizedProductId)}`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

  const normalizedProduct = normalizeCatalogProduct(data);

  if (!normalizedProduct) {
    throw new ApiError('The catalog product payload was missing required fields.', 500, {
      productId: normalizedProductId,
      payload: data,
      reason: 'invalid_payload',
    });
  }

  return normalizedProduct;
};
