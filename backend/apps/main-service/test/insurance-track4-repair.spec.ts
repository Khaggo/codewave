import { ConflictException } from '@nestjs/common';

import { InsuranceRepository } from '@main-modules/insurance/repositories/insurance.repository';
import {
  getInsuranceRequirements,
  normalizeInquiryDocumentStatus,
  presentInquiryForActor,
} from '@main-modules/insurance/services/insurance-customer-view';
import { InsuranceService } from '@main-modules/insurance/services/insurance.service';
import { resolveInsuranceRequirements } from '@main-modules/insurance/services/insurance-workflow-policy';

const baselineClaimDocuments = [
  { documentType: 'or_cr' },
  { documentType: 'policy' },
  { documentType: 'valid_id' },
  { documentType: 'photo' },
];

const buildService = (insuranceRepository: Record<string, jest.Mock>) =>
  new InsuranceService(
    insuranceRepository as unknown as InsuranceRepository,
    {
      findById: jest.fn().mockImplementation(async (id: string) => ({
        id,
        role: id.startsWith('staff') ? 'service_adviser' : 'customer',
        isActive: true,
      })),
    } as never,
    {
      findById: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'customer-1' }),
    } as never,
  );

describe('Insurance Track 4 repair policy', () => {
  it('blocks requested police report advancement until the file is uploaded', async () => {
    const inquiry = {
      id: 'inquiry-1',
      userId: 'customer-1',
      vehicleId: 'vehicle-1',
      inquiryType: 'comprehensive' as const,
      purpose: 'claim' as const,
      subject: 'Guided claim assistance',
      description: 'Customer reported visible collision damage.',
      incidentOccurredAt: new Date('2026-08-01T02:00:00.000Z'),
      incidentLocation: 'Quezon City',
      status: 'needs_documents' as const,
      documentStatus: 'complete',
      documents: [...baselineClaimDocuments],
      activities: [{ action: 'document_requested', documentType: 'police_report' }],
    };
    const repository = {
      findById: jest.fn().mockImplementation(async () => inquiry),
      updateStatus: jest.fn().mockResolvedValue({ ...inquiry, status: 'under_review' }),
    };
    const service = buildService(repository);

    await expect(service.updateStatus(
      'inquiry-1',
      { status: 'under_review' },
      { userId: 'staff-1', role: 'service_adviser' },
    )).rejects.toBeInstanceOf(ConflictException);

    inquiry.documents.push({ documentType: 'police_report' });
    await expect(service.updateStatus(
      'inquiry-1',
      { status: 'under_review' },
      { userId: 'staff-1', role: 'service_adviser' },
    )).resolves.toEqual(expect.objectContaining({ status: 'under_review' }));
  });

  it('keeps resolver display, counts, and completion in agreement', () => {
    const activities = [{ action: 'document_requested', documentType: 'police_report' }];
    const canonical = resolveInsuranceRequirements({
      purpose: 'claim',
      documents: baselineClaimDocuments,
      activities,
    });
    const display = getInsuranceRequirements(
      { purpose: 'claim' },
      ['police_report'],
      baselineClaimDocuments,
    );
    const normalized = normalizeInquiryDocumentStatus({
      purpose: 'claim',
      documentStatus: 'complete',
      documents: baselineClaimDocuments,
      activities,
    });

    expect(canonical.documentCount).toBe(4);
    expect(display.outstandingDocumentTypes).toEqual(canonical.outstandingDocumentTypes);
    expect(normalized.documentStatus).toBe(canonical.documentStatus);
    expect(normalized.documentCount).toBe(canonical.documentCount);
  });

  it('projects customer documents without technical identifiers or storage values', () => {
    const inquiry = {
      id: 'inquiry-1',
      documents: [{
        id: 'document-internal-id',
        inquiryId: 'inquiry-1',
        fileName: 'policy.pdf',
        fileUrl: 'upload://insurance/inquiry-1/pdf/private-key.pdf',
        storageKey: 'inquiry-1/pdf/private-key.pdf',
        sourceId: 'source-internal-id',
        documentType: 'policy',
        uploadedByUserId: 'customer-1',
      }],
      activities: [],
    };
    const customer = presentInquiryForActor(inquiry, { userId: 'customer-1', role: 'customer' });
    const serialized = JSON.stringify(customer);

    expect(serialized).not.toContain('upload://');
    expect(serialized).not.toContain('storageKey');
    expect(serialized).not.toContain('document-internal-id');
    expect(serialized).not.toContain('source-internal-id');
  });

  it('reuses equivalent offset timestamps and conflicts on a different instant', async () => {
    const existing = {
      id: 'inquiry-1',
      userId: 'customer-1',
      vehicleId: 'vehicle-1',
      clientRequestId: '11111111-1111-4111-8111-111111111111',
      inquiryType: 'comprehensive',
      purpose: 'claim',
      subject: 'Claim assistance',
      description: 'Narrative',
      incidentOccurredAt: new Date('2026-08-01T02:00:00.000Z'),
      incidentLocation: 'Quezon City',
      documents: [],
      activities: [],
    };
    const repository = {
      findByClientRequestId: jest.fn().mockResolvedValue(existing),
      create: jest.fn(),
    };
    const service = buildService(repository);
    const payload = {
      userId: 'customer-1',
      vehicleId: 'vehicle-1',
      clientRequestId: existing.clientRequestId,
      inquiryType: 'comprehensive' as const,
      purpose: 'claim' as const,
      subject: 'Claim assistance',
      description: 'Narrative',
      incidentOccurredAt: '2026-08-01T10:00:00+08:00',
      incidentLocation: 'Quezon City',
    };

    await expect(service.create(payload, { userId: 'customer-1', role: 'customer' }))
      .resolves.toEqual(expect.objectContaining({ id: 'inquiry-1' }));
    await expect(service.create(
      { ...payload, incidentOccurredAt: '2026-08-01T10:01:00+08:00' },
      { userId: 'customer-1', role: 'customer' },
    )).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects same-status workflow writes and uploads for terminal inquiries', async () => {
    const terminal = {
      id: 'inquiry-1',
      userId: 'customer-1',
      status: 'closed' as const,
      purpose: 'quotation' as const,
      documents: [],
      activities: [],
    };
    const repository = {
      findById: jest.fn().mockResolvedValue(terminal),
      updateWorkflow: jest.fn(),
      addUploadedDocument: jest.fn(),
    };
    const service = buildService(repository);

    await expect(service.updateWorkflow(
      'inquiry-1',
      { status: 'closed' },
      { userId: 'staff-1', role: 'service_adviser' },
    )).rejects.toBeInstanceOf(ConflictException);
    await expect(service.uploadDocument(
      'inquiry-1',
      { documentType: 'other' },
      { originalname: 'note.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-') },
      { userId: 'customer-1', role: 'customer' },
    )).rejects.toBeInstanceOf(ConflictException);
  });
});
