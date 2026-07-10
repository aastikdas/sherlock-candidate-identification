/**
 * Candidate controller.
 * Thin HTTP layer for the Gemini-backed Candidate Identification
 * integration -- delegates to `candidate.service.js` and formats the
 * response via the shared `apiResponse` helper. Any failure (timeout,
 * connection failure, invalid AI-service response) surfaces as an
 * `ApiError` thrown by the service, which `asyncHandler` forwards to
 * the centralized `errorHandler` middleware.
 */

const candidateService = require('../../services/candidate.service');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const identifyCandidate = asyncHandler(async (req, res) => {
  const { meeting, weights } = req.body || {};
  const meetingId = req.headers['x-meeting-id'] || req.query.meetingId;
  const data = await candidateService.identifyCandidate(meeting, weights, meetingId);
  sendSuccess(res, { message: 'Candidate identification completed successfully.', data });
});

/**
 * `POST /api/candidate/merged` -- runs the Candidate Confidence Engine
 * and the Gemini Candidate Identification together and returns the
 * merged shape: `candidate`, `confidence`, `reason`, `evidence`, and
 * `llmExplanation`.
 */
const getMergedCandidate = asyncHandler(async (req, res) => {
  const { meeting, weights } = req.body || {};
  const meetingId = req.headers['x-meeting-id'] || req.query.meetingId;
  const data = await candidateService.getMergedCandidate(meeting, weights, meetingId);
  sendSuccess(res, { message: 'Merged candidate analysis completed successfully.', data });
});

module.exports = { identifyCandidate, getMergedCandidate };
