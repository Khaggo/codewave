import type { ApiErrorResponse } from '../shared';

export const catalogErrorCases: Record<string, ApiErrorResponse[]> = {
  getProductById: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Product not found.',
      source: 'swagger',
    },
  ],
  createCategory: [
    {
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Category payload failed validation.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Product category slug already exists',
      source: 'swagger',
    },
  ],
  updateCategory: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Product category not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Product category slug already exists',
      source: 'swagger',
    },
  ],
  createProduct: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Product category not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Product SKU or slug already exists.',
      source: 'swagger',
    },
  ],
  updateProduct: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Product or category not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Product SKU or slug already exists.',
      source: 'swagger',
    },
  ],
};
