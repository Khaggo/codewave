import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import { join } from 'path';

import {
  JOB_ORDER_EVIDENCE_MAX_BYTES,
  JobOrderEvidenceStorageService,
} from './job-order-evidence-storage.service';

describe('JobOrderEvidenceStorageService', () => {
  const service = new JobOrderEvidenceStorageService();
  const jobOrderId = randomUUID();
  const photoId = randomUUID();
  const uploadDirectory = join(
    process.cwd(),
    '.runtime',
    'uploads',
    'job-order-evidence',
    jobOrderId,
  );

  afterAll(async () => {
    await rm(uploadDirectory, { recursive: true, force: true });
  });

  it('stores and reads a content-verified PNG inside the evidence root', async () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const persisted = await service.saveImage({
      jobOrderId,
      photoId,
      mimeType: 'image/png',
      buffer: pngBuffer,
    });

    expect(persisted.storageKey).toBe(`${jobOrderId}/${photoId}.png`);
    expect(persisted.mimeType).toBe('image/png');
    await expect(service.readImage(persisted.storageKey)).resolves.toEqual({
      buffer: pngBuffer,
      mimeType: 'image/png',
    });
  });

  it('rejects mismatched, unsupported, oversized, and escaping files', async () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);

    await expect(
      service.saveImage({
        jobOrderId,
        photoId: randomUUID(),
        mimeType: 'image/png',
        buffer: jpegBuffer,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.saveImage({
        jobOrderId,
        photoId: randomUUID(),
        mimeType: 'image/svg+xml',
        buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.saveImage({
        jobOrderId,
        photoId: randomUUID(),
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(JOB_ORDER_EVIDENCE_MAX_BYTES + 1),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.readImage('../../.env')).rejects.toBeInstanceOf(NotFoundException);
  });
});
