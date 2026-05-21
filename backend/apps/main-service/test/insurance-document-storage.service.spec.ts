import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';

import { InsuranceDocumentStorageService } from '../src/modules/insurance/services/insurance-document-storage.service';

const backendWorkspaceRoot = resolve(__dirname, '..', '..', '..');
const repoWorkspaceRoot = resolve(backendWorkspaceRoot, '..');
const backendRuntimeRoot = join(backendWorkspaceRoot, '.runtime', 'uploads', 'insurance-documents');
const repoRuntimeRoot = join(repoWorkspaceRoot, '.runtime', 'uploads', 'insurance-documents');
const testBackendInquiryDirectory = join(backendRuntimeRoot, 'storage-service-spec-backend');
const testRepoInquiryDirectory = join(repoRuntimeRoot, 'storage-service-spec-legacy');

describe('InsuranceDocumentStorageService', () => {
  afterEach(async () => {
    await rm(testBackendInquiryDirectory, { recursive: true, force: true });
    await rm(testRepoInquiryDirectory, { recursive: true, force: true });
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
});
