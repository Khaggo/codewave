export interface ChatbotValidationErrorResponse {
  statusCode: 400;
  message: string[] | string;
  error: 'Bad Request';
}

export interface ChatbotForbiddenErrorResponse {
  statusCode: 403;
  message: string;
  error: 'Forbidden';
}

export interface ChatbotUnauthorizedErrorResponse {
  statusCode: 401;
  message: string;
  error: 'Unauthorized';
}
