import type { ApiErrorResponse } from '../shared';

export const notificationErrorCases: Record<string, ApiErrorResponse[]> = {
  getNotificationPreferences: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Customers can only access their own notification preferences.',
      source: 'swagger',
    },
  ],
  updateNotificationPreferences: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Customers can only manage their own notification preferences.',
      source: 'swagger',
    },
  ],
  listNotifications: [
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Customers can only access their own notification history.',
      source: 'swagger',
    },
  ],
};
