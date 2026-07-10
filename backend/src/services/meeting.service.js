/**
 * Meeting service.
 * Holds business logic for the (mocked) meeting lifecycle. There is no
 * database yet, so state lives in-memory for the lifetime of the process.
 * A future milestone can swap this module's internals for a real
 * persistence layer without touching the controller/routes.
 */

const ApiError = require('../utils/apiError');

const STATUS = {
  IDLE: 'idle',
  IN_PROGRESS: 'in_progress',
  ENDED: 'ended',
};

// In-memory mock state. Keyed by meetingId to support multiple concurrent sessions.
const meetings = new Map();

function getOrCreateMeeting(meetingId) {
  const mId = meetingId || 'meeting-mock-001';
  if (!meetings.has(mId)) {
    meetings.set(mId, {
      status: STATUS.IDLE,
      meetingId: mId,
      candidateName: null,
      participants: [],
      startedAt: null,
      endedAt: null,
    });
  }
  return meetings.get(mId);
}

function formatDuration(startedAt, endedAt) {
  const end = endedAt ? new Date(endedAt) : new Date();
  const start = new Date(startedAt);
  const totalSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

function serialize(meeting) {
  if (!meeting) return null;
  const isLive = meeting.status === STATUS.IN_PROGRESS;

  return {
    status: meeting.status,
    isLive,
    meetingId: meeting.meetingId,
    candidateName: meeting.candidateName,
    participants: meeting.participants,
    participantsCount: meeting.participants.length,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
    duration:
      meeting.status === STATUS.IDLE ? null : formatDuration(meeting.startedAt, meeting.endedAt),
  };
}

function getMeeting(meetingId) {
  return serialize(getOrCreateMeeting(meetingId));
}

function startMeeting({ meetingId, candidateName, participants }) {
  const mId = meetingId || 'meeting-mock-001';
  const meeting = getOrCreateMeeting(mId);
  if (meeting.status === STATUS.IN_PROGRESS) {
    throw new ApiError(409, 'A meeting is already in progress.');
  }

  meeting.status = STATUS.IN_PROGRESS;
  meeting.candidateName = candidateName;
  meeting.participants = participants || [];
  meeting.startedAt = new Date().toISOString();
  meeting.endedAt = null;

  return serialize(meeting);
}

function endMeeting(meetingId) {
  const mId = meetingId || 'meeting-mock-001';
  const meeting = getOrCreateMeeting(mId);
  if (meeting.status !== STATUS.IN_PROGRESS) {
    throw new ApiError(409, 'No meeting is currently in progress.');
  }

  meeting.status = STATUS.ENDED;
  meeting.endedAt = new Date().toISOString();

  return serialize(meeting);
}

module.exports = {
  STATUS,
  getMeeting,
  startMeeting,
  endMeeting,
};
