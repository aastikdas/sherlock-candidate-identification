/**
 * Socket.IO setup.
 * Initializes the Socket.IO server on top of the existing HTTP server and
 * wires up connection handling. Feature-specific logic (rooms today,
 * chat/participants/WebRTC signaling later) lives in ./handlers so this
 * file stays a thin bootstrap module.
 */

const { Server } = require('socket.io');
const config = require('../config');
const logger = require('../utils/logger');
const registerConnectionHandler = require('./handlers/connection.handler');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.clientUrl,
      credentials: true,
    },
  });

  io.on('connection', (socket) => registerConnectionHandler(io, socket));

  logger.info('socket', 'Socket.IO initialized', {
    corsOrigin: config.cors.clientUrl,
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet.');
  }
  return io;
}

module.exports = { initSocket, getIO };
