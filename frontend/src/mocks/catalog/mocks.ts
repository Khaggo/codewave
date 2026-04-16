import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type {
  ProductCategoryResponse,
  ProductResponse,
} from '../../lib/api/generated/catalog/responses';

export const catalogCategoriesMock: ProductCategoryResponse[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Engine Parts',
    slug: 'engine-parts',
    description: 'Sellable engine-related service parts and consumables.',
    isActive: true,
    createdAt: '2026-05-12T03:00:00.000Z',
    updatedAt: '2026-05-12T03:00:00.000Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Filters',
    slug: 'filters',
    description: 'Filters and related consumables.',
    isActive: true,
    createdAt: '2026-05-13T01:00:00.000Z',
    updatedAt: '2026-05-13T01:00:00.000Z',
  },
];

export const catalogProductsMock: ProductResponse[] = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Premium Engine Oil 5W-30',
    slug: 'premium-engine-oil-5w30',
    sku: 'ENG-OIL-5W30',
    description: 'Bootstrap catalog placeholder for follow-up catalog implementation tasks.',
    priceCents: 189900,
    isActive: true,
    category: catalogCategoriesMock[0],
    createdAt: '2026-05-12T03:05:00.000Z',
    updatedAt: '2026-05-12T03:05:00.000Z',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Cabin Filter',
    slug: 'cabin-filter',
    sku: 'CABIN-FILTER-01',
    description: 'Fresh-air cabin filter.',
    priceCents: 64900,
    isActive: true,
    category: catalogCategoriesMock[1],
    createdAt: '2026-05-13T01:05:00.000Z',
    updatedAt: '2026-05-13T01:05:00.000Z',
  },
];

export const catalogCategorySlugConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Product category slug already exists',
  source: 'swagger',
};

export const catalogProductSkuConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Product SKU already exists',
  source: 'swagger',
};
