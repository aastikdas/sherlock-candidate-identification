/**
 * Centralized frontend configuration.
 * All environment-driven values should be read from here rather than
 * accessing import.meta.env directly throughout the codebase.
 */

const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
  // The mock realtime session (backend `sockets/services/realtimeMock.service.js`)
  // is keyed by an arbitrary meetingId string and seeds its roster from
  // the same static mock data `/api/participants` uses, independent of
  // `backend/src/services/meeting.service.js`'s (currently idle,
  // nothing ever calls `/api/meeting/start`) lifecycle state. Any
  // constant string works here; it just has to match on both ends of
  // the socket room, which is what `useMeetingRoom` joins on mount.
  defaultMeetingId: import.meta.env.VITE_DEFAULT_MEETING_ID || 'meeting-mock-001',
};

export default config;
