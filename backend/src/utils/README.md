# Utilities

Shared helper functions used across the backend.

Implemented utilities:

- `logger.js` — minimal structured logging wrapper (`info`/`warn`/`error`),
  used by the server bootstrap, sockets, and the AI service client.
- `asyncHandler.js` — wraps async route handlers so a rejected promise
  is forwarded to Express's `next(err)` instead of crashing the process.
- `apiResponse.js` — `sendSuccess()`, the consistent
  `{ success, message, data }` shape every successful response uses.
- `apiError.js` — `ApiError`, an `Error` subclass carrying an HTTP
  status code (and optional `details`), thrown by services/validators
  and formatted by `middleware/errorHandler.js`.
