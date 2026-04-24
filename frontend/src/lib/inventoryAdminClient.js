import { ApiError } from './authClient';
import {
  buildStaffInventoryCategoryPresentation,
  buildStaffInventoryProductPresentation,
} from './api/generated/inventory/staff-web-inventory';

const DEFAULT_ECOMMERCE_API_BASE_URL = 'http://127.0.0.1:3001';
const INVENTORY_REQUEST_TIMEOUT_MS = 8000;
const MAIN_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);

const deriveEcommerceApiBaseUrl = () => {
  const explicitBaseUrl = String(process.env.NEXT_PUBLIC_ECOMMERCE_API_BASE_URL ?? '').trim();

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, '');
  }

  try {
    const parsedBaseUrl = new URL(MAIN_API_BASE_URL);
    parsedBaseUrl.port = '3001';
    return parsedBaseUrl.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_ECOMMERCE_API_BASE_URL;
  }
};

const ECOMMERCE_API_BASE_URL = deriveEcommerceApiBaseUrl();

const buildAuthorizedHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const asArray = (value) => (Array.isArray(value) ? value : []);

const request = async (path, { accessToken, method = 'GET', body, timeoutMs = INVENTORY_REQUEST_TIMEOUT_MS } = {}) => {
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
        method,
        cache: 'no-store',
        signal: abortController?.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(buildAuthorizedHeaders(accessToken) ?? {}),
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
                  `Timed out reaching ${ECOMMERCE_API_BASE_URL}${path} after ${timeoutMs}ms. Start ecommerce-service on port 3001 or set NEXT_PUBLIC_ECOMMERCE_API_BASE_URL.`,
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

    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the ecommerce inventory surface.';

    throw new ApiError(
      `Unable to reach ${ECOMMERCE_API_BASE_URL}${path}. Start ecommerce-service on port 3001 or set NEXT_PUBLIC_ECOMMERCE_API_BASE_URL. ${message}`,
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

const normalizeCatalogProducts = (payload) => {
  const products = asArray(payload).map(buildStaffInventoryProductPresentation).filter(Boolean);

  if (!Array.isArray(payload)) {
    throw new ApiError('The product directory payload was missing required fields.', 500, {
      path: '/api/products',
      payload,
    });
  }

  return products;
};

const normalizeCatalogCategories = (payload) => {
  const categories = asArray(payload).map(buildStaffInventoryCategoryPresentation).filter(Boolean);

  if (!Array.isArray(payload)) {
    throw new ApiError('The category directory payload was missing required fields.', 500, {
      path: '/api/product-categories',
      payload,
    });
  }

  return categories;
};

const getErrorMessage = (error, fallback) =>
  error instanceof ApiError && error.message ? error.message : fallback;

const isRuntimeUnavailable = (error) => error instanceof ApiError && error.status === 0;

export const getEcommerceInventoryApiBaseUrl = () => ECOMMERCE_API_BASE_URL;

export const listStaffInventoryProducts = async ({ accessToken } = {}) =>
  normalizeCatalogProducts(
    await request('/api/products', {
      accessToken,
    }),
  );

export const listStaffInventoryCategories = async ({ accessToken } = {}) =>
  normalizeCatalogCategories(
    await request('/api/product-categories', {
      accessToken,
    }),
  );

export const getStaffInventoryProductDetail = async ({ productId, accessToken } = {}) => {
  const normalizedProductId = String(productId ?? '').trim();

  if (!normalizedProductId) {
    throw new ApiError('Select a product before loading inventory detail.', 400, {
      path: '/api/products/:id',
      productId,
    });
  }

  return buildStaffInventoryProductPresentation(
    await request(`/api/products/${encodeURIComponent(normalizedProductId)}`, {
      accessToken,
    }),
  );
};

export const loadStaffInventorySnapshot = async ({ accessToken } = {}) => {
  if (!accessToken) {
    throw new ApiError('Sign in as staff before loading inventory visibility.', 401, {
      path: '/api/products',
      reason: 'missing_access_token',
    });
  }

  const [productsResult, categoriesResult] = await Promise.allSettled([
    listStaffInventoryProducts({ accessToken }),
    listStaffInventoryCategories({ accessToken }),
  ]);

  return {
    products: productsResult.status === 'fulfilled' ? productsResult.value : [],
    categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
    apiBaseUrl: ECOMMERCE_API_BASE_URL,
    errors: {
      products:
        productsResult.status === 'rejected'
          ? getErrorMessage(
              productsResult.reason,
              'We could not load the live product directory right now.',
            )
          : '',
      categories:
        categoriesResult.status === 'rejected'
          ? getErrorMessage(
              categoriesResult.reason,
              'We could not load the live category directory right now.',
            )
          : '',
    },
    errorStatuses: {
      products:
        productsResult.status === 'rejected' && productsResult.reason instanceof ApiError
          ? productsResult.reason.status
          : null,
      categories:
        categoriesResult.status === 'rejected' && categoriesResult.reason instanceof ApiError
          ? categoriesResult.reason.status
          : null,
    },
    productsRuntimeUnavailable:
      productsResult.status === 'rejected' && isRuntimeUnavailable(productsResult.reason),
    categoriesRuntimeUnavailable:
      categoriesResult.status === 'rejected' && isRuntimeUnavailable(categoriesResult.reason),
  };
};
