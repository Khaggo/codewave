import type { StaffPortalRole } from '../auth/staff-web-session';
import type { RouteContract } from '../shared';
import { catalogRoutes } from '../catalog/requests';
import type {
  ProductCategoryResponse,
  ProductResponse,
} from '../catalog/responses';

export type StaffInventoryRole = Extract<
  StaffPortalRole,
  'service_adviser' | 'super_admin'
>;

export type StaffInventoryLoadState =
  | 'inventory_loading'
  | 'inventory_loaded'
  | 'inventory_partial'
  | 'inventory_empty'
  | 'inventory_service_unavailable'
  | 'inventory_forbidden_role'
  | 'inventory_unauthorized'
  | 'inventory_failed';

export type StaffInventoryDetailState =
  | 'detail_idle'
  | 'detail_loading'
  | 'detail_ready'
  | 'detail_failed';

export type StaffInventoryStockState =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock';

export interface StaffInventoryCategoryPresentation {
  id: string;
  label: string;
  slug: string;
  isActive: boolean;
}

export interface StaffInventoryProductPresentation {
  id: string;
  key: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  priceCents: number;
  priceLabel: string;
  categoryId: string | null;
  categoryLabel: string;
  visibilityLabel: 'Published' | 'Hidden';
  visibilityRouteStatus: 'live';
  stockRouteStatus: 'live';
  stockRouteLabel: string;
  quantityOnHand: number;
  reorderThreshold: number;
  stockState: StaffInventoryStockState;
  updatedAt: string;
}

export interface StaffInventoryStateScenario {
  key: StaffInventoryStockState;
  label: string;
  routeStatus: 'live';
  quantityLabel: string;
  customerImpact: string;
  notes: string;
}

export interface StaffInventoryRouteRule {
  key: keyof typeof staffInventoryRoutes;
  label: string;
  method: RouteContract['method'];
  path: string;
  status: RouteContract['status'];
  source: RouteContract['source'];
  notes: string;
}

const formatInventoryCurrency = (priceCents: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);

export const staffInventoryRoles: StaffInventoryRole[] = [
  'service_adviser',
  'super_admin',
];

const liveInventoryRoutes = {
  getInventoryProduct: {
    method: 'GET',
    path: '/inventory/products/:productId',
    status: 'live',
    source: 'code',
    notes:
      'Live inventory detail route for quantity and threshold visibility.',
  },
  createAdjustment: {
    method: 'POST',
    path: '/inventory/products/:productId/adjustments',
    status: 'live',
    source: 'code',
    notes:
      'Live stock adjustment route for incrementing or decrementing quantity on hand.',
  },
  updateInventoryPolicy: {
    method: 'PATCH',
    path: '/inventory/products/:productId/policy',
    status: 'live',
    source: 'code',
    notes:
      'Live threshold and direct-count reconciliation route for staff inventory policy updates.',
  },
} as const satisfies Record<string, RouteContract>;

export const staffInventoryRoutes = {
  listProducts: catalogRoutes.listProducts,
  getProductById: catalogRoutes.getProductById,
  listCategories: catalogRoutes.listCategories,
  getInventoryProduct: liveInventoryRoutes.getInventoryProduct,
  createAdjustment: liveInventoryRoutes.createAdjustment,
  updateInventoryPolicy: liveInventoryRoutes.updateInventoryPolicy,
} as const;

export const staffInventoryRouteRules: StaffInventoryRouteRule[] = [
  {
    key: 'listProducts',
    label: 'Catalog product directory',
    method: staffInventoryRoutes.listProducts.method,
    path: staffInventoryRoutes.listProducts.path,
    status: staffInventoryRoutes.listProducts.status,
    source: staffInventoryRoutes.listProducts.source,
    notes:
      'Live route used for product creation and publish metadata in the linked catalog.',
  },
  {
    key: 'getProductById',
    label: 'Catalog product detail',
    method: staffInventoryRoutes.getProductById.method,
    path: staffInventoryRoutes.getProductById.path,
    status: staffInventoryRoutes.getProductById.status,
    source: staffInventoryRoutes.getProductById.source,
    notes:
      'Live route used for refreshed product metadata when staff pivot into catalog editing.',
  },
  {
    key: 'listCategories',
    label: 'Catalog categories',
    method: staffInventoryRoutes.listCategories.method,
    path: staffInventoryRoutes.listCategories.path,
    status: staffInventoryRoutes.listCategories.status,
    source: staffInventoryRoutes.listCategories.source,
    notes:
      'Live category route keeps the inventory page aligned with current sellable catalog groupings.',
  },
  {
    key: 'getInventoryProduct',
    label: 'Inventory quantity detail',
    method: staffInventoryRoutes.getInventoryProduct.method,
    path: staffInventoryRoutes.getInventoryProduct.path,
    status: staffInventoryRoutes.getInventoryProduct.status,
    source: staffInventoryRoutes.getInventoryProduct.source,
    notes:
      'Live route for quantity-on-hand and low-stock threshold detail.',
  },
  {
    key: 'createAdjustment',
    label: 'Inventory adjustment',
    method: staffInventoryRoutes.createAdjustment.method,
    path: staffInventoryRoutes.createAdjustment.path,
    status: staffInventoryRoutes.createAdjustment.status,
    source: staffInventoryRoutes.createAdjustment.source,
    notes:
      'Live write route for restock, shrinkage, and correction adjustments.',
  },
  {
    key: 'updateInventoryPolicy',
    label: 'Inventory threshold policy',
    method: staffInventoryRoutes.updateInventoryPolicy.method,
    path: staffInventoryRoutes.updateInventoryPolicy.path,
    status: staffInventoryRoutes.updateInventoryPolicy.status,
    source: staffInventoryRoutes.updateInventoryPolicy.source,
    notes:
      'Live route for low-stock warning thresholds and direct quantity reconciliation.',
  },
];

