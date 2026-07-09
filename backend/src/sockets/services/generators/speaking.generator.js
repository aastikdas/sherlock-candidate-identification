/**
 * speaking.generator.js
 * Produces a mock "speaking changed" event for a meeting mock session.
 *
 * Only participants who have already "joined" (per `state.joinedIds`) are
 * eligible to speak. Tracks the currently-speaking participant on
 * `state.speakingId` so each tick reports both who started speaking and
 * who stopped, mirroring how a real active-speaker signal behaves.
 */

const { pickRandom } = require('./random.util');

function generateSpeakingEvent({ meetingId, participants, state }) {
  const eligible = participants.filter(
    (p) => state.joinedIds.has(p.participantId) && !state.leftIds.has(p.participantId)
  );

  if (eligible.length === 0) {
    return null;
  }

  // Prefer switching to someone who isn't already speaking, when possible.
  const candidates = eligible.filter((p) => p.participantId !== state.speakingId);
  const next = candidates.length > 0 ? pickRandom(candidates) : pickRandom(eligible);

  const previousSpeakerId = state.speakingId;
  state.speakingId = next.participantId;

  return {
    meetingId,
    participantId: next.participantId,
    displayName: next.displayName,
    isSpeaking: true,
    previousSpeakerId: previousSpeakerId || null,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { generateSpeakingEvent };
