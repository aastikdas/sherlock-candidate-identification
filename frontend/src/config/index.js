/**
 * Centralized frontend configuration.
 * All environment-driven values should be read from here rather than
 * accessing import.meta.env directly throughout the codebase.
 */

const getSessionMeetingId = () => {
  if (typeof window === 'undefined') return 'meeting-mock-001';
  let mId = sessionStorage.getItem('sherlock_meeting_id');
  if (!mId) {
    const baseId = import.meta.env.VITE_DEFAULT_MEETING_ID || 'meeting-mock-001';
    mId = `${baseId}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('sherlock_meeting_id', mId);
  }
  return mId;
};

const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  socketUrl: import.meta.env.VITE_SOCKET_URL || '',
  // The mock realtime session (backend `sockets/services/realtimeMock.service.js`)
  // is keyed by a meetingId string and seeds its roster from static mock data.
  // Using a unique ID per tab allows different tabs to run independent simulations
  // without conflicting on Render.
  defaultMeetingId: getSessionMeetingId(),
};

export default config;
