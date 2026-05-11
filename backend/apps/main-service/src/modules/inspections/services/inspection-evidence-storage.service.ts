import { randomUUID } from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class InspectionEvidenceStorageService {
  private readonly rootDirectory = join(
    process.cwd(),
    '.runtime',
    'uploads',
    'inspection-evidence',
  );

  async saveImage(payload: {
    vehicleId: string;
    slot: string;
    originalFileName: string;
    mimeType: string;
    buffer: Buffer;
  }) {
    const extension = this.resolveExtension(payload.originalFileName, payload.mimeType);
    const safeSlot = this.normalizeSlotSegment(payload.slot);
    const relativeDirectory = join(payload.vehicleId, safeSlot);
    const storageKey = join(relativeDirectory, `${randomUUID()}.${extension}`).replace(/\\/g, '/');
    const absoluteDirectory = join(this.rootDirectory, relativeDirectory);
    const absolutePath = join(this.rootDirectory, storageKey);

    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(absolutePath, payload.buffer);

    return {
      storageKey,
      attachmentRef: `upload://vehicle/${storageKey}`,
    };
  }

  private normalizeSlotSegment(slot: string) {
    const normalized = String(slot ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'general';
  }

  private resolveExtension(fileName: string, mimeType: string) {
    const match = /\.([a-zA-Z0-9]+)$/.exec(String(fileName ?? '').trim());
    if (match?.[1]) {
      return match[1].toLowerCase();
    }

    switch (mimeType) {
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/heic':
        return 'heic';
      case 'image/heif':
        return 'heif';
      case 'image/gif':
        return 'gif';
      case 'image/jpeg':
      case 'image/jpg':
        return 'jpg';
      default:
        throw new InternalServerErrorException('Unsupported inspection evidence file format');
    }
  }
}
