import { Injectable } from '@nestjs/common';

type CatalogCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CatalogProductRecord = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  priceCents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const bootstrapCatalogCategories: CatalogCategoryRecord[] = [
  {
    id: 'catalog-category-engine-parts',
    name: 'Engine Parts',
    slug: 'engine-parts',
    description: 'Bootstrap-ready category placeholder for the ecommerce catalog.',
    isActive: true,
    createdAt: new Date('2026-05-12T03:00:00.000Z'),
    updatedAt: new Date('2026-05-12T03:00:00.000Z'),
  },
];

const bootstrapCatalogProducts: CatalogProductRecord[] = [
  {
    id: 'catalog-product-engine-oil',
    categoryId: 'catalog-category-engine-parts',
    name: 'Premium Engine Oil 5W-30',
    slug: 'premium-engine-oil-5w30',
    sku: 'ENG-OIL-5W30',
    description: 'Bootstrap catalog placeholder for follow-up catalog implementation tasks.',
    priceCents: 189900,
    isActive: true,
    createdAt: new Date('2026-05-12T03:05:00.000Z'),
    updatedAt: new Date('2026-05-12T03:05:00.000Z'),
  },
];

@Injectable()
export class CatalogRepository {
  async listCategories() {
    return bootstrapCatalogCategories.map((category) => ({ ...category }));
  }

  async listProducts() {
    return bootstrapCatalogProducts.map((product) => ({ ...product }));
  }

  async findProductById(id: string) {
    const product = bootstrapCatalogProducts.find((entry) => entry.id === id);
    return product ? { ...product } : null;
  }

  async findCategoryById(id: string) {
    const category = bootstrapCatalogCategories.find((entry) => entry.id === id);
    return category ? { ...category } : null;
  }
}
