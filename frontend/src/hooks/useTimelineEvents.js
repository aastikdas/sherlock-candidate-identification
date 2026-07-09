import { useEffect, useState } from 'react';

import useSocket from './useSocket.js';
import { TIMELINE_EVENTS } from '../constants/socketEvents.js';

// Purely a display cap -- the backend doesn't persist history, so this
// only bounds how much the in-memory list grows during a long session.
const MAX_EVENTS = 30;

/**
 * Subscribes to the backend's normalized `timeline:event` broadcast
 * (see `backend/src/sockets/services/timelineMapper.js`) and keeps a
 * capped, most-recent-first list of entries for `TimelineCard`.
 *
 * There is no REST backing for this -- the timeline only exists as a
 * live stream, so the list starts empty on mount and fills in as
 * events arrive. Requires a `<SocketProvider>` ancestor (via
 * `useSocket`) and assumes something has already joined the relevant
 * meeting room (see `useMeetingRoom`), since a socket that never
 * joined a room never receives its broadcasts.
 */
function useTimelineEvents() {
  const { socket } = useSocket();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    function handleTimelineEvent(entry) {
      setEvents((prev) => [entry, ...prev].slice(0, MAX_EVENTS));
    }

    socket.on(TIMELINE_EVENTS.EVENT, handleTimelineEvent);

    return () => {
      socket.off(TIMELINE_EVENTS.EVENT, handleTimelineEvent);
    };
  }, [socket]);

  return events;
}

export default useTimelineEvents;
