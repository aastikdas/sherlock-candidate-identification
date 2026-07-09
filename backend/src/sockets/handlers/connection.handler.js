/**
 * connection.handler.js
 * Per-socket connection lifecycle wiring.
 *
 * Handles the generic connect/disconnect lifecycle and delegates
 * feature-specific event registration (rooms, and later chat/WebRTC/etc.)
 * to their own handler modules so this file stays small.
 */

const logger = require('../../utils/logger');
const registerRoomHandlers = require('./room.handler');
const { handleSocketLeavingRooms } = registerRoomHandlers;

function registerConnectionHandler(io, socket) {
  logger.info('socket', 'Socket connected', { socketId: socket.id });

  registerRoomHandlers(io, socket);

  // Fired while the socket is still a member of its rooms, which is the
  // only point at which we can accurately tell whether it's the last
  // socket in its meeting room (needed to decide whether to stop that
  // meeting's mock realtime activity session).
  socket.on('disconnecting', () => {
    handleSocketLeavingRooms(io, socket);
  });

  socket.on('disconnect', (reason) => {
    const { meetingId } = socket.data || {};

    logger.info('socket', 'Socket disconnected', {
      socketId: socket.id,
      reason,
      ...(meetingId ? { meetingId } : {}),
    });
  });
}

module.exports = registerConnectionHandler;