export const staffInventoryStateScenarios: StaffInventoryStateScenario[] = [
  {
    key: 'in_stock',
    label: 'In Stock',
    routeStatus: 'live',
    quantityLabel: '24 available',
    customerImpact: 'Checkout should proceed without inventory warnings.',
    notes:
      'Live stock is healthy and above the configured reorder threshold.',
  },
  {
    key: 'low_stock',
    label: 'Low Stock',
    routeStatus: 'live',
    quantityLabel: '4 available',
    customerImpact: 'Backoffice should receive a visible warning before oversell risk rises.',
    notes:
      'Live stock remains available but is at or below the configured reorder threshold.',
  },
  {
    key: 'out_of_stock',
    label: 'Out of Stock',
    routeStatus: 'live',
    quantityLabel: '0 available',
    customerImpact: 'Product should be treated as unavailable for checkout until staff adjusts stock.',
    notes:
      'Live stock has reached zero and needs an inventory adjustment before more units can be sold.',
  },
];

export const staffInventoryKnownApiGaps = [
  'Inventory quantity and low-stock thresholds are now live, but reservation counters and movement logs are still not exposed.',
  'Catalog publishing and stock operations are linked but still managed from separate work surfaces.',
  'Checkout reservation math is not yet exposed back into the inventory workspace as a movement history.',
] as const;

export const buildStaffInventoryCategoryPresentation = (
  category: ProductCategoryResponse,
): StaffInventoryCategoryPresentation => ({
  id: category.id,
  label: category.name,
  slug: category.slug,
  isActive: category.isActive,
});

export const buildStaffInventoryProductPresentation = (
  product: ProductResponse,
): StaffInventoryProductPresentation => ({
  id: product.id,
  key: product.id,
  name: product.name,
  slug: product.slug,
  sku: product.sku,
  description: product.description ?? null,
  priceCents: product.priceCents,
  priceLabel: formatInventoryCurrency(product.priceCents),
  categoryId: product.category?.id ?? null,
  categoryLabel: product.category?.name ?? 'Uncategorized',
  visibilityLabel: product.isActive ? 'Published' : 'Hidden',
  visibilityRouteStatus: 'live',
  stockRouteStatus: 'live',
  stockRouteLabel:
    Number(product.quantityOnHand ?? 0) <= 0
      ? 'Out of stock until staff add quantity.'
      : Number(product.quantityOnHand ?? 0) <= Number(product.reorderThreshold ?? 0)
        ? 'Low-stock warning is active.'
        : 'Stock is above the current threshold.',
  quantityOnHand: Number(product.quantityOnHand ?? 0),
  reorderThreshold: Number(product.reorderThreshold ?? 0),
  stockState:
    Number(product.quantityOnHand ?? 0) <= 0
      ? 'out_of_stock'
      : Number(product.quantityOnHand ?? 0) <= Number(product.reorderThreshold ?? 0)
        ? 'low_stock'
        : 'in_stock',
  updatedAt: product.updatedAt,
});

export const createEmptyStaffInventorySnapshot = () => ({
  products: [] as StaffInventoryProductPresentation[],
  categories: [] as StaffInventoryCategoryPresentation[],
  apiBaseUrl: '',
  errors: {
    products: '',
    categories: '',
  },
  errorStatuses: {
    products: null as number | null,
    categories: null as number | null,
  },
  productsRuntimeUnavailable: false,
  categoriesRuntimeUnavailable: false,
});

export const canStaffReadInventory = (
  user?: { role?: StaffPortalRole | null } | null,
) => staffInventoryRoles.includes(user?.role as StaffInventoryRole);

export const getStaffInventoryLoadState = ({
  hasSession,
  canRead,
  products,
  runtimeUnavailable = false,
  partialFailure = false,
}: {
  hasSession: boolean;
  canRead: boolean;
  products: StaffInventoryProductPresentation[];
  runtimeUnavailable?: boolean;
  partialFailure?: boolean;
}): StaffInventoryLoadState => {
  if (!hasSession) {
    return 'inventory_unauthorized';
  }

  if (!canRead) {
    return 'inventory_forbidden_role';
  }

  if (runtimeUnavailable) {
    return products.length > 0 ? 'inventory_partial' : 'inventory_service_unavailable';
  }

  if (partialFailure) {
    return products.length > 0 ? 'inventory_partial' : 'inventory_failed';
  }

  if (products.length > 0) {
    return 'inventory_loaded';
  }

  return 'inventory_empty';
};

export const getStaffInventoryDetailState = ({
  product,
  errorStatus,
}: {
  product?: StaffInventoryProductPresentation | null;
  errorStatus?: number | null;
}): StaffInventoryDetailState => {
  if (product) {
    return 'detail_ready';
  }

  if (!errorStatus) {
    return 'detail_idle';
  }

  return 'detail_failed';
};

export const staffInventoryContractSources = [
  'docs/architecture/domains/ecommerce/inventory.md',
  'docs/architecture/tasks/05-client-integration/T527-inventory-and-stock-visibility-web-flow.md',
  'backend/apps/ecommerce-service/src/modules/catalog/controllers/catalog.controller.ts',
  'backend/apps/ecommerce-service/src/modules/inventory/inventory.module.ts',
  'frontend/src/lib/inventoryAdminClient.js',
  'frontend/src/screens/InventoryWorkspace.js',
] as const;
