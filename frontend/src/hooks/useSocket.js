import { useContext } from 'react';

import { SocketContext } from '../context/SocketContext.jsx';

/**
 * Access the shared Socket.IO connection and its live status.
 *
 * Returns `{ socket, status, isConnected }`:
 * - `socket`: the shared Socket.IO client instance (from `services/socket.js`).
 *   Use it to register/emit events for a specific feature
 *   (e.g. `socket.on('meeting:update', ...)`) once that feature is built.
 * - `status`: `'connecting' | 'connected' | 'disconnected'`.
 * - `isConnected`: convenience boolean, `status === 'connected'`.
 *
 * Must be used within a `<SocketProvider>` (mounted once near the app
 * root in `main.jsx`).
 *
 * This hook only exposes connectivity — it intentionally does not know
 * about any particular real-time feature (participants, chat, WebRTC,
 * meetings, ...). Those should build their own hooks/services on top of
 * the `socket` instance returned here.
 */
function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  return context;
}

export default useSocket;
