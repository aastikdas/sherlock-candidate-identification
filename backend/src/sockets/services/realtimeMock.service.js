/**
 * realtimeMock.service.js
 * Orchestrates dummy participant activity for meeting rooms.
 *
 * This is a mock/simulation layer only — there is no AI or real
 * media-analysis behind any of it. It exists so the frontend has
 * something realistic to render (speaking changes, confidence updates,
 * camera status, join/leave events) before the real AI service is
 * wired in.
 *
 * Responsibilities:
 * - Track one "mock session" per meetingId (a bag of interval timers +
 *   generator state), keyed in an in-memory Map.
 * - On a fixed cadence per event type, run the matching generator
 *   (./generators) and, if it produced an event, broadcast it to every
 *   socket in that meeting's room and log it -- and also reshape it
 *   into a normalized timeline entry (see ./timelineMapper) broadcast
 *   on its own channel, so `TimelineCard` gets a single chronological
 *   feed without listening for every granular event type itself.
 * - Tear down cleanly once a meeting room has no more connected sockets,
 *   so mock sessions don't leak timers forever.
 *
 * Deliberately framework-agnostic beyond Socket.IO's `io` instance, and
 * deliberately dumb: no persistence, no cross-meeting shared state.
 */

const logger = require('../../utils/logger');
const config = require('../../config');
const participantService = require('../../services/participant.service');
const { PARTICIPANT_ACTIVITY_EVENTS, TIMELINE_EVENTS } = require('../events');
const { mapToTimelineEntry } = require('./timelineMapper');
const {
  generateJoinEvent,
  generateLeaveEvent,
  generateSpeakingEvent,
  generateConfidenceEvent,
  generateCameraEvent,
} = require('./generators');

const SCOPE = 'realtime-mock';

// meetingId -> { timers: NodeJS.Timeout[], state: {...} } | { starting: true }
const sessions = new Map();

function createInitialState() {
  return {
    joinedIds: new Set(),
    leftIds: new Set(),
    speakingId: null,
    confidenceScores: new Map(),
    webcamStatuses: new Map(),
  };
}

/**
 * Wraps a generator call + emit + log so each interval callback below
 * stays a one-liner. `clearOnNull` lets the join ticker stop its own
 * interval once every participant has joined.
 *
 * Every successful tick is broadcast twice: once on its own granular
 * channel (`eventName`, e.g. `participant:confidence-updated`) for
 * listeners that only care about that one thing, and once reshaped
 * into a normalized entry on the shared `timeline:event` channel (see
 * `./timelineMapper`) for `TimelineCard`'s single chronological feed.
 */
