import { Injectable, NotFoundException } from '@nestjs/common';

import { CatalogRepository } from '@ecommerce-modules/catalog/repositories/catalog.repository';

import { CreateInventoryAdjustmentDto } from '../dto/create-inventory-adjustment.dto';
import { UpdateInventoryPolicyDto } from '../dto/update-inventory-policy.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async listProducts() {
    const [products, categories] = await Promise.all([
      this.catalogRepository.listProducts(),
      this.catalogRepository.listCategories(),
    ]);

    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    return products.map((product) => this.toInventoryProduct(product, categoriesById.get(product.categoryId)?.name));
  }

  async findProductById(productId: string) {
    const product = await this.catalogRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const category = await this.catalogRepository.findCategoryById(product.categoryId);
    return this.toInventoryProduct(product, category?.name);
  }

  async updatePolicy(productId: string, payload: UpdateInventoryPolicyDto) {
    const product = await this.catalogRepository.updateInventoryFields(productId, {
      quantityOnHand: payload.quantityOnHand,
      reorderThreshold: payload.reorderThreshold,
    });
    const category = await this.catalogRepository.findCategoryById(product.categoryId);
    return this.toInventoryProduct(product, category?.name);
  }

  async createAdjustment(productId: string, payload: CreateInventoryAdjustmentDto) {
    const product = await this.catalogRepository.adjustInventoryQuantity(productId, payload.quantityDelta);
    const category = await this.catalogRepository.findCategoryById(product.categoryId);
    return this.toInventoryProduct(product, category?.name);
  }

  private toInventoryProduct(product: any, categoryLabel?: string | null) {
    const quantityOnHand = Number(product.quantityOnHand ?? 0);
    const reorderThreshold = Number(product.reorderThreshold ?? 0);

    let stockState: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (quantityOnHand <= 0) {
      stockState = 'out_of_stock';
    } else if (quantityOnHand <= reorderThreshold) {
      stockState = 'low_stock';
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      categoryLabel: categoryLabel ?? 'Uncategorized',
      priceCents: product.priceCents,
      isActive: product.isActive,
      quantityOnHand,
      reorderThreshold,
      stockState,
      updatedAt: product.updatedAt,
    };
  }
}
