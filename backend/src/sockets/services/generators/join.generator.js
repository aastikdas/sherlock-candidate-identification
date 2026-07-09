/**
 * join.generator.js
 * Produces a mock "participant joined" event for a meeting mock session.
 *
 * Consumes/mutates `state.joinedIds` (a Set) so each participant is only
 * reported as "joining" once per session. Returns `null` once every
 * participant has already joined, which tells the caller it can stop
 * scheduling further join ticks for that meeting.
 */

const OBSERVED_IDENTITIES = {
  'p-001': { displayName: 'Jane Doe', email: 'jane.doe@example.com' },
  'p-002': { displayName: 'Alex J. Kim', email: 'alex.kim@example.com' },
  'p-003': { displayName: 'Guest User', email: 'guest47@mailinator.com' },
  'p-004': { displayName: 'Priya Nair', email: 'priya.nair@example.com' }
};

function generateJoinEvent({ meetingId, participants, state }) {
  const notYetJoined = participants.filter((p) => !state.joinedIds.has(p.participantId));

  if (notYetJoined.length === 0) {
    return null;
  }

  const participant = notYetJoined[0];
  state.joinedIds.add(participant.participantId);

  // Set starting camera status: Sam Patel has off, others have on
  const initialCam = participant.participantId === 'p-003' ? 'off' : 'on';
  state.webcamStatuses.set(participant.participantId, initialCam);

  // Create dynamic participant telemetry record
  const observed = OBSERVED_IDENTITIES[participant.participantId] || {
    displayName: participant.displayName,
    email: participant.email
  };

  const telemetryPart = {
    participantId: participant.participantId,
    expectedIdentity: {
      displayName: participant.displayName,
      email: participant.email
    },
    observedIdentity: observed,
    joinTime: new Date().toISOString(),
    speaking: { totalSpeakingSeconds: 0, speakingTurns: 0 },
    camera: { cameraOnSeconds: 0 },
    transcript: { wordCount: 0, fillerWordCount: 0, segmentsTranscribed: 0, totalSpeakingSegments: 0 },
    faceDetection: { framesWithFace: 0, totalFramesSampled: 0 }
  };

  if (!state.telemetry) {
    state.telemetry = {
      meetingId: meetingId,
      scheduledStartTime: new Date(Date.now() - 60000).toISOString(),
      meetingStartTime: new Date().toISOString(),
      meetingDurationSeconds: 0,
      participants: []
    };
  }
  state.telemetry.participants.push(telemetryPart);

  return {
    meetingId,
    participantId: participant.participantId,
    displayName: participant.displayName,
    role: participant.role,
    joinedAt: new Date().toISOString(),
  };
}

module.exports = { generateJoinEvent };
