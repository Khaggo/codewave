import type { RouteContract } from '../shared';

export interface CreateProductCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateProductCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateProductRequest {
  categoryId: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  priceCents: number;
  isActive?: boolean;
}

export interface UpdateProductRequest {
  categoryId?: string;
  name?: string;
  slug?: string;
  sku?: string;
  description?: string;
  priceCents?: number;
  isActive?: boolean;
}

export const catalogRoutes: Record<string, RouteContract> = {
  listProducts: {
    method: 'GET',
    path: '/api/products',
    status: 'live',
    source: 'swagger',
  },
  getProductById: {
    method: 'GET',
    path: '/api/products/:id',
    status: 'live',
    source: 'swagger',
  },
  listCategories: {
    method: 'GET',
    path: '/api/product-categories',
    status: 'live',
    source: 'swagger',
  },
  createCategory: {
    method: 'POST',
    path: '/api/product-categories',
    status: 'live',
    source: 'swagger',
    notes: 'Backoffice-only catalog administration route.',
  },
  updateCategory: {
    method: 'PATCH',
    path: '/api/product-categories/:id',
    status: 'live',
    source: 'swagger',
    notes: 'Backoffice-only catalog administration route.',
  },
  createProduct: {
    method: 'POST',
    path: '/api/products',
    status: 'live',
    source: 'swagger',
    notes: 'Backoffice-only catalog administration route.',
  },
  updateProduct: {
    method: 'PATCH',
    path: '/api/products/:id',
    status: 'live',
    source: 'swagger',
    notes: 'Backoffice-only catalog administration route.',
  },
};
