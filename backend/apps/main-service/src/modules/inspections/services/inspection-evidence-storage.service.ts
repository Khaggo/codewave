import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

type SupportedInspectionImageMimeType =
  | 'image/avif'
  | 'image/gif'
  | 'image/heic'
  | 'image/heif'
  | 'image/jpeg'
  | 'image/png'
  | 'image/svg+xml'
  | 'image/webp'
  | 'image/x-icon';

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
    mimeType: string;
    buffer: Buffer;
  }) {
    const detectedMimeType = this.validateImageContent(payload.mimeType, payload.buffer);
    const extension = this.resolveExtension(detectedMimeType);
    const safeSlot = this.normalizeSlotSegment(payload.slot);
    const relativeDirectory = join(payload.vehicleId, safeSlot);
    const storageKey = join(relativeDirectory, `${randomUUID()}.${extension}`).replace(/\\/g, '/');
    const absoluteDirectory = join(this.rootDirectory, relativeDirectory);
    const absolutePath = join(this.rootDirectory, storageKey);

    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(absolutePath, payload.buffer);

    return {
      slot: safeSlot,
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

  private validateImageContent(mimeType: string, buffer: Buffer): SupportedInspectionImageMimeType {
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

  private resolveExtension(mimeType: SupportedInspectionImageMimeType) {
    const normalizedMimeType = this.normalizeMimeType(mimeType);

    switch (normalizedMimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      case 'image/avif':
        return 'avif';
      case 'image/heic':
        return 'heic';
      case 'image/heif':
        return 'heif';
      case 'image/svg+xml':
        return 'svg';
      case 'image/x-icon':
        return 'ico';
    }

    throw new InternalServerErrorException('Unsupported inspection evidence file format');
  }

  private normalizeMimeType(mimeType: string) {
    const normalizedMimeType = String(mimeType).trim().toLowerCase();

    switch (normalizedMimeType) {
      case 'image/jpg':
        return 'image/jpeg';
      case 'image/vnd.microsoft.icon':
        return 'image/x-icon';
      default:
        return normalizedMimeType as SupportedInspectionImageMimeType;
    }
  }

  private detectMimeType(buffer: Buffer): SupportedInspectionImageMimeType | null {
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

    if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
      return 'image/x-icon';
    }

    const maybeSvg = buffer.toString('utf8', 0, Math.min(buffer.length, 512)).trimStart();
    if (
      maybeSvg.startsWith('<svg') ||
      (maybeSvg.startsWith('<?xml') && maybeSvg.includes('<svg'))
    ) {
      return 'image/svg+xml';
    }

    const isoMimeType = this.detectIsoBaseMediaImageMimeType(buffer);
    if (isoMimeType) {
      return isoMimeType;
    }

    return null;
  }

  private detectIsoBaseMediaImageMimeType(buffer: Buffer): SupportedInspectionImageMimeType | null {
    if (buffer.length < 16 || buffer.toString('ascii', 4, 8) !== 'ftyp') {
      return null;
    }

    const brands = new Set<string>();
    brands.add(buffer.toString('ascii', 8, 12));

    for (let offset = 16; offset + 4 <= buffer.length; offset += 4) {
      brands.add(buffer.toString('ascii', offset, offset + 4));
    }

    if (brands.has('avif') || brands.has('avis')) {
      return 'image/avif';
    }

    if (brands.has('heic') || brands.has('heix') || brands.has('hevc') || brands.has('hevx')) {
      return 'image/heic';
    }

    if (brands.has('heif') || brands.has('heim') || brands.has('heis') || brands.has('mif1') || brands.has('msf1')) {
      return 'image/heif';
    }

    return null;
  }
}
