/**
 * join.generator.js
 * Produces a mock "participant joined" event for a meeting mock session.
 *
 * Consumes/mutates `state.joinedIds` (a Set) so each participant is only
 * reported as "joining" once per session. Returns `null` once every
 * participant has already joined, which tells the caller it can stop
 * scheduling further join ticks for that meeting.
 */

function generateJoinEvent({ meetingId, participants, state }) {
  const notYetJoined = participants.filter((p) => !state.joinedIds.has(p.participantId));

  if (notYetJoined.length === 0) {
    return null;
  }

  const participant = notYetJoined[0];
  state.joinedIds.add(participant.participantId);

  return {
    meetingId,
    participantId: participant.participantId,
    displayName: participant.displayName,
    role: participant.role,
    joinedAt: new Date().toISOString(),
  };
}

module.exports = { generateJoinEvent };
