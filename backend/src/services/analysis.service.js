/**
 * Analysis service.
 * Thin domain wrapper around `aiServiceClient` for the Candidate
 * Confidence Engine integration. Owns the one thing specific to this
 * call: what a valid confidence result looks like (`isConfidenceResult`)
 * so the generic client stays free of AI-service-specific shape
 * knowledge.
 */

const { aiServiceClient } = require('../clients/aiServiceClient');

const ANALYZE_PATH = '/api/analyze';

/**
 * Minimal shape check for a `ConfidenceEngineResponse` (see the AI
 * service's `app/models/schemas.py`). Deliberately checks only the
 * fields callers in this codebase actually rely on, so the AI service
 * can evolve additive fields without breaking this check.
 */
function isConfidenceResult(data) {
  return (
    !!data &&
    typeof data === 'object' &&
    typeof data.participantId === 'string' &&
    typeof data.confidenceScore === 'number' &&
    Number.isFinite(data.confidenceScore) &&
    Array.isArray(data.participantRanking)
  );
}

/**
 * Runs the AI service's confidence analysis for a meeting.
 *
 * @param {object|undefined} meeting - raw meeting telemetry matching the
 *   AI service's `MeetingData` schema. Optional -- when omitted, the AI
 *   service falls back to its own mock meeting data.
 * @returns {Promise<object>} the confidence result (top participant +
 *   full ranking + evidence).
 * @throws {ApiError} propagated from `aiServiceClient` on timeout,
 *   connection failure, or an invalid/malformed response.
 */
async function analyzeMeeting(meeting) {
  const payload = meeting ? { meeting } : {};
  return aiServiceClient.post(ANALYZE_PATH, payload, { validate: isConfidenceResult });
}

module.exports = { analyzeMeeting, isConfidenceResult };
