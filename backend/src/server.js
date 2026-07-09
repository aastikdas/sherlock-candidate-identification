/**
 * Server bootstrap.
 * Creates the HTTP server, attaches Socket.IO, and starts listening.
 */

const http = require('http');

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { initSocket } = require('./sockets');

const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
initSocket(server);

server.listen(config.server.port, () => {
  logger.info('server', 'Server started', {
    env: config.env,
    port: config.server.port,
  });
});

module.exports = server;
