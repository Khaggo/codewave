import { catalogRoutes } from './requests';
import type {
  ProductCategoryResponse,
  ProductResponse,
} from './responses';

export type CustomerCatalogFeedState =
  | 'catalog_loading'
  | 'catalog_ready'
  | 'catalog_empty'
  | 'catalog_service_unavailable'
  | 'catalog_load_failed';

export type CustomerCatalogDetailState =
  | 'detail_loading'
  | 'detail_ready'
  | 'detail_hidden'
  | 'detail_not_found'
  | 'detail_load_failed';

export interface CustomerCatalogFeedStateRule {
  state: CustomerCatalogFeedState;
  surface: 'customer-mobile';
  truth: 'catalog-route' | 'service-runtime' | 'client-guard';
  routeKey: 'listProducts' | 'listCategories';
  description: string;
}

export interface CustomerCatalogDetailStateRule {
  state: CustomerCatalogDetailState;
  surface: 'customer-mobile';
  truth: 'catalog-route' | 'service-runtime';
  routeKey: 'getProductById';
  description: string;
}

export interface CustomerCatalogCategoryPresentation {
  id: string;
  label: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface CustomerCatalogProductPresentation {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  priceCents: number;
  priceLabel: string;
  visibilityLabel: 'Published' | 'Hidden';
  categoryId: string | null;
  categoryLabel: string;
  updatedAt: string;
}

const formatCatalogCurrency = (priceCents: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);

export const customerMobileCatalogRoutes = {
  listProducts: catalogRoutes.listProducts,
  getProductById: catalogRoutes.getProductById,
  listCategories: catalogRoutes.listCategories,
} as const;

export const customerCatalogFeedStateRules: CustomerCatalogFeedStateRule[] = [
  {
    state: 'catalog_loading',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'listProducts',
    description: 'The mobile app is loading active category and product data from ecommerce-service.',
  },
  {
    state: 'catalog_ready',
    surface: 'customer-mobile',
    truth: 'catalog-route',
    routeKey: 'listProducts',
    description: 'One or more active catalog products are available for customer browsing.',
  },
  {
    state: 'catalog_empty',
    surface: 'customer-mobile',
    truth: 'catalog-route',
    routeKey: 'listProducts',
    description: 'The live catalog routes returned no active products for customer visibility.',
  },
  {
    state: 'catalog_service_unavailable',
    surface: 'customer-mobile',
    truth: 'service-runtime',
    routeKey: 'listProducts',
    description: 'The ecommerce-service base URL is unreachable even though catalog contracts exist.',
  },
  {
    state: 'catalog_load_failed',
    surface: 'customer-mobile',
    truth: 'catalog-route',
    routeKey: 'listProducts',
    description: 'A non-runtime API failure prevented category or product discovery from loading.',
  },
];

export const customerCatalogDetailStateRules: CustomerCatalogDetailStateRule[] = [
  {
    state: 'detail_loading',
    surface: 'customer-mobile',
    truth: 'catalog-route',
    routeKey: 'getProductById',
    description: 'The mobile app is refreshing a single product detail from the live route before showing it.',
  },
  {
    state: 'detail_ready',
    surface: 'customer-mobile',
    truth: 'catalog-route',
    routeKey: 'getProductById',
    description: 'The selected product detail resolved from the canonical ecommerce catalog DTO.',
  },
  {
    state: 'detail_hidden',
    surface: 'customer-mobile',
    truth: 'catalog-route',
    routeKey: 'getProductById',
    description: 'The product disappeared from customer visibility after discovery and should be shown as no longer published.',
  },
  {
    state: 'detail_not_found',
    surface: 'customer-mobile',
    truth: 'catalog-route',
    routeKey: 'getProductById',
    description: 'The requested product id does not exist or is no longer customer-accessible.',
  },
  {
    state: 'detail_load_failed',
    surface: 'customer-mobile',
    truth: 'service-runtime',
    routeKey: 'getProductById',
    description: 'A runtime or API failure prevented the product detail from loading.',
  },
];

export const buildCustomerCatalogCategoryPresentation = (
  category: ProductCategoryResponse,
): CustomerCatalogCategoryPresentation => ({
  id: category.id,
  label: category.name,
  slug: category.slug,
  description: category.description ?? null,
  isActive: category.isActive,
});

export const buildCustomerCatalogProductPresentation = (
  product: ProductResponse,
): CustomerCatalogProductPresentation => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  sku: product.sku,
  description: product.description ?? null,
  priceCents: product.priceCents,
  priceLabel: formatCatalogCurrency(product.priceCents),
  visibilityLabel: product.isActive ? 'Published' : 'Hidden',
  categoryId: product.category?.id ?? null,
  categoryLabel: product.category?.name ?? 'Uncategorized',
  updatedAt: product.updatedAt,
});

export const getCustomerCatalogFeedState = ({
  products,
  errorStatus,
  runtimeUnavailable = false,
}: {
  products: CustomerCatalogProductPresentation[];
  errorStatus?: number | null;
  runtimeUnavailable?: boolean;
}): CustomerCatalogFeedState => {
  if (runtimeUnavailable) {
    return 'catalog_service_unavailable';
  }

  if (products.length > 0) {
    return 'catalog_ready';
  }

  if (products.length === 0 && !errorStatus) {
    return 'catalog_empty';
  }

  return 'catalog_load_failed';
};

export const getCustomerCatalogDetailState = ({
  product,
  errorStatus,
}: {
  product?: CustomerCatalogProductPresentation | null;
  errorStatus?: number | null;
}): CustomerCatalogDetailState => {
  if (product) {
    return 'detail_ready';
  }

  if (errorStatus === 404) {
    return 'detail_hidden';
  }

  if (errorStatus === 400) {
    return 'detail_not_found';
  }

  return 'detail_load_failed';
};

export const customerCatalogRuntimeNote = {
  mobileBaseUrlPolicy:
    'Customer mobile may derive ecommerce-service from the same host as EXPO_PUBLIC_API_BASE_URL by switching to port 3001, or it may use EXPO_PUBLIC_ECOMMERCE_API_BASE_URL explicitly.',
  serviceSplit:
    'Catalog discovery belongs to ecommerce-service and does not reuse main-service port 3000 routes.',
} as const;

export const customerCatalogContractSources = [
  'docs/architecture/domains/ecommerce/catalog.md',
  'docs/architecture/tasks/05-client-integration/T524-catalog-and-product-discovery-mobile-flow.md',
  'backend/apps/ecommerce-service/src/modules/catalog/controllers/catalog.controller.ts',
  'mobile/src/lib/catalogClient.js',
  'mobile/src/components/shop/ShopCatalogSection.js',
] as const;
