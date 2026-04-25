import { randomUUID } from 'crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateProductCategoryDto } from '../dto/create-product-category.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductCategoryDto } from '../dto/update-product-category.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

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
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Engine Parts',
    slug: 'engine-parts',
    description: 'Engine maintenance parts, lubricants, and consumables for customer orders.',
    isActive: true,
    createdAt: new Date('2026-05-12T03:00:00.000Z'),
    updatedAt: new Date('2026-05-12T03:00:00.000Z'),
  },
];

const bootstrapCatalogProducts: CatalogProductRecord[] = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    categoryId: '11111111-1111-4111-8111-111111111111',
    name: 'Premium Engine Oil 5W-30',
    slug: 'premium-engine-oil-5w30',
    sku: 'ENG-OIL-5W30',
    description: 'Fully synthetic 5W-30 engine oil for smoother starts, cleaner engine operation, and regular PMS top-ups.',
    priceCents: 189900,
    isActive: true,
    createdAt: new Date('2026-05-12T03:05:00.000Z'),
    updatedAt: new Date('2026-05-12T03:05:00.000Z'),
  },
];

@Injectable()
export class CatalogRepository {
  private readonly categories = new Map(
    bootstrapCatalogCategories.map((category) => [category.id, { ...category }]),
  );

  private readonly products = new Map(
    bootstrapCatalogProducts.map((product) => [product.id, { ...product }]),
  );

  async listCategories(options?: { activeOnly?: boolean }) {
    return Array.from(this.categories.values())
      .filter((category) => (options?.activeOnly ? category.isActive : true))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((category) => ({ ...category }));
  }

  async listProducts(options?: { activeOnly?: boolean }) {
    return Array.from(this.products.values())
      .filter((product) => (options?.activeOnly ? product.isActive : true))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((product) => ({ ...product }));
  }

  async findProductById(id: string, options?: { activeOnly?: boolean }) {
    const product = this.products.get(id);
    if (!product) {
      return null;
    }

    if (options?.activeOnly && !product.isActive) {
      return null;
    }

    return product ? { ...product } : null;
  }

  async findCategoryById(id: string) {
    const category = this.categories.get(id);
    return category ? { ...category } : null;
  }

  async findCategoryBySlug(slug: string) {
    const category = Array.from(this.categories.values()).find((entry) => entry.slug === slug);
    return category ? { ...category } : null;
  }

  async findProductBySlug(slug: string) {
    const product = Array.from(this.products.values()).find((entry) => entry.slug === slug);
    return product ? { ...product } : null;
  }

  async findProductBySku(sku: string) {
    const product = Array.from(this.products.values()).find((entry) => entry.sku === sku);
    return product ? { ...product } : null;
  }

  async createCategory(payload: CreateProductCategoryDto) {
    const now = new Date();
    const category: CatalogCategoryRecord = {
      id: randomUUID(),
      name: payload.name,
      slug: payload.slug,
      description: payload.description ?? null,
      isActive: payload.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.categories.set(category.id, category);
    return { ...category };
  }

  async updateCategory(id: string, payload: UpdateProductCategoryDto) {
    const existingCategory = this.categories.get(id);
    if (!existingCategory) {
      throw new NotFoundException('Product category not found');
    }

    const updatedCategory: CatalogCategoryRecord = {
      ...existingCategory,
      name: payload.name ?? existingCategory.name,
      slug: payload.slug ?? existingCategory.slug,
      description: payload.description ?? existingCategory.description,
      isActive: payload.isActive ?? existingCategory.isActive,
      updatedAt: new Date(),
    };

    this.categories.set(id, updatedCategory);
    return { ...updatedCategory };
  }

  async createProduct(payload: CreateProductDto) {
    const now = new Date();
    const product: CatalogProductRecord = {
      id: randomUUID(),
      categoryId: payload.categoryId,
      name: payload.name,
      slug: payload.slug,
      sku: payload.sku,
      description: payload.description ?? null,
      priceCents: payload.priceCents,
      isActive: payload.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.products.set(product.id, product);
    return { ...product };
  }

  async updateProduct(id: string, payload: UpdateProductDto) {
    const existingProduct = this.products.get(id);
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    const updatedProduct: CatalogProductRecord = {
      ...existingProduct,
      categoryId: payload.categoryId ?? existingProduct.categoryId,
      name: payload.name ?? existingProduct.name,
      slug: payload.slug ?? existingProduct.slug,
      sku: payload.sku ?? existingProduct.sku,
      description: payload.description ?? existingProduct.description,
      priceCents: payload.priceCents ?? existingProduct.priceCents,
      isActive: payload.isActive ?? existingProduct.isActive,
      updatedAt: new Date(),
    };

    this.products.set(id, updatedProduct);
    return { ...updatedProduct };
  }
}
