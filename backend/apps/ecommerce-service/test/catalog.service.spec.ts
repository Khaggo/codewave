import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

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
});
