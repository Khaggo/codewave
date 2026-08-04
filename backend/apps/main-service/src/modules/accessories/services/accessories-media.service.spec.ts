import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { AccessoriesMediaService } from './accessories-media.service';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const admin = { userId: 'admin-1', role: 'super_admin' as const };
const customer = { userId: 'customer-1', role: 'customer' as const };
const metadata = {
  productId: '11111111-1111-4111-8111-111111111111',
  altText: 'White accessory light',
  displayOrder: 0,
};

describe('AccessoriesMediaService security boundary', () => {
  const config = {
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  };
  const repository = {
    createMedia: jest.fn(),
    findMedia: jest.fn(),
  };
  const service = new AccessoriesMediaService(config as never, repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects customer uploads before persistence', async () => {
    await expect(
      service.upload(
        { buffer: png, size: png.length, mimetype: 'image/png', originalname: 'light.png' },
        metadata,
        customer,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.createMedia).not.toHaveBeenCalled();
  });

  it('rejects oversized files without allocating or persisting their declared size', async () => {
    await expect(
      service.upload(
        {
          buffer: png,
          size: 8 * 1024 * 1024 + 1,
          mimetype: 'image/png',
          originalname: 'light.png',
        },
        metadata,
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createMedia).not.toHaveBeenCalled();
  });

  it('rejects upload metadata that does not match the received bytes', async () => {
    await expect(
      service.upload(
        {
          buffer: png,
          size: png.length + 1,
          mimetype: 'image/png',
          originalname: 'light.png',
        },
        metadata,
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createMedia).not.toHaveBeenCalled();
  });

  it('rejects spoofed MIME declarations', async () => {
    await expect(
      service.upload(
        { buffer: png, size: png.length, mimetype: 'image/jpeg', originalname: 'light.jpg' },
        metadata,
        admin,
      ),
    ).rejects.toThrow('does not match');
    expect(repository.createMedia).not.toHaveBeenCalled();
  });

  it('rejects unsafe original filenames even though storage keys are server-generated', async () => {
    await expect(
      service.upload(
        {
          buffer: png,
          size: png.length,
          mimetype: 'image/png',
          originalname: '..\\private.png',
        },
        metadata,
        admin,
      ),
    ).rejects.toThrow('filename is unsafe');
    expect(repository.createMedia).not.toHaveBeenCalled();
  });

  it('limits customer reads to published product media while staff may inspect drafts', async () => {
    repository.findMedia.mockResolvedValue(null);

    await expect(service.read('media-1', customer)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findMedia).toHaveBeenNthCalledWith(1, 'media-1', false);

    await expect(service.read('media-1', admin)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findMedia).toHaveBeenNthCalledWith(2, 'media-1', true);
  });
});
