/**
 * Participant service.
 * Holds business logic for the meeting participant roster.
 *
 * There is still no database, so the *roster* (who's in the meeting,
 * their contact/device info) stays a fixed in-memory list -- a future
 * milestone can swap that internal detail for a real persistence/
 * live-roster source without touching the controller/routes.
 *
 * Confidence is no longer part of that static mock, though. Each read
 * now:
 *   1. takes the participant's static roster info,
 *   2. asks `meeting.service.js` for the current meeting metadata, and
 *   3. asks the AI service (via `analysis.service.js`) for the
 *      Candidate Confidence Engine's ranking,
 * and merges all three into the single response the caller gets back,
 * so nothing downstream has to make three separate calls to piece a
 * participant's full picture together.
 */

const ApiError = require('../utils/apiError');
const meetingService = require('./meeting.service');
const analysisService = require('./analysis.service');

// In-memory mock roster -- participant identity/device info only.
// Confidence is deliberately NOT stored here anymore: it's derived,
// on every read, from the AI service's Candidate Confidence Engine
// (see `buildConfidenceLookup` below) rather than hardcoded.
const PARTICIPANTS = [
  {
    participantId: 'p-001',
    displayName: 'Jane Doe',
    email: 'jane.doe@example.com',
    webcamStatus: 'on',
    microphoneStatus: 'on',
    speakingDuration: 742,
    joinTime: '2026-07-08T10:02:00.000Z',
    role: 'candidate',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane%20Doe',
  },
  {
    participantId: 'p-002',
    displayName: 'Alex Kim',
    email: 'alex.kim@example.com',
    webcamStatus: 'on',
    microphoneStatus: 'muted',
    speakingDuration: 356,
    joinTime: '2026-07-08T10:01:20.000Z',
    role: 'interviewer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex%20Kim',
  },
  {
    participantId: 'p-003',
    displayName: 'Sam Patel',
    email: 'sam.patel@example.com',
    webcamStatus: 'off',
    microphoneStatus: 'muted',
    speakingDuration: 48,
    joinTime: '2026-07-08T10:03:45.000Z',
    role: 'observer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam%20Patel',
  },
  {
    participantId: 'p-004',
    displayName: 'Priya Nair',
    email: 'priya.nair@example.com',
    webcamStatus: 'off',
    microphoneStatus: 'muted',
    speakingDuration: 210,
    joinTime: '2026-07-08T10:14:10.000Z',
    role: 'interviewer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya%20Nair',
  },
];

function serializeParticipantInfo(participant) {
  return { ...participant };
}

function findParticipantInfo(participantId) {
  const participant = PARTICIPANTS.find((p) => p.participantId === participantId);

  if (!participant) {
    throw new ApiError(404, `Participant with id "${participantId}" was not found.`);
  }

  return serializeParticipantInfo(participant);
}

/**
 * Meeting-metadata slice shared across every participant in a response
 * -- i.e. everything about the meeting itself, not about any one
 * participant. The roster (`participants`/`participantsCount`) is
 * stripped back out since the roster is what this service already
 * owns and returns separately -- keeping it here too would just be
 * duplicated, possibly-inconsistent data.
 */
function getMeetingMetadata() {
  const { participants, participantsCount, ...meetingMetadata } = meetingService.getMeeting();
  return meetingMetadata;
}

/**
 * Calls the AI service's Candidate Confidence Engine (via
 * `analysis.service.js`) and reshapes its per-participant ranking into
 * a `participantId -> confidence` lookup, so merging is an O(1) lookup
 * per participant rather than an O(n) scan of the ranking array.
 *
 * Propagates whatever `ApiError` `analysisService.analyzeMeeting`
 * throws (timeout / unavailable / invalid response) -- callers see a
 * single, well-understood failure mode regardless of what went wrong
 * inside the AI service integration.
 */
async function buildConfidenceLookup() {
  const result = await analysisService.analyzeMeeting();
  const lookup = new Map();

  (result.participantRanking || []).forEach((entry) => {
    lookup.set(entry.participantId, {
      confidenceScore: entry.confidenceScore,
      rank: entry.rank,
      evidence: entry.evidence,
      reasonSummary: entry.reasonSummary,
    });
  });

  return lookup;
}

/**
 * Merges one participant's roster info with their AI confidence entry.
 * A participant the AI service doesn't have telemetry for (e.g. a
 * roster entry with no matching id in the mock meeting) gets
 * `aiConfidence: null` rather than being dropped or throwing, since a
 * missing AI opinion is a valid state, not a fatal error.
 */
function mergeParticipant(participantInfo, confidenceLookup) {
  return {
    ...participantInfo,
    aiConfidence: confidenceLookup.get(participantInfo.participantId) || null,
  };
}

/**
 * Returns the full roster, each participant merged with the current
 * meeting metadata and their AI-derived confidence -- one call, one
 * response, no follow-up requests needed.
 */
async function getParticipants() {
  const [meeting, confidenceLookup] = await Promise.all([
    getMeetingMetadata(),
    buildConfidenceLookup(),
  ]);

  const participants = PARTICIPANTS.map((participant) =>
    mergeParticipant(serializeParticipantInfo(participant), confidenceLookup)
  );

  return { meeting, participants };
}

/**
 * Returns a single participant merged with the current meeting
 * metadata and their AI-derived confidence.
 *
 * Looks the participant up in the roster *before* calling out to the
 * AI service, so an unknown `participantId` fails fast with a 404
 * instead of paying for a network round trip first.
 */
async function getParticipantById(participantId) {
  const participantInfo = findParticipantInfo(participantId);

  const [meeting, confidenceLookup] = await Promise.all([
    getMeetingMetadata(),
    buildConfidenceLookup(),
  ]);

  return {
    ...mergeParticipant(participantInfo, confidenceLookup),
    meeting,
  };
}

module.exports = { getParticipants, getParticipantById };
