/**
 * Candidate service.
 * Thin domain wrapper around `aiServiceClient` for the Gemini-backed
 * Candidate Identification integration -- mirrors `analysis.service.js`
 * exactly, just pointed at the AI service's `/api/candidate/identify`
 * route instead of `/api/analyze`. Owns the one thing specific to this
 * call: what a valid `CandidateIdentificationResult` looks like
 * (`isCandidateResult`), so the generic client stays free of
 * AI-service-specific shape knowledge.
 */

const { aiServiceClient } = require('../clients/aiServiceClient');

const IDENTIFY_PATH = '/api/candidate/identify';
const MERGED_PATH = '/api/candidate/merged';

/**
 * Minimal shape check for a `CandidateIdentificationResult` (see the
 * AI service's `app/models/schemas.py`). Deliberately checks only the
 * fields callers in this codebase actually rely on, so the AI service
 * can evolve additive fields without breaking this check. Note this
 * result is returned on both the Gemini-backed path and the
 * deterministic fallback path (`source: 'gemini' | 'fallback'`) -- see
 * the AI service's `CandidateIdentificationService` -- so a valid
 * response never depends on `GEMINI_API_KEY` being configured.
 */
function isCandidateResult(data) {
  return (
    !!data &&
    typeof data === 'object' &&
    typeof data.candidateParticipantId === 'string' &&
    typeof data.explanation === 'string' &&
    Array.isArray(data.alternativeCandidates) &&
    typeof data.uncertainty === 'number' &&
    Number.isFinite(data.uncertainty)
  );
}

/**
 * Runs the AI service's Gemini-backed candidate identification for a
 * meeting: meeting metadata + participant features + confidence
 * scores in, `{ candidate, explanation, alternativeCandidates,
 * uncertainty }` out.
 *
 * @param {object|undefined} meeting - raw meeting telemetry matching the
 *   AI service's `MeetingData` schema. Optional -- when omitted, the AI
 *   service falls back to its own mock meeting data.
 * @param {object|undefined} weights - optional confidence-weight
 *   overrides matching the AI service's `ConfidenceWeights` schema.
 * @returns {Promise<object>} the candidate identification result.
 * @throws {ApiError} propagated from `aiServiceClient` on timeout,
 *   connection failure, or an invalid/malformed response.
 */
async function identifyCandidate(meeting, weights) {
  const payload = {
    ...(meeting ? { meeting } : {}),
    ...(weights ? { weights } : {}),
  };
  return aiServiceClient.post(IDENTIFY_PATH, payload, { validate: isCandidateResult });
}

/**
 * Minimal shape check for a `MergedCandidateResult` (see the AI
 * service's `app/models/schemas.py`). This is the Candidate Confidence
 * Engine's evidence trail reconciled with the Gemini Candidate
 * Identification's pick -- `candidate`, `confidence`, `reason`,
 * `evidence`, and `llmExplanation` are exactly the fields this
 * codebase's callers rely on.
 */
function isMergedCandidateResult(data) {
  return (
    !!data &&
    typeof data === 'object' &&
    !!data.candidate &&
    typeof data.candidate === 'object' &&
    typeof data.candidate.participantId === 'string' &&
    typeof data.confidence === 'number' &&
    Number.isFinite(data.confidence) &&
    typeof data.reason === 'string' &&
    Array.isArray(data.evidence) &&
    typeof data.llmExplanation === 'string'
  );
}

/**
 * Runs the AI service's merged Candidate Confidence Engine + Gemini
 * Candidate Identification pipeline for a meeting, and returns the
 * flattened `{ candidate, confidence, reason, evidence, llmExplanation }`
 * shape (plus `uncertainty`/`source`/`model`/`alternativeCandidates`
 * for traceability).
 *
 * @param {object|undefined} meeting - raw meeting telemetry matching the
 *   AI service's `MeetingData` schema. Optional -- when omitted, the AI
 *   service falls back to its own mock meeting data.
 * @param {object|undefined} weights - optional confidence-weight
 *   overrides matching the AI service's `ConfidenceWeights` schema.
 * @returns {Promise<object>} the merged candidate result.
 * @throws {ApiError} propagated from `aiServiceClient` on timeout,
 *   connection failure, or an invalid/malformed response.
 */
async function getMergedCandidate(meeting, weights) {
  const payload = {
    ...(meeting ? { meeting } : {}),
    ...(weights ? { weights } : {}),
  };
  return aiServiceClient.post(MERGED_PATH, payload, { validate: isMergedCandidateResult });
}

module.exports = {
  identifyCandidate,
  isCandidateResult,
  getMergedCandidate,
  isMergedCandidateResult,
};