function runTick({ io, meetingId, participants, state, generatorFn, eventName, eventKey, timerRef }) {
  const payload = generatorFn({ meetingId, participants, state });

  if (!payload) {
    if (timerRef && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return;
  }

  io.to(meetingId).emit(eventName, payload);
  logger.info(SCOPE, `Emitted ${eventName}`, { meetingId, ...payload });

  const timelineEntry = mapToTimelineEntry(eventKey, payload);
  if (timelineEntry) {
    io.to(meetingId).emit(TIMELINE_EVENTS.EVENT, timelineEntry);
  }
}

/**
 * Seeds each participant's starting confidence score from the AI
 * service's Candidate Confidence Engine (via `participant.service.js`,
 * same merged shape the REST `/api/participants` endpoint returns) so
 * the mock session drifts from a real baseline instead of an arbitrary
 * one. A participant the AI service has no ranking entry for
 * (`aiConfidence: null`) falls back to a neutral 0.5 rather than
 * blowing up the generator.
 */
function toGeneratorParticipant(participant) {
  return {
    ...participant,
    confidenceScore: participant.aiConfidence?.confidenceScore ?? 0.5,
  };
}

/**
 * Starts a mock activity session for a meeting room, if one isn't
 * already running (or in the process of starting). Safe to call
 * multiple times — subsequent calls for a meeting that already has a
 * session (or a start in flight) are no-ops.
 *
 * Fetching the roster is async (it round-trips to the AI service), so
 * a `{ starting: true }` placeholder is written synchronously *before*
 * that fetch begins. Without it, two joins arriving back-to-back for a
 * brand-new meeting would both see "no session yet" and each kick off
 * their own timers.
 */
async function startMockActivity(io, meetingId) {
  if (sessions.has(meetingId)) {
    return;
  }

  sessions.set(meetingId, { starting: true });

  let participants;
  try {
    const result = await participantService.getParticipants();
    participants = (result.participants || []).map(toGeneratorParticipant);
  } catch (err) {
    // Roster/AI-service fetch failed -- clear the placeholder so a
    // later join attempt for this meeting can retry from scratch.
    sessions.delete(meetingId);
    logger.error(SCOPE, 'Failed to start mock realtime activity', {
      meetingId,
      message: err.message,
    });
    return;
  }

  // The room may have emptied out (or activity already started via a
  // racing call) while the fetch above was in flight.
  const placeholder = sessions.get(meetingId);
  if (!placeholder || !placeholder.starting) {
    return;
  }

  const state = createInitialState();
  const timers = [];
  const joinTimerRef = { current: null };

  joinTimerRef.current = setInterval(() => {
    runTick({
      io,
      meetingId,
      participants,
      state,
      generatorFn: generateJoinEvent,
      eventName: PARTICIPANT_ACTIVITY_EVENTS.JOINED,
      eventKey: 'join',
      timerRef: joinTimerRef,
    });
  }, config.mockRealtime.joinIntervalMs);
  timers.push(joinTimerRef);

  const leaveTimer = setInterval(() => {
    runTick({
      io,
      meetingId,
      participants,
      state,
      generatorFn: generateLeaveEvent,
      eventName: PARTICIPANT_ACTIVITY_EVENTS.LEFT,
      eventKey: 'leave',
    });
  }, config.mockRealtime.leaveIntervalMs);
  timers.push({ current: leaveTimer });

  const speakingTimer = setInterval(() => {
    runTick({
      io,
      meetingId,
      participants,
      state,
      generatorFn: generateSpeakingEvent,
      eventName: PARTICIPANT_ACTIVITY_EVENTS.SPEAKING_CHANGED,
      eventKey: 'speaking',
    });
  }, config.mockRealtime.speakingIntervalMs);
  timers.push({ current: speakingTimer });

  const confidenceTimer = setInterval(() => {
    runTick({
      io,
      meetingId,
      participants,
      state,
      generatorFn: generateConfidenceEvent,
      eventName: PARTICIPANT_ACTIVITY_EVENTS.CONFIDENCE_UPDATED,
      eventKey: 'confidence',
    });
  }, config.mockRealtime.confidenceIntervalMs);
  timers.push({ current: confidenceTimer });

  const cameraTimer = setInterval(() => {
    runTick({
      io,
      meetingId,
      participants,
      state,
      generatorFn: generateCameraEvent,
      eventName: PARTICIPANT_ACTIVITY_EVENTS.CAMERA_STATUS_CHANGED,
      eventKey: 'camera',
    });
  }, config.mockRealtime.cameraIntervalMs);
  timers.push({ current: cameraTimer });

  sessions.set(meetingId, { timers, state });

  logger.info(SCOPE, 'Mock realtime activity started', {
    meetingId,
    participantCount: participants.length,
  });
}

/**
 * Stops and discards the mock activity session for a meeting room, if
 * one exists. Safe to call for a meeting with no active session (or
 * one still in the "starting" phase — its timers are never created and
 * the placeholder is simply removed).
 */
function stopMockActivity(meetingId) {
  const session = sessions.get(meetingId);

  if (!session) {
    return;
  }

  if (session.timers) {
    session.timers.forEach((timerRef) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    });
  }

  sessions.delete(meetingId);

  logger.info(SCOPE, 'Mock realtime activity stopped', { meetingId });
}

/** Whether a mock session is currently running (or starting) for a meeting. */
function isRunning(meetingId) {
  return sessions.has(meetingId);
}

module.exports = { startMockActivity, stopMockActivity, isRunning };
