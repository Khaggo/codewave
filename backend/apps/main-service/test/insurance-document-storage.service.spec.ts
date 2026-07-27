import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { BadRequestException } from '@nestjs/common';

import { InsuranceDocumentStorageService } from '../src/modules/insurance/services/insurance-document-storage.service';

const testRuntimeRoot = join(tmpdir(), `codewave-insurance-storage-${process.pid}`);
const backendRuntimeRoot = join(testRuntimeRoot, 'current');
const repoRuntimeRoot = join(testRuntimeRoot, 'legacy');
const testBackendInquiryDirectory = join(backendRuntimeRoot, 'storage-service-spec-backend');
const testRepoInquiryDirectory = join(repoRuntimeRoot, 'storage-service-spec-legacy');
const previousStorageRoot = process.env.INSURANCE_DOCUMENT_STORAGE_ROOT;
const previousLegacyRoot = process.env.INSURANCE_DOCUMENT_LEGACY_ROOT;

describe('InsuranceDocumentStorageService', () => {
  beforeEach(() => {
    process.env.INSURANCE_DOCUMENT_STORAGE_ROOT = backendRuntimeRoot;
    process.env.INSURANCE_DOCUMENT_LEGACY_ROOT = repoRuntimeRoot;
  });

  afterEach(async () => {
    await rm(testRuntimeRoot, { recursive: true, force: true });
  });

  afterAll(() => {
    if (previousStorageRoot === undefined) {
      delete process.env.INSURANCE_DOCUMENT_STORAGE_ROOT;
    } else {
      process.env.INSURANCE_DOCUMENT_STORAGE_ROOT = previousStorageRoot;
    }
    if (previousLegacyRoot === undefined) {
      delete process.env.INSURANCE_DOCUMENT_LEGACY_ROOT;
    } else {
      process.env.INSURANCE_DOCUMENT_LEGACY_ROOT = previousLegacyRoot;
    }
  });

  it('reads legacy insurance uploads stored under the repo-level runtime directory', async () => {
    const storage = new InsuranceDocumentStorageService();
    const storageKey = 'storage-service-spec-legacy/pdf/police-report.pdf';
    const legacyFilePath = join(repoRuntimeRoot, storageKey);
    const pdfBuffer = Buffer.from('%PDF-1.4\nlegacy insurance test\n', 'utf8');

    await mkdir(dirname(legacyFilePath), { recursive: true });
    await writeFile(legacyFilePath, pdfBuffer);

    const document = await storage.readDocument({
      fileUrl: `upload://insurance/${storageKey}`,
      fileName: 'police-report.pdf',
    });

    expect(document.storageKey).toBe(storageKey);
    expect(document.mimeType).toBe('application/pdf');
    expect(document.buffer.equals(pdfBuffer)).toBe(true);
  });

  it('reads insurance uploads stored under the backend runtime directory', async () => {
    const storage = new InsuranceDocumentStorageService();
    const storageKey = 'storage-service-spec-backend/pdf/or-cr.pdf';
    const backendFilePath = join(backendRuntimeRoot, storageKey);
    const pdfBuffer = Buffer.from('%PDF-1.4\nbackend runtime insurance test\n', 'utf8');

    await mkdir(dirname(backendFilePath), { recursive: true });
    await writeFile(backendFilePath, pdfBuffer);

    const document = await storage.readDocument({
      fileUrl: `upload://insurance/${storageKey}`,
      fileName: 'or-cr.pdf',
    });

    expect(document.storageKey).toBe(storageKey);
    expect(document.mimeType).toBe('application/pdf');
    expect(document.buffer.equals(pdfBuffer)).toBe(true);
  });

  it('rejects storage keys that escape the insurance upload root', async () => {
    const storage = new InsuranceDocumentStorageService();

    await expect(
      storage.readDocument({
        fileUrl: 'upload://insurance/../../.env',
        fileName: 'stolen.pdf',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
