/**
 * room.handler.js
 * Meeting room support.
 *
 * Responsible for letting a connected socket join a Socket.IO room keyed
 * by `meetingId`, and — as of Task 15A — kicking off the mock realtime
 * participant-activity generator for that room the first time someone
 * joins it. Leaving is handled implicitly by Socket.IO itself when the
 * socket disconnects (it is removed from every room it joined); this
 * module is responsible for noticing when a room has emptied out so it
 * can stop the mock activity for it (see `handleSocketLeavingRooms`,
 * called from the connection handler on `disconnecting`).
 *
 * No AI/business logic lives here — the activity emitted is entirely
 * mocked (see ../services/realtimeMock.service.js).
 */

const logger = require('../../utils/logger');
const { ROOM_EVENTS } = require('../events');
const realtimeMockService = require('../services/realtimeMock.service');

function registerRoomHandlers(io, socket) {
  socket.on(ROOM_EVENTS.JOIN, async (payload = {}) => {
    const meetingId = payload && payload.meetingId;

    if (!meetingId || typeof meetingId !== 'string') {
      logger.warn('socket', 'Room join rejected: invalid meetingId', {
        socketId: socket.id,
        payload,
      });
      socket.emit(ROOM_EVENTS.JOIN_ERROR, {
        message: 'A valid meetingId is required to join a meeting room.',
      });
      return;
    }

    socket.join(meetingId);
    // Track which room this socket is in so the disconnect handler can
    // log it, and so we know which room to check for emptiness on
    // disconnect. Socket.IO itself removes the socket from the room on
    // disconnect automatically.
    socket.data.meetingId = meetingId;

    logger.info('socket', 'Room joined', {
      socketId: socket.id,
      meetingId,
    });

    socket.emit(ROOM_EVENTS.JOIN_ACK, { meetingId });

    // Kick off (or no-op if already running/starting) the mock realtime
    // activity generator for this meeting room. Async because it
    // round-trips to the AI service for a starting confidence baseline
    // -- failures are logged inside `startMockActivity` itself and
    // don't tear down the room the socket already joined.
    try {
      await realtimeMockService.startMockActivity(io, meetingId);
    } catch (err) {
      logger.error('socket', 'Failed to start mock realtime activity', {
        socketId: socket.id,
        meetingId,
        message: err.message,
      });
    }
  });
}

/**
 * Called from the connection handler while a socket is still a member of
 * its rooms (i.e. on the `disconnecting` event, not `disconnect`) so the
 * room's current member count can still be read. Stops the meeting's
 * mock activity session once its last socket leaves.
 */
function handleSocketLeavingRooms(io, socket) {
  const { meetingId } = socket.data || {};

  if (!meetingId) {
    return;
  }

  const room = io.sockets.adapter.rooms.get(meetingId);
  // The disconnecting socket is still counted in the room at this point.
  const remainingAfterLeave = room ? room.size - 1 : 0;

  if (remainingAfterLeave <= 0) {
    realtimeMockService.stopMockActivity(meetingId);
  }
}

module.exports = registerRoomHandlers;
module.exports.handleSocketLeavingRooms = handleSocketLeavingRooms;
