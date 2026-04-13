import { Injectable, NotFoundException } from '@nestjs/common';

import { CatalogRepository } from '../repositories/catalog.repository';

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async listProducts() {
    const [products, categories] = await Promise.all([
      this.catalogRepository.listProducts(),
      this.catalogRepository.listCategories(),
    ]);

    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    return products.map((product) => ({
      ...product,
      category: categoriesById.get(product.categoryId) ?? null,
    }));
  }

  async findProductById(id: string) {
    const product = await this.catalogRepository.findProductById(id);
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
    return this.catalogRepository.listCategories();
  }
}
