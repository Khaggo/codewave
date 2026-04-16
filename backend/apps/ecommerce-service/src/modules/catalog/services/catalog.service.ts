import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateProductCategoryDto } from '../dto/create-product-category.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductCategoryDto } from '../dto/update-product-category.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { CatalogRepository } from '../repositories/catalog.repository';

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async listProducts() {
    const [products, categories] = await Promise.all([
      this.catalogRepository.listProducts({ activeOnly: true }),
      this.catalogRepository.listCategories(),
    ]);

    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    return products.map((product) => ({
      ...product,
      category: categoriesById.get(product.categoryId) ?? null,
    }));
  }

  async findProductById(id: string) {
    const product = await this.catalogRepository.findProductById(id, { activeOnly: true });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const category = await this.catalogRepository.findCategoryById(product.categoryId);
    return {
      ...product,
      category,
    };
  }

  async listCategories() {
    return this.catalogRepository.listCategories({ activeOnly: true });
  }

  async createCategory(payload: CreateProductCategoryDto) {
    await this.assertCategorySlugAvailable(payload.slug);
    return this.catalogRepository.createCategory(payload);
  }

  async updateCategory(id: string, payload: UpdateProductCategoryDto) {
    const existingCategory = await this.catalogRepository.findCategoryById(id);
    if (!existingCategory) {
      throw new NotFoundException('Product category not found');
    }

    if (payload.slug && payload.slug !== existingCategory.slug) {
      await this.assertCategorySlugAvailable(payload.slug, id);
    }

    return this.catalogRepository.updateCategory(id, payload);
  }

  async createProduct(payload: CreateProductDto) {
    await this.assertCategoryExists(payload.categoryId);
    await this.assertProductSlugAvailable(payload.slug);
    await this.assertProductSkuAvailable(payload.sku);

    const product = await this.catalogRepository.createProduct(payload);
    return this.hydrateProduct(product);
  }

  async updateProduct(id: string, payload: UpdateProductDto) {
    const existingProduct = await this.catalogRepository.findProductById(id);
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    if (payload.categoryId) {
      await this.assertCategoryExists(payload.categoryId);
    }

    if (payload.slug && payload.slug !== existingProduct.slug) {
      await this.assertProductSlugAvailable(payload.slug, id);
    }

    if (payload.sku && payload.sku !== existingProduct.sku) {
      await this.assertProductSkuAvailable(payload.sku, id);
    }

    const product = await this.catalogRepository.updateProduct(id, payload);
    return this.hydrateProduct(product);
  }

  private async hydrateProduct(product: {
    categoryId: string;
  } & Record<string, unknown>) {
    const category = await this.catalogRepository.findCategoryById(product.categoryId);
    return {
      ...product,
      category,
    };
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await this.catalogRepository.findCategoryById(categoryId);
    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    return category;
  }

  private async assertCategorySlugAvailable(slug: string, currentCategoryId?: string) {
    const category = await this.catalogRepository.findCategoryBySlug(slug);
    if (category && category.id !== currentCategoryId) {
      throw new ConflictException('Product category slug already exists');
    }
  }

  private async assertProductSlugAvailable(slug: string, currentProductId?: string) {
    const product = await this.catalogRepository.findProductBySlug(slug);
    if (product && product.id !== currentProductId) {
      throw new ConflictException('Product slug already exists');
    }
  }

  private async assertProductSkuAvailable(sku: string, currentProductId?: string) {
    const product = await this.catalogRepository.findProductBySku(sku);
    if (product && product.id !== currentProductId) {
      throw new ConflictException('Product SKU already exists');
    }
  }
}
