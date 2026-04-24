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
  | 'reserved'
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
  stockRouteStatus: 'planned';
  stockRouteLabel: string;
  updatedAt: string;
}

export interface StaffInventoryStateScenario {
  key: StaffInventoryStockState;
  label: string;
  routeStatus: 'planned';
  quantityLabel: string;
  reservationLabel: string;
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

const plannedInventoryRoutes = {
  getInventoryProduct: {
    method: 'GET',
    path: '/inventory/products/:productId',
    status: 'planned',
    source: 'task',
    notes:
      'Intended inventory quantity and reservation-detail route for backoffice stock visibility.',
  },
  createAdjustment: {
    method: 'POST',
    path: '/inventory/adjustments',
    status: 'planned',
    source: 'task',
    notes:
      'Manual stock adjustment remains planned and must not be implied as live write behavior in the web client.',
  },
} as const satisfies Record<string, RouteContract>;

export const staffInventoryRoutes = {
  listProducts: catalogRoutes.listProducts,
  getProductById: catalogRoutes.getProductById,
  listCategories: catalogRoutes.listCategories,
  getInventoryProduct: plannedInventoryRoutes.getInventoryProduct,
  createAdjustment: plannedInventoryRoutes.createAdjustment,
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
      'Live route used today for staff product visibility while inventory controllers are not yet exposed.',
  },
  {
    key: 'getProductById',
    label: 'Catalog product detail',
    method: staffInventoryRoutes.getProductById.method,
    path: staffInventoryRoutes.getProductById.path,
    status: staffInventoryRoutes.getProductById.status,
    source: staffInventoryRoutes.getProductById.source,
    notes:
      'Live route used for refreshed product metadata only; it does not include stock counters yet.',
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
      'Planned route for quantity-on-hand, reserved quantity, and stock movement detail.',
  },
  {
    key: 'createAdjustment',
    label: 'Inventory adjustment',
    method: staffInventoryRoutes.createAdjustment.method,
    path: staffInventoryRoutes.createAdjustment.path,
    status: staffInventoryRoutes.createAdjustment.status,
    source: staffInventoryRoutes.createAdjustment.source,
    notes:
      'Planned write route. Procurement or restock operations must stay out of the live web UI until the backend exposes this contract.',
  },
];

export const staffInventoryStateScenarios: StaffInventoryStateScenario[] = [
  {
    key: 'in_stock',
    label: 'In Stock',
    routeStatus: 'planned',
    quantityLabel: '24 available',
    reservationLabel: '0 reserved',
    customerImpact: 'Checkout should proceed without inventory warnings.',
    notes:
      'Shown here as planned only because quantity and reservation DTOs are not yet live-backed.',
  },
  {
    key: 'low_stock',
    label: 'Low Stock',
    routeStatus: 'planned',
    quantityLabel: '4 available',
    reservationLabel: '0 reserved',
    customerImpact: 'Backoffice should receive a visible warning before oversell risk rises.',
    notes:
      'Low-stock thresholds must come from explicit inventory policy, not hidden client math, once the route exists.',
  },
  {
    key: 'reserved',
    label: 'Reserved',
    routeStatus: 'planned',
    quantityLabel: '6 available',
    reservationLabel: '8 reserved',
    customerImpact: 'Staff should understand that checkout has held stock even before fulfillment commits it.',
    notes:
      'Reservation visibility depends on the planned inventory detail route and should not be guessed from order state alone.',
  },
  {
    key: 'out_of_stock',
    label: 'Out of Stock',
    routeStatus: 'planned',
    quantityLabel: '0 available',
    reservationLabel: '0 reserved',
    customerImpact: 'Product should be treated as unavailable for checkout until staff adjusts stock.',
    notes:
      'Availability remains a planned inventory truth, distinct from whether the product is published in the catalog.',
  },
];

export const staffInventoryKnownApiGaps = [
  'No live ecommerce inventory controller is exposed yet beyond an empty module stub, so quantity and reservation counts remain planned.',
  'Manual stock adjustments are not live-backed and must remain documented as future work.',
  'Reserved quantity, movement logs, and low-stock policy thresholds are not present in the live product DTOs.',
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
  stockRouteStatus: 'planned',
  stockRouteLabel: 'Quantity and reservation routes are still planned.',
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
