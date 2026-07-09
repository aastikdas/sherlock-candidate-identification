/**
 * Analyze controller.
 * Thin HTTP layer for the Candidate Confidence Engine integration --
 * delegates to `analysis.service.js` and formats the response via the
 * shared `apiResponse` helper. Any failure (timeout, connection
 * failure, invalid AI-service response) surfaces as an `ApiError`
 * thrown by the service, which `asyncHandler` forwards to the
 * centralized `errorHandler` middleware.
 */

const analysisService = require('../../services/analysis.service');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const analyzeMeeting = asyncHandler(async (req, res) => {
  const { meeting } = req.body || {};
  const data = await analysisService.analyzeMeeting(meeting);
  sendSuccess(res, { message: 'Confidence analysis completed successfully.', data });
});

module.exports = { analyzeMeeting };
