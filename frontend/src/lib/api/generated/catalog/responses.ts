export interface ProductCategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  priceCents: number;
  isActive: boolean;
  category: ProductCategoryResponse | null;
  createdAt: string;
  updatedAt: string;
}
