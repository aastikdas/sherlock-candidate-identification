/**
 * confidence.generator.js
 * Produces a mock "confidence updated" event for a meeting mock session.
 *
 * Applies a small random jitter to the participant's last-known
 * confidence score (tracked on `state.confidenceScores`) rather than
 * generating a fully independent random value each tick, so the metric
 * drifts gradually instead of jumping around implausibly.
 *
 * `participant.confidenceScore` here is the flat 0-1 baseline
 * `realtimeMock.service.js` seeds from the AI service's
 * `aiConfidence.confidenceScore` (see its `toGeneratorParticipant`) --
 * generators stay decoupled from the REST response's nested shape.
 */

const { pickRandom, clamp } = require('./random.util');

const JITTER = 0.06;

function generateConfidenceEvent({ meetingId, participants, state }) {
  const eligible = participants.filter(
    (p) => state.joinedIds.has(p.participantId) && !state.leftIds.has(p.participantId)
  );

  if (eligible.length === 0) {
    return null;
  }

  const participant = pickRandom(eligible);
  const previous =
    state.confidenceScores.get(participant.participantId) ?? participant.confidenceScore;

  const delta = (Math.random() * 2 - 1) * JITTER;
  const next = clamp(Number((previous + delta).toFixed(2)), 0, 1);

  state.confidenceScores.set(participant.participantId, next);

  return {
    meetingId,
    participantId: participant.participantId,
    displayName: participant.displayName,
    confidenceScore: next,
    previousScore: Number(previous.toFixed(2)),
    timestamp: new Date().toISOString(),
  };
}

module.exports = { generateConfidenceEvent };
