import type { ApiErrorResponse } from '../shared';

export const jobOrdersErrorCases: Record<string, ApiErrorResponse[]> = {
  createJobOrder: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'The source booking, customer, vehicle, or staff assignment was not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'A job order already exists for this booking.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Only approved back jobs can create rework job orders.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'A rework job order already exists for this back-job case.',
      source: 'swagger',
    },
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only service advisers or super admins can create job orders.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Job orders can only be created from confirmed bookings.',
      source: 'task',
    },
  ],
  getJobOrderById: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only assigned technicians or staff reviewers can access this job order.',
      source: 'swagger',
    },
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Job order not found.',
      source: 'swagger',
    },
  ],
  updateJobOrderStatus: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only the appropriate staff role can perform this transition.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'The requested job-order status transition is not allowed.',
      source: 'swagger',
    },
    {
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'The job-order status payload is invalid.',
      source: 'swagger',
    },
  ],
  addJobOrderProgress: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only assigned technicians can append progress entries.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'The job order cannot accept the supplied progress evidence.',
      source: 'swagger',
    },
  ],
  addJobOrderPhoto: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only assigned technicians or staff reviewers can add photo evidence.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'The job order cannot accept the supplied photo evidence.',
      source: 'swagger',
    },
  ],
  finalizeJobOrder: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only the responsible service adviser or a super admin can finalize the job order.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'The job order is not ready for invoice generation or QA release is still blocked.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Quality gate is blocked and must be resolved before invoice generation',
      source: 'swagger',
    },
  ],
};
