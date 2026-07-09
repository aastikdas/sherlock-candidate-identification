import { io } from 'socket.io-client';

import config from '../config/index.js';

/**
 * Shared Socket.IO client instance.
 *
 * This module owns exactly one socket for the whole app — anything that
 * needs real-time connectivity (participants, chat, WebRTC signaling,
 * meeting events, ...) should import this same instance rather than
 * creating its own, so there is a single connection/reconnection
 * lifecycle to reason about.
 *
 * `autoConnect: false` because connection is started explicitly by
 * `connectSocket()`, which is called once from `SocketProvider` when the
 * app mounts. This keeps the module import side-effect-free (safe to
 * import anywhere, including tests) while still connecting automatically
 * as far as the running application is concerned.
 *
 * Reconnection is handled entirely by socket.io-client's built-in
 * reconnection manager (exponential backoff between
 * `reconnectionDelay` and `reconnectionDelayMax`), so no custom retry
 * logic is needed here or in consumers.
 */
const socket = io(config.socketUrl, {
  autoConnect: false,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

/**
 * Starts the connection if it isn't already connecting/connected.
 * Safe to call multiple times (e.g. StrictMode double-invoking effects).
 */
export function connectSocket() {
  if (!socket.connected && !socket.active) {
    socket.connect();
  }
}

/**
 * Tears down the connection and cancels any pending reconnection
 * attempts. Intended for app-level teardown (e.g. logout); individual
 * features should not disconnect the shared socket.
 */
export function disconnectSocket() {
  socket.disconnect();
}

export default socket;
