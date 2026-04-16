import type { ApiErrorResponse } from '../shared';

export const loyaltyForbiddenErrorMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Customers can only access or redeem rewards for their own loyalty account.',
  source: 'swagger',
};

export const loyaltyInsufficientPointsErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Insufficient loyalty points for this reward',
  source: 'swagger',
};

export const loyaltyInactiveRewardErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Only active rewards can be redeemed',
  source: 'swagger',
};
