/**
 * events.js
 * Central registry of Socket.IO event names.
 *
 * Keeping every event name in one place avoids typo-drift between the
 * handler that emits an event and any other module (or, eventually, the
 * frontend) that needs to listen for it. Handlers/services should import
 * from here instead of hard-coding string literals.
 */

const ROOM_EVENTS = {
  JOIN: 'meeting:join',
  JOIN_ACK: 'meeting:join:ack',
  JOIN_ERROR: 'meeting:join:error',
};

// Mock realtime participant-activity events (Task 15A).
// Namespaced under `participant:` since they all describe something
// happening to/with a specific participant inside a meeting room.
const PARTICIPANT_ACTIVITY_EVENTS = {
  JOINED: 'participant:joined',
  LEFT: 'participant:left',
  SPEAKING_CHANGED: 'participant:speaking-changed',
  CONFIDENCE_UPDATED: 'participant:confidence-updated',
  CAMERA_STATUS_CHANGED: 'participant:camera-status-changed',
};

// Normalized timeline feed. Every `PARTICIPANT_ACTIVITY_EVENTS` tick
// (join/speaking/confidence/camera) is *also* reshaped into one of
// these and broadcast, so `TimelineCard` can render a single
// chronological log without having to know about (or listen for)
// every granular event type itself. See
// `../services/timelineMapper.js` for the reshaping.
const TIMELINE_EVENTS = {
  EVENT: 'timeline:event',
};

module.exports = {
  ROOM_EVENTS,
  PARTICIPANT_ACTIVITY_EVENTS,
  TIMELINE_EVENTS,
};
