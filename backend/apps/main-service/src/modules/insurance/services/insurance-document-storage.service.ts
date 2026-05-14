import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';

type SupportedInsuranceUploadMimeType =
  | 'application/pdf'
  | 'image/gif'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp';

@Injectable()
export class InsuranceDocumentStorageService {
  private readonly rootDirectory = join(
    process.cwd(),
    '.runtime',
    'uploads',
    'insurance-documents',
  );

  async saveDocument(payload: {
    inquiryId: string;
    mimeType?: string;
    originalName: string;
    buffer: Buffer;
  }) {
    const detectedMimeType = this.detectMimeType(payload.buffer);
    if (!detectedMimeType) {
      throw new BadRequestException('Uploaded file content is not a supported PDF or image');
    }

    const normalizedMimeType = payload.mimeType ? this.normalizeMimeType(payload.mimeType) : null;
    if (normalizedMimeType && normalizedMimeType !== detectedMimeType) {
      throw new BadRequestException('Uploaded file content does not match the declared file type');
    }

    const extension = this.resolveExtension(payload.originalName, detectedMimeType);
    const relativeDirectory = join(
      payload.inquiryId,
      detectedMimeType === 'application/pdf' ? 'pdf' : 'image',
    );
    const storageKey = join(relativeDirectory, `${randomUUID()}.${extension}`).replace(/\\/g, '/');
    const absoluteDirectory = join(this.rootDirectory, relativeDirectory);
    const absolutePath = join(this.rootDirectory, storageKey);

    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(absolutePath, payload.buffer);

    return {
      storageKey,
      fileUrl: `upload://insurance/${storageKey}`,
    };
  }

  private normalizeMimeType(mimeType: string) {
    const normalizedMimeType = String(mimeType).trim().toLowerCase();

    switch (normalizedMimeType) {
      case 'image/jpg':
        return 'image/jpeg';
      default:
        return normalizedMimeType as SupportedInsuranceUploadMimeType;
    }
  }

  private resolveExtension(originalName: string, mimeType: SupportedInsuranceUploadMimeType) {
    const originalExtension = extname(originalName).replace('.', '').trim().toLowerCase();

    if (originalExtension) {
      if (originalExtension === 'jpg' && mimeType === 'image/jpeg') {
        return 'jpg';
      }

      if (originalExtension === 'jpeg' && mimeType === 'image/jpeg') {
        return 'jpeg';
      }

      if (
        (originalExtension === 'pdf' && mimeType === 'application/pdf') ||
        (originalExtension === 'png' && mimeType === 'image/png') ||
        (originalExtension === 'gif' && mimeType === 'image/gif') ||
        (originalExtension === 'webp' && mimeType === 'image/webp')
      ) {
        return originalExtension;
      }
    }

    switch (mimeType) {
      case 'application/pdf':
        return 'pdf';
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
    }

    throw new InternalServerErrorException('Unsupported insurance document file format');
  }

  private detectMimeType(buffer: Buffer): SupportedInsuranceUploadMimeType | null {
    if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') {
      return 'application/pdf';
    }

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

    return null;
  }
}
