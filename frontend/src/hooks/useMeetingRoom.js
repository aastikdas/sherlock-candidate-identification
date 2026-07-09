import { useEffect, useRef } from 'react';

import useSocket from './useSocket.js';
import { ROOM_EVENTS } from '../constants/socketEvents.js';
import config from '../config/index.js';

/**
 * Joins the given (or default) meeting's Socket.IO room so this client
 * starts receiving that meeting's realtime broadcasts -- participant
 * activity (`useParticipants`/`useCandidate`) and the normalized
 * timeline feed (`useTimelineEvents`) are all scoped to whatever room
 * the socket has joined server-side (see
 * `backend/src/sockets/handlers/room.handler.js`).
 *
 * Re-emits the join on every (re)connect, not just on mount --
 * Socket.IO room membership does not survive a dropped connection, so
 * a reconnect without re-joining would leave the client connected but
 * silently deaf to that meeting's events.
 *
 * Call this once near the top of whichever page/layout renders the
 * realtime cards (see `pages/Dashboard.jsx`). Joining is idempotent on
 * the backend (`socket.join` on an already-joined room, and
 * `startMockActivity` no-oping for a session already running/starting),
 * so it's safe if this hook ends up mounted more than once.
 */
function useMeetingRoom(meetingId = config.defaultMeetingId) {
  const { socket, isConnected } = useSocket();
  const joinedMeetingIdRef = useRef(null);

  useEffect(() => {
    if (!isConnected || !meetingId) {
      return;
    }

    // Avoid re-emitting on every render once already joined for this
    // meetingId + connection; a fresh `isConnected` flip (reconnect)
    // resets this so the join fires again.
    if (joinedMeetingIdRef.current === meetingId) {
      return;
    }

    socket.emit(ROOM_EVENTS.JOIN, { meetingId });
    joinedMeetingIdRef.current = meetingId;
  }, [socket, isConnected, meetingId]);

  // A disconnect invalidates room membership server-side; clear the
  // guard so the next reconnect re-joins instead of staying silent.
  useEffect(() => {
    if (!isConnected) {
      joinedMeetingIdRef.current = null;
    }
  }, [isConnected]);
}

export default useMeetingRoom;
