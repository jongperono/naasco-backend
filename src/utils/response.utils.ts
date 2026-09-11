import type { Context } from 'hono';

/**
 * Standard API response utilities
 */

export interface SuccessResponse<T> {
  message?: string;
  data: T;
}

export interface ErrorResponse {
  error: string;
  details?: any;
}

/**
 * Send a successful response
 */
export const sendSuccess = <T>(
  c: Context,
  data: T,
  message?: string,
  statusCode = 200
) => {
  const response: SuccessResponse<T> = { data };
  if (message) {
    response.message = message;
  }
  return c.json(response, statusCode as any);
};

/**
 * Send an error response
 */
export const sendError = (
  c: Context,
  error: string,
  statusCode = 500,
  details?: any
) => {
  const response: ErrorResponse = { error };
  if (details) {
    response.details = details;
  }
  return c.json(response, statusCode as any);
};

/**
 * Common error responses
 */
export const ErrorResponses = {
  badRequest: (c: Context, message = 'Bad request', details?: any) =>
    sendError(c, message, 400, details),

  unauthorized: (c: Context, message = 'Unauthorized') =>
    sendError(c, message, 401),

  forbidden: (c: Context, message = 'Forbidden') =>
    sendError(c, message, 403),

  notFound: (c: Context, message = 'Not found') =>
    sendError(c, message, 404),

  conflict: (c: Context, message = 'Conflict') =>
    sendError(c, message, 409),

  validationError: (c: Context, details: any) =>
    sendError(c, 'Validation failed', 400, details),

  serverError: (c: Context, message = 'Internal server error') =>
    sendError(c, message, 500),
};
