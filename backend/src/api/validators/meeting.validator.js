/**
 * Meeting input validation.
 * Kept as small, explicit middleware functions rather than pulling in a
 * schema library, since the payloads are simple. Throws `ApiError(400, ...)`
 * on the first validation failure, which the centralized error handler
 * turns into a consistent JSON error response.
 */

const ApiError = require('../../utils/apiError');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateStartMeeting(req, res, next) {
  const body = req.body || {};
  const { meetingId, candidateName, participants } = body;

  if (!isNonEmptyString(meetingId)) {
    return next(new ApiError(400, 'meetingId is required and must be a non-empty string.'));
  }

  if (!isNonEmptyString(candidateName)) {
    return next(new ApiError(400, 'candidateName is required and must be a non-empty string.'));
  }

  if (participants !== undefined) {
    if (!Array.isArray(participants) || !participants.every(isNonEmptyString)) {
      return next(new ApiError(400, 'participants must be an array of non-empty strings.'));
    }
  }

  next();
}

module.exports = { validateStartMeeting };
