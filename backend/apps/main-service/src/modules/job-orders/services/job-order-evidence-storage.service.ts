import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { isAbsolute, join, relative, resolve } from 'path';

type SupportedJobOrderImageMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif';

export const JOB_ORDER_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class JobOrderEvidenceStorageService {
  private readonly rootDirectory = join(process.cwd(), '.runtime', 'uploads', 'job-order-evidence');

  async saveImage(payload: {
    jobOrderId: string;
    photoId: string;
    mimeType: string;
    buffer: Buffer;
  }) {
    if (payload.buffer.length > JOB_ORDER_EVIDENCE_MAX_BYTES) {
      throw new BadRequestException('Job-order evidence images must be 10 MB or smaller');
    }

    const mimeType = this.validateImageContent(payload.mimeType, payload.buffer);
    const extension = this.resolveExtension(mimeType);
    const relativeDirectory = join(payload.jobOrderId);
    const storageKey = join(relativeDirectory, `${payload.photoId}.${extension}`).replace(/\\/g, '/');
    const absoluteDirectory = join(this.rootDirectory, relativeDirectory);
    const absolutePath = join(this.rootDirectory, storageKey);

    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(absolutePath, payload.buffer);

    return {
      storageKey,
      absolutePath,
      mimeType,
    };
  }

  async readImage(storageKey: string) {
    const rootPath = resolve(this.rootDirectory);
    const absolutePath = resolve(rootPath, String(storageKey ?? ''));
    const relativePath = relative(rootPath, absolutePath);

    if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new NotFoundException('Evidence file not found');
    }

    try {
      const buffer = await readFile(absolutePath);
      const mimeType = this.detectMimeType(buffer);
      if (!mimeType) {
        throw new NotFoundException('Evidence file not found');
      }

      return { buffer, mimeType };
    } catch {
      throw new NotFoundException('Evidence file not found');
    }
  }

  private validateImageContent(
    mimeType: string,
    buffer: Buffer,
  ): SupportedJobOrderImageMimeType {
    const normalizedMimeType = this.normalizeMimeType(mimeType);
    const detectedMimeType = this.detectMimeType(buffer);

    if (!detectedMimeType) {
      throw new BadRequestException('Uploaded file content is not a supported image');
    }

    if (normalizedMimeType !== detectedMimeType) {
      throw new BadRequestException('Uploaded file content does not match the declared image type');
    }

    return detectedMimeType;
  }

  private resolveExtension(mimeType: SupportedJobOrderImageMimeType) {
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
        return 'jpg';
      default:
        throw new InternalServerErrorException('Unsupported evidence file format');
    }
  }

  private normalizeMimeType(mimeType: string) {
    const normalizedMimeType = String(mimeType).trim().toLowerCase();
    return normalizedMimeType === 'image/jpg'
      ? 'image/jpeg'
      : normalizedMimeType as SupportedJobOrderImageMimeType;
  }

  private detectMimeType(buffer: Buffer): SupportedJobOrderImageMimeType | null {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    if (buffer.length >= 6) {
      const gifHeader = buffer.toString('ascii', 0, 6);
      if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
        return 'image/gif';
      }
    }

    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }

    if (buffer.length >= 16 && buffer.toString('ascii', 4, 8) === 'ftyp') {
      const brands = new Set<string>([buffer.toString('ascii', 8, 12)]);
      for (let offset = 16; offset + 4 <= buffer.length; offset += 4) {
        brands.add(buffer.toString('ascii', offset, offset + 4));
      }

      if (['heic', 'heix', 'hevc', 'hevx'].some((brand) => brands.has(brand))) {
        return 'image/heic';
      }
      if (['heif', 'heim', 'heis', 'mif1', 'msf1'].some((brand) => brands.has(brand))) {
        return 'image/heif';
      }
    }

    return null;
  }
}
