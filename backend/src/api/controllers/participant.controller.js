/**
 * Participant controller.
 * Thin HTTP layer — delegates all business logic to
 * `participant.service.js` and formats responses via the shared
 * `apiResponse` helper.
 */

const participantService = require('../../services/participant.service');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getParticipants = asyncHandler(async (req, res) => {
  const data = await participantService.getParticipants();
  sendSuccess(res, { message: 'Participants retrieved successfully.', data });
});

const getParticipantById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await participantService.getParticipantById(id);
  sendSuccess(res, { message: 'Participant retrieved successfully.', data });
});

module.exports = { getParticipants, getParticipantById };
