import { presentInquiryForActor } from '@main-modules/insurance/services/insurance-customer-view';

describe('Insurance staff document projection', () => {
  const inquiry = {
    id: 'inquiry-opaque',
    documents: [{
      id: 'document-opaque',
      inquiryId: 'inquiry-opaque',
      uploadedByUserId: 'uploader-private',
      fileName: 'final-draft-before-reselect.png',
      fileUrl: 'upload://insurance/private/storage-object.png',
      storageKey: 'private/storage-object.png',
      documentType: 'or_cr',
      notes: null,
      createdAt: new Date('2026-08-11T01:00:00.000Z'),
      updatedAt: new Date('2026-08-11T01:01:00.000Z'),
    }],
    activities: [],
  };

  it('returns only safe metadata and the allowlisted authorized route to staff', () => {
    const staff = presentInquiryForActor(inquiry, {
      userId: 'staff-reviewer',
      role: 'service_adviser',
    }) as typeof inquiry & { documents: Array<Record<string, unknown>> };

    expect(staff.documents).toEqual([{
      fileName: 'final-draft-before-reselect.png',
      documentType: 'or_cr',
      notes: null,
      createdAt: inquiry.documents[0].createdAt,
      updatedAt: inquiry.documents[0].updatedAt,
      downloadRoute: '/api/insurance/documents/document-opaque/file',
    }]);
    expect(JSON.stringify(staff.documents)).not.toMatch(/upload:\/\/|storageKey|uploadedByUserId|inquiryId/);
  });

  it('keeps customer documents sanitized without a download route', () => {
    const customer = presentInquiryForActor(inquiry, {
      userId: 'customer-owner',
      role: 'customer',
    }) as { documents: Array<Record<string, unknown>> };

    expect(customer.documents[0]).not.toHaveProperty('downloadRoute');
    expect(customer.documents[0]).not.toHaveProperty('id');
    expect(JSON.stringify(customer.documents)).not.toMatch(/upload:\/\/|storageKey|uploadedByUserId|inquiryId/);
  });
});
