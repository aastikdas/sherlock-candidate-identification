/**
 * timelineMapper.js
 * Reshapes a single participant-activity event (join/leave/speaking/
 * confidence/camera -- see ../generators) into a normalized timeline
 * entry: `{ id, meetingId, type, title, detail, timestamp }`.
 *
 * `type` deliberately matches the frontend's `TimelineEventIcon` style
 * keys (`participant_joined`, `participant_left`, `started_speaking`,
 * `confidence_updated`, `camera_enabled`, `camera_disabled`) so
 * `TimelineCard` can render an entry straight off the wire with no
 * further translation.
 *
 * Kept separate from `realtimeMock.service.js` so "what does this event
 * mean in plain language" stays in one place, independent of the
 * interval/broadcast plumbing that drives it.
 */

function randomId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const MAPPERS = {
  join: (payload) => ({
    type: 'participant_joined',
    title: 'Participant joined',
    detail: `${payload.displayName}${payload.role ? ` (${payload.role})` : ''} joined the meeting`,
  }),

  leave: (payload) => ({
    type: 'participant_left',
    title: 'Participant left',
    detail: `${payload.displayName}${payload.role ? ` (${payload.role})` : ''} left the meeting`,
  }),

  speaking: (payload) => ({
    type: 'started_speaking',
    title: 'Started speaking',
    detail: `${payload.displayName} started speaking`,
  }),

  confidence: (payload) => ({
    type: 'confidence_updated',
    title: 'Confidence updated',
    detail: `${payload.displayName}'s confidence changed to ${Math.round(payload.confidenceScore * 100)}%`,
  }),

  camera: (payload) => {
    const isOn = payload.webcamStatus === 'on';
    return {
      type: isOn ? 'camera_enabled' : 'camera_disabled',
      title: isOn ? 'Camera enabled' : 'Camera disabled',
      detail: `${payload.displayName} turned ${isOn ? 'on' : 'off'} their camera`,
    };
  },
};

/**
 * @param {'join'|'leave'|'speaking'|'confidence'|'camera'} eventKey
 * @param {object} payload - the same payload already broadcast on the
 *   granular `PARTICIPANT_ACTIVITY_EVENTS` channel for this tick.
 * @returns {object|null} a normalized timeline entry, or `null` if
 *   `eventKey` isn't one we know how to describe (defensive -- keeps a
 *   future generator addition from crashing the timeline feed if the
 *   mapper hasn't been taught about it yet).
 */
function mapToTimelineEntry(eventKey, payload) {
  const mapper = MAPPERS[eventKey];

  if (!mapper) {
    return null;
  }

  const { title, detail, type } = mapper(payload);

  return {
    id: randomId(),
    meetingId: payload.meetingId,
    type,
    title,
    detail,
    timestamp: payload.timestamp || new Date().toISOString(),
  };
}

module.exports = { mapToTimelineEntry };
