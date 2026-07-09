/**
 * ApiError.
 * Lightweight Error subclass carrying an HTTP status code, so route
 * handlers can `throw new ApiError(400, 'message')` and let the
 * centralized errorHandler middleware format the response consistently.
 */

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
    Error.captureStackTrace?.(this, ApiError);
  }
}

module.exports = ApiError;
