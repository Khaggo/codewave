import {
  accessoryCatalogAudits,
  accessoryFitmentRules,
  accessoryInventoryBalances,
  accessoryProductMedia,
  accessoryVariants,
} from '../schemas/accessories.schema';
import { AccessoriesCatalogRepository } from './accessories-catalog.repository';

const actor = { userId: 'staff-1', role: 'super_admin' as const };

const createHarness = () => {
  const writes: Array<{ table: unknown; values: unknown }> = [];
  const records = {
    variant: { id: 'variant-1', productId: 'product-1', sku: 'LIGHT-1' },
    fitment: { id: 'fitment-1', variantId: 'variant-1', status: 'universal' },
    media: { id: 'media-1', productId: 'product-1', storageKey: 'products/media-1.png' },
  };
  const tx = {
    insert: jest.fn((table: unknown) => ({
      values: jest.fn((values: unknown) => {
        writes.push({ table, values });
        if (table === accessoryVariants) return { returning: async () => [records.variant] };
        if (table === accessoryFitmentRules) return { returning: async () => [records.fitment] };
        if (table === accessoryProductMedia) return { returning: async () => [records.media] };
        if (table === accessoryInventoryBalances) {
          return { onConflictDoNothing: async () => undefined };
        }
        return Promise.resolve();
      }),
    })),
  };
  const db = { transaction: jest.fn((callback) => callback(tx)) };
  return { repository: new AccessoriesCatalogRepository(db as never), writes, records };
};

describe('AccessoriesCatalogRepository catalog audits', () => {
  it('atomically audits variant creation', async () => {
    const { repository, writes, records } = createHarness();

    await expect(
      repository.createVariant({
        actor,
        productId: 'product-1',
        sku: 'LIGHT-1',
        name: 'Custom light',
        priceCents: 150000,
      }),
    ).resolves.toEqual(records.variant);

    expect(writes).toContainEqual({
      table: accessoryCatalogAudits,
      values: expect.objectContaining({
        entityType: 'accessory_variant',
        entityId: records.variant.id,
        action: 'created',
        actorUserId: actor.userId,
        snapshot: records.variant,
      }),
    });
  });

  it('atomically audits fitment creation', async () => {
    const { repository, writes, records } = createHarness();

    await expect(
      repository.createFitment({
        actor,
        values: { variantId: 'variant-1', status: 'universal' },
      }),
    ).resolves.toEqual(records.fitment);

    expect(writes).toContainEqual({
      table: accessoryCatalogAudits,
      values: expect.objectContaining({
        entityType: 'accessory_fitment',
        entityId: records.fitment.id,
        action: 'created',
        actorUserId: actor.userId,
        snapshot: records.fitment,
      }),
    });
  });

  it('atomically audits media creation', async () => {
    const { repository, writes, records } = createHarness();

    await expect(
      repository.createMedia({
        actor,
        values: {
          id: 'media-1',
          productId: 'product-1',
          storageKey: 'products/media-1.png',
          publicUrl: '/api/accessories/media/media-1',
          mimeType: 'image/png',
          byteSize: 128,
          altText: 'Custom light',
          displayOrder: 0,
        },
      }),
    ).resolves.toEqual(records.media);

    expect(writes).toContainEqual({
      table: accessoryCatalogAudits,
      values: expect.objectContaining({
        entityType: 'accessory_media',
        entityId: records.media.id,
        action: 'created',
        actorUserId: actor.userId,
        snapshot: records.media,
      }),
    });
  });
});
