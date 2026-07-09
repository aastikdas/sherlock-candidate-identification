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

// In-memory mock state. Starts idle — no meeting has happened yet.
let meeting = {
  status: STATUS.IDLE,
  meetingId: null,
  candidateName: null,
  participants: [],
  startedAt: null,
  endedAt: null,
};

function formatDuration(startedAt, endedAt) {
  const end = endedAt ? new Date(endedAt) : new Date();
  const start = new Date(startedAt);
  const totalSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

function serialize() {
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

function getMeeting() {
  return serialize();
}

function startMeeting({ meetingId, candidateName, participants }) {
  if (meeting.status === STATUS.IN_PROGRESS) {
    throw new ApiError(409, 'A meeting is already in progress.');
  }

  meeting = {
    status: STATUS.IN_PROGRESS,
    meetingId,
    candidateName,
    participants: participants || [],
    startedAt: new Date().toISOString(),
    endedAt: null,
  };

  return serialize();
}

function endMeeting() {
  if (meeting.status !== STATUS.IN_PROGRESS) {
    throw new ApiError(409, 'No meeting is currently in progress.');
  }

  meeting = {
    ...meeting,
    status: STATUS.ENDED,
    endedAt: new Date().toISOString(),
  };

  return serialize();
}

module.exports = {
  STATUS,
  getMeeting,
  startMeeting,
  endMeeting,
};
