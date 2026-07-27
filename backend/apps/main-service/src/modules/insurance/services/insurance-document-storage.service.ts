import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { access, mkdir, readFile, readdir, rm, writeFile } from 'fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'path';

type SupportedInsuranceUploadMimeType =
  | 'application/pdf'
  | 'image/gif'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp';

@Injectable()
export class InsuranceDocumentStorageService {
  private readonly backendWorkspaceRoot = resolve(__dirname, '..', '..', '..', '..', '..', '..');
  private readonly repoWorkspaceRoot = resolve(this.backendWorkspaceRoot, '..');
  private readonly currentWorkingDirectoryRoot = resolve(process.cwd());
  private readonly rootDirectory = resolve(
    process.env.INSURANCE_DOCUMENT_STORAGE_ROOT?.trim()
      || join(this.backendWorkspaceRoot, '.runtime', 'uploads', 'insurance-documents'),
  );
  private readonly legacyRootDirectory = resolve(
    process.env.INSURANCE_DOCUMENT_LEGACY_ROOT?.trim()
      || join(this.repoWorkspaceRoot, '.runtime', 'uploads', 'insurance-documents'),
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

  async deleteDocument(storageKey: string) {
    const normalizedStorageKey = String(storageKey ?? '').replace(/\\/g, '/');
    if (!normalizedStorageKey) {
      return;
    }

    for (const rootDirectory of this.resolveCandidateRootDirectories()) {
      const absolutePath = this.resolveContainedPath(rootDirectory, normalizedStorageKey);
      if (!absolutePath) {
        continue;
      }
      await rm(absolutePath, { force: true });
      await this.pruneEmptyDirectories(dirname(absolutePath), rootDirectory);
    }
  }

  async readDocument(payload: { fileUrl: string; fileName: string }) {
    const storageKey = this.resolveStorageKeyFromFileUrl(payload.fileUrl);
    const absolutePath = await this.resolveAbsolutePath(storageKey);
    const buffer = await readFile(absolutePath);

    return {
      storageKey,
      buffer,
      fileName: payload.fileName,
      mimeType: this.resolveMimeTypeFromFileName(payload.fileName),
    };
  }

  private resolveStorageKeyFromFileUrl(fileUrl: string) {
    const normalizedFileUrl = String(fileUrl ?? '').trim();
    const prefix = 'upload://insurance/';

    if (!normalizedFileUrl.startsWith(prefix)) {
      throw new BadRequestException('Insurance document does not use a supported upload storage URL');
    }

    const storageKey = normalizedFileUrl.slice(prefix.length).replace(/\\/g, '/').trim();
    if (!storageKey || storageKey.split('/').includes('..') || isAbsolute(storageKey)) {
      throw new BadRequestException('Insurance document storage key is missing');
    }

    return storageKey;
  }

  private async resolveAbsolutePath(storageKey: string) {
    for (const rootDirectory of this.resolveCandidateRootDirectories()) {
      const absolutePath = this.resolveContainedPath(rootDirectory, storageKey);
      if (!absolutePath) {
        continue;
      }

      try {
        await access(absolutePath);
        return absolutePath;
      } catch {
        continue;
      }
    }

    throw new NotFoundException('Insurance document file not found');
  }

  private resolveContainedPath(rootDirectory: string, storageKey: string) {
    const rootPath = resolve(rootDirectory);
    const absolutePath = resolve(rootPath, storageKey);
    const relativePath = relative(rootPath, absolutePath);

    if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
      return null;
    }

    return absolutePath;
  }

  private resolveMimeTypeFromFileName(fileName: string): SupportedInsuranceUploadMimeType {
    const extension = extname(String(fileName ?? '')).replace('.', '').trim().toLowerCase();

    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        throw new BadRequestException('Stored insurance document has an unsupported file extension');
    }
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

  private resolveCandidateRootDirectories() {
    return [...new Set([
      this.rootDirectory,
      this.legacyRootDirectory,
      join(this.currentWorkingDirectoryRoot, '.runtime', 'uploads', 'insurance-documents'),
    ])];
  }

  private async pruneEmptyDirectories(directoryPath: string, rootDirectory: string) {
    let currentPath = directoryPath;

    while (currentPath.startsWith(rootDirectory)) {
      if (currentPath === rootDirectory) {
        break;
      }

      const entries = await readdir(currentPath).catch(() => null);
      if (entries === null || entries.length > 0) {
        break;
      }

      await rm(currentPath, { recursive: true, force: true }).catch(() => undefined);
      currentPath = dirname(currentPath);
    }
  }
}
