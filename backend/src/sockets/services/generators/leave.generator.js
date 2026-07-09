/**
 * leave.generator.js
 * Produces a mock "participant left" event for a meeting mock session.
 *
 * Only participants who have already "joined" (per `state.joinedIds`)
 * and haven't already left (per `state.leftIds`) are eligible to leave.
 * Mirrors `join.generator.js`: consumes/mutates `state.leftIds` (a Set)
 * so each participant is only reported as "leaving" once per session,
 * and clears them from `state.speakingId` if they were the active
 * speaker so a departed participant can't linger as "currently
 * speaking" in later ticks.
 */

function generateLeaveEvent({ meetingId, participants, state }) {
  const eligible = participants.filter(
    (p) => state.joinedIds.has(p.participantId) && !state.leftIds.has(p.participantId)
  );

  if (eligible.length === 0) {
    return null;
  }

  const participant = eligible[0];
  state.leftIds.add(participant.participantId);

  if (state.speakingId === participant.participantId) {
    state.speakingId = null;
  }

  return {
    meetingId,
    participantId: participant.participantId,
    displayName: participant.displayName,
    role: participant.role,
    leftAt: new Date().toISOString(),
  };
}

module.exports = { generateLeaveEvent };
