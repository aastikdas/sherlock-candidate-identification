/**
 * Shared constants referenced conceptually by both frontend and backend.
 *
 * Since the frontend (Vite) and backend (Node) run as separate runtimes,
 * this file is NOT imported directly by either app. It serves as the
 * single source of truth that both sides are kept in sync with manually
 * (or via a future shared npm package if the project is converted to a
 * monorepo with workspaces).
 */

const DEFAULT_PORTS = {
  frontend: 5173,
  backend: 5000,
  aiService: 8000,
};

const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Meeting room lifecycle.
  MEETING_JOIN: 'meeting:join',
  MEETING_JOIN_ACK: 'meeting:join:ack',
  MEETING_JOIN_ERROR: 'meeting:join:error',

  // Mock realtime participant activity (Task 15A — backend emits these
  // on an interval per meeting room; no AI is involved, purely dummy
  // data for the frontend to render against).
  PARTICIPANT_JOINED: 'participant:joined',
  PARTICIPANT_LEFT: 'participant:left',
  PARTICIPANT_SPEAKING_CHANGED: 'participant:speaking-changed',
  PARTICIPANT_CONFIDENCE_UPDATED: 'participant:confidence-updated',
  PARTICIPANT_CAMERA_STATUS_CHANGED: 'participant:camera-status-changed',

  // Normalized timeline feed -- every event above is also reshaped and
  // re-broadcast on this single channel so a client can render a
  // chronological log without listening for each granular event itself.
  TIMELINE_EVENT: 'timeline:event',
};

module.exports = {
  DEFAULT_PORTS,
  SOCKET_EVENTS,
};
