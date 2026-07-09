/**
 * socketEvents.js
 * Frontend mirror of the backend's `backend/src/sockets/events.js`.
 *
 * The frontend (Vite) and backend (Node) run as separate runtimes and
 * don't share a module graph (see `shared/README.md`), so event names
 * are kept in sync manually between the two files rather than imported
 * directly. If a name changes on one side, it must change here too.
 */

export const ROOM_EVENTS = {
  JOIN: 'meeting:join',
  JOIN_ACK: 'meeting:join:ack',
  JOIN_ERROR: 'meeting:join:error',
};

// Mock realtime participant-activity events (see the backend's
// `sockets/services/generators/`). Namespaced under `participant:`
// since they all describe something happening to/with a specific
// participant inside a meeting room.
export const PARTICIPANT_ACTIVITY_EVENTS = {
  JOINED: 'participant:joined',
  LEFT: 'participant:left',
  SPEAKING_CHANGED: 'participant:speaking-changed',
  CONFIDENCE_UPDATED: 'participant:confidence-updated',
  CAMERA_STATUS_CHANGED: 'participant:camera-status-changed',
  ANALYSIS_UPDATED: 'candidate:analysis-updated',
};

// Normalized timeline feed -- every event above is also reshaped and
// re-broadcast on this single channel (see the backend's
// `sockets/services/timelineMapper.js`) so `TimelineCard` can render a
// chronological log without listening for each granular event itself.
export const TIMELINE_EVENTS = {
  EVENT: 'timeline:event',
};
