import Card from './Card.jsx';
import Badge from './ui/Badge.jsx';
import TimelineEventIcon from './ui/TimelineEventIcon.jsx';
import useSocket from '../hooks/useSocket.js';
import useTimelineEvents from '../hooks/useTimelineEvents.js';

/**
 * Timeline panel — scrollable log of meeting events.
 * Live data from the backend's `timeline:event` socket broadcast (see
 * `useTimelineEvents`), which normalizes every mock participant-
 * activity tick (join/leave/speaking/confidence/camera) into one
 * chronological feed. No dummy data, and no REST fallback -- this
 * exists only as a live stream, so the list starts empty until the
 * backend's mock session emits its first event (see
 * `backend/src/sockets/services/realtimeMock.service.js`).
 */

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function EmptyState({ isConnected }) {
  return (
    <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
      {isConnected
        ? 'Waiting for live activity…'
        : 'Reconnecting — events will appear once the connection is back.'}
    </p>
  );
}

function TimelineCard() {
  const { isConnected } = useSocket();
  const events = useTimelineEvents();

  return (
    <Card
      title="Timeline"
      className="transition-shadow duration-200 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Live meeting activity
        </span>
        <Badge variant={isConnected ? 'success' : 'neutral'} pulse={isConnected}>
          {isConnected ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {events.length === 0 ? (
        <EmptyState isConnected={isConnected} />
      ) : (
        <ol className="max-h-80 space-y-4 overflow-y-auto pr-2">
          {events.map((event, index) => (
            <li key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <TimelineEventIcon type={event.type} />
                {index < events.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-700" />
                )}
              </div>
              <div className="min-w-0 pb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(event.timestamp)}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {event.title}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {event.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default TimelineCard;
