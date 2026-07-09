/**
 * camera.generator.js
 * Produces a mock "camera status changed" event for a meeting mock
 * session.
 *
 * Simply flips the last-known webcam status (tracked on
 * `state.webcamStatuses`) for a random already-joined participant between
 * 'on' and 'off'.
 */

const { pickRandom } = require('./random.util');

function generateCameraEvent({ meetingId, participants, state }) {
  const eligible = participants.filter(
    (p) => state.joinedIds.has(p.participantId) && !state.leftIds.has(p.participantId)
  );

  if (eligible.length === 0) {
    return null;
  }

  const participant = pickRandom(eligible);
  const previousStatus =
    state.webcamStatuses.get(participant.participantId) ?? participant.webcamStatus;
  const nextStatus = previousStatus === 'on' ? 'off' : 'on';

  state.webcamStatuses.set(participant.participantId, nextStatus);

  return {
    meetingId,
    participantId: participant.participantId,
    displayName: participant.displayName,
    webcamStatus: nextStatus,
    previousStatus,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { generateCameraEvent };
