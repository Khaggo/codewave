import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CatalogRepository } from '@ecommerce-modules/catalog/repositories/catalog.repository';
import { CatalogService } from '@ecommerce-modules/catalog/services/catalog.service';

describe('CatalogService', () => {
  it('returns products joined with their bootstrap category metadata', async () => {
    const catalogRepository = {
      listProducts: jest.fn().mockResolvedValue([
        {
          id: 'product-1',
          categoryId: 'category-1',
          name: 'Premium Engine Oil 5W-30',
          slug: 'premium-engine-oil-5w30',
          sku: 'ENG-OIL-5W30',
          description: 'Bootstrap product',
          priceCents: 189900,
          isActive: true,
          createdAt: new Date('2026-05-12T03:05:00.000Z'),
          updatedAt: new Date('2026-05-12T03:05:00.000Z'),
        },
      ]),
      listCategories: jest.fn().mockResolvedValue([
        {
          id: 'category-1',
          name: 'Engine Parts',
          slug: 'engine-parts',
          description: 'Bootstrap category',
          isActive: true,
          createdAt: new Date('2026-05-12T03:00:00.000Z'),
          updatedAt: new Date('2026-05-12T03:00:00.000Z'),
        },
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: CatalogRepository, useValue: catalogRepository },
      ],
    }).compile();

    const service = moduleRef.get(CatalogService);

    const result = await service.listProducts();

    expect(catalogRepository.listProducts).toHaveBeenCalled();
    expect(catalogRepository.listCategories).toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        id: 'product-1',
        category: expect.objectContaining({
          id: 'category-1',
          name: 'Engine Parts',
        }),
      }),
    ]);
  });

  it('throws not found when a bootstrap product is missing', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: CatalogRepository,
          useValue: {
            findProductById: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(CatalogService);

    await expect(service.findProductById('missing-product')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a category when the slug is available', async () => {
    const createdCategory = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Filters',
      slug: 'filters',
      description: 'Filters and related consumables.',
      isActive: true,
      createdAt: new Date('2026-05-13T01:00:00.000Z'),
      updatedAt: new Date('2026-05-13T01:00:00.000Z'),
    };
    const catalogRepository = {
      findCategoryBySlug: jest.fn().mockResolvedValue(null),
      createCategory: jest.fn().mockResolvedValue(createdCategory),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: CatalogRepository, useValue: catalogRepository },
      ],
    }).compile();

    const service = moduleRef.get(CatalogService);

    await expect(
      service.createCategory({
        name: 'Filters',
        slug: 'filters',
        description: 'Filters and related consumables.',
      }),
    ).resolves.toEqual(createdCategory);
  });

  it('rejects duplicate category slugs', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: CatalogRepository,
          useValue: {
            findCategoryBySlug: jest.fn().mockResolvedValue({
              id: '11111111-1111-4111-8111-111111111111',
              slug: 'engine-parts',
            }),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(CatalogService);

    await expect(
      service.createCategory({
        name: 'Engine Parts Duplicate',
        slug: 'engine-parts',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a product and hydrates it with category metadata', async () => {
    const category = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Engine Parts',
      slug: 'engine-parts',
      description: 'Bootstrap category',
      isActive: true,
      createdAt: new Date('2026-05-12T03:00:00.000Z'),
      updatedAt: new Date('2026-05-12T03:00:00.000Z'),
    };
    const createdProduct = {
      id: '44444444-4444-4444-8444-444444444444',
      categoryId: category.id,
      name: 'Cabin Filter',
      slug: 'cabin-filter',
      sku: 'CABIN-FILTER-01',
      description: 'Fresh-air cabin filter.',
      priceCents: 64900,
      isActive: true,
      createdAt: new Date('2026-05-13T01:05:00.000Z'),
      updatedAt: new Date('2026-05-13T01:05:00.000Z'),
    };
    const catalogRepository = {
      findCategoryById: jest.fn().mockResolvedValue(category),
      findProductBySlug: jest.fn().mockResolvedValue(null),
      findProductBySku: jest.fn().mockResolvedValue(null),
      createProduct: jest.fn().mockResolvedValue(createdProduct),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: CatalogRepository, useValue: catalogRepository },
      ],
    }).compile();

    const service = moduleRef.get(CatalogService);

    await expect(
      service.createProduct({
        categoryId: category.id,
        name: 'Cabin Filter',
        slug: 'cabin-filter',
        sku: 'CABIN-FILTER-01',
        description: 'Fresh-air cabin filter.',
        priceCents: 64900,
      }),
    ).resolves.toEqual({
      ...createdProduct,
      category,
    });
  });

  it('rejects duplicate product SKUs during update', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: CatalogRepository,
          useValue: {
            findProductById: jest.fn().mockResolvedValue({
              id: 'product-1',
              categoryId: 'category-1',
              name: 'Premium Engine Oil 5W-30',
              slug: 'premium-engine-oil-5w30',
              sku: 'ENG-OIL-5W30',
            }),
            findProductBySku: jest.fn().mockResolvedValue({
              id: 'product-2',
              sku: 'FILTER-01',
            }),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(CatalogService);

    await expect(
      service.updateProduct('product-1', {
        sku: 'FILTER-01',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
