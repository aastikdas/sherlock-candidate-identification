/**
 * Centralized error-handling middleware.
 * Keeps error formatting consistent across the API.
 * Accepts plain Errors as well as `ApiError` instances (which carry a
 * `statusCode` and optional `details`).
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // eslint-disable-next-line no-console
  console.error(`[error] ${req.method} ${req.originalUrl} -> ${message}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = errorHandler;
