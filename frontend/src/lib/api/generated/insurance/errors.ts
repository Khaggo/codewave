import type { ApiErrorResponse } from '../shared';

export const insuranceErrorCases: Record<string, ApiErrorResponse[]> = {
  createInquiry: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Customers can only create insurance inquiries for their own account.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Vehicle does not belong to the submitted customer.',
      source: 'swagger',
    },
  ],
  updateInquiryStatus: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only service advisers or super admins can review insurance inquiries.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Cannot transition insurance inquiry from submitted to closed',
      source: 'swagger',
    },
  ],
};
