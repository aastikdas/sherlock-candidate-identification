/**
 * Participant input validation.
 * Same lightweight-middleware approach as `meeting.validator.js` — no
 * schema library, just explicit checks that forward an `ApiError(400, ...)`
 * on failure.
 */

const ApiError = require('../../utils/apiError');

function validateParticipantId(req, res, next) {
  const { id } = req.params;

  if (typeof id !== 'string' || id.trim().length === 0) {
    return next(new ApiError(400, 'participantId route parameter is required.'));
  }

  next();
}

module.exports = { validateParticipantId };
