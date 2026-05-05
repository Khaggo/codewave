import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class JobOrderEvidenceStorageService {
  private readonly rootDirectory = join(process.cwd(), '.runtime', 'uploads', 'job-order-evidence');

  async saveImage(payload: {
    jobOrderId: string;
    photoId: string;
    originalFileName: string;
    mimeType: string;
    buffer: Buffer;
  }) {
    const extension = this.resolveExtension(payload.originalFileName, payload.mimeType);
    const relativeDirectory = join(payload.jobOrderId);
    const storageKey = join(relativeDirectory, `${payload.photoId}.${extension}`).replace(/\\/g, '/');
    const absoluteDirectory = join(this.rootDirectory, relativeDirectory);
    const absolutePath = join(this.rootDirectory, storageKey);

    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(absolutePath, payload.buffer);

    return {
      storageKey,
      absolutePath,
    };
  }

  async readImage(storageKey: string) {
    const absolutePath = join(this.rootDirectory, storageKey);

    try {
      return await readFile(absolutePath);
    } catch {
      throw new NotFoundException('Evidence file not found');
    }
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
        throw new InternalServerErrorException('Unsupported evidence file format');
    }
  }
}
