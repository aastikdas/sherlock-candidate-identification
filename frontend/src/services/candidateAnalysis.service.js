import axiosClient from '../api/axiosClient.js';

/**
 * Candidate analysis service (frontend).
 * Thin wrapper around the backend's `POST /api/candidate/merged` route
 * -- the Candidate Confidence Engine's evidence trail reconciled with
 * the Gemini Candidate Identification's explanation, in one flattened
 * shape: `{ candidate, confidence, reason, evidence, llmExplanation,
 * uncertainty, source, model, alternativeCandidates }`. Mirrors
 * `participant.service.js` in spirit -- callers get back the
 * already-unwrapped `data` payload, not the `{ success, message, data }`
 * envelope every backend response comes in.
 */

/**
 * Fetches the merged candidate analysis for the current (mock) meeting.
 * No request body is required -- the backend/AI service fall back to
 * their built-in mock meeting data when `meeting` is omitted, same as
 * every other card on this dashboard.
 *
 * @returns {Promise<object>} `{ candidate, confidence, reason,
 *   evidence, llmExplanation, uncertainty, source, model,
 *   alternativeCandidates }`
 * @throws {Error} the underlying axios error on network failure or a
 *   non-2xx response (e.g. the AI service being unavailable, surfaced
 *   by the backend as a 502/503/504) -- callers are expected to catch
 *   this and present it as a loading/error state.
 */
async function fetchMergedCandidateAnalysis() {
  const response = await axiosClient.post('/api/candidate/merged', {});
  return response.data.data;
}

export default { fetchMergedCandidateAnalysis };
export { fetchMergedCandidateAnalysis };
