import { createContext, useEffect, useMemo, useState } from 'react';

import socket, { connectSocket, disconnectSocket } from '../services/socket.js';

/**
 * Connection lifecycle status for the shared socket.
 * - connecting:  initial connection attempt in flight (or a reconnection
 *                attempt in flight after a drop)
 * - connected:   an active Socket.IO connection is up
 * - disconnected: not connected and not currently retrying (e.g. the
 *                 server explicitly disconnected the socket, or
 *                 reconnection attempts have been exhausted)
 */
export const SOCKET_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
};

export const SocketContext = createContext({
  socket,
  status: SOCKET_STATUS.CONNECTING,
  isConnected: false,
});

/**
 * Owns the single shared socket connection for the whole app:
 * connects once on mount, keeps status in sync with the socket's own
 * lifecycle events (including automatic reconnection), and disconnects
 * on unmount. Feature-specific event handling (participants, chat,
 * WebRTC signaling, meeting events, ...) is intentionally out of scope
 * here — this provider only manages connectivity, not application
 * events.
 */
export function SocketProvider({ children }) {
  const [status, setStatus] = useState(
    socket.connected ? SOCKET_STATUS.CONNECTED : SOCKET_STATUS.CONNECTING
  );

  useEffect(() => {
    const handleConnect = () => setStatus(SOCKET_STATUS.CONNECTED);
    const handleDisconnect = () => setStatus(SOCKET_STATUS.DISCONNECTED);
    const handleReconnectAttempt = () => setStatus(SOCKET_STATUS.CONNECTING);
    const handleConnectError = () => setStatus(SOCKET_STATUS.DISCONNECTED);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('connect_error', handleConnectError);

    connectSocket();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('connect_error', handleConnectError);
      disconnectSocket();
    };
  }, []);

  const value = useMemo(
    () => ({
      socket,
      status,
      isConnected: status === SOCKET_STATUS.CONNECTED,
    }),
    [status]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export default SocketProvider;
