import { useEffect, useState } from 'react';

import Card from './Card.jsx';
import Badge from './ui/Badge.jsx';
import ErrorState from './ui/ErrorState.jsx';
import StatTile from './ui/StatTile.jsx';
import useParticipants from '../hooks/useParticipants.js';
import useCandidate from '../hooks/useCandidate.js';
import useSocket from '../hooks/useSocket.js';
import formatDuration from '../utils/formatDuration.js';
import { PARTICIPANT_ACTIVITY_EVENTS } from '../constants/socketEvents.js';

/**
 * Meeting status card.
 * Live data only, sourced from the same feeds the rest of the
 * dashboard already uses -- no dummy/hardcoded numbers:
 *
 *   - participant count / cameras-on count -- derived from
 *     `useParticipants` (`/api/participants`, live-patched over
 *     `participant:camera-status-changed` broadcasts).
 *   - current candidate -- `useCandidate`, the same source
 *     `CandidateCard` renders.
 *   - active speaker -- listens to the existing
 *     `participant:speaking-changed` broadcast directly (the backend
 *     already emits it; nothing else on the dashboard was consuming it
 *     yet).
 *   - started at / duration -- derived from the earliest `joinTime`
 *     across the current roster, ticking locally once a second. There
 *     is no dedicated "meeting started" timestamp in this prototype
 *     (see `backend/src/services/meeting.service.js` -- the mock
 *     lifecycle is never started via `POST /api/meeting/start` in this
 *     flow), so the earliest join is the most honest live proxy
 *     available rather than a fabricated placeholder.
 *   - live/offline -- actual socket connectivity, same signal
 *     `CandidateCard`/`Header` use.
 */
function MeetingStatusCard() {
  const { data, loading, error, refetch } = useParticipants();
  const { candidate, isLive } = useCandidate();
  const { socket } = useSocket();

  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // Active speaker: the backend already broadcasts this event (see
  // `backend/src/sockets/services/generators/speaking.generator.js`);
  // this card is simply the first place on the dashboard to listen for it.
  useEffect(() => {
    function handleSpeakingChanged(payload) {
      if (!payload) return;
      setActiveSpeaker(payload.displayName || null);
    }

    socket.on(PARTICIPANT_ACTIVITY_EVENTS.SPEAKING_CHANGED, handleSpeakingChanged);

    return () => {
      socket.off(PARTICIPANT_ACTIVITY_EVENTS.SPEAKING_CHANGED, handleSpeakingChanged);
    };
  }, [socket]);

  // Local 1s tick so "Duration" advances without re-fetching.
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <Card title="Meeting Status">
        <div className="animate-pulse space-y-3">
          <span className="block h-5 w-28 rounded bg-gray-100 dark:bg-gray-800" />
          <span className="block h-16 w-full rounded-md bg-gray-100 dark:bg-gray-800" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Meeting Status">
        <ErrorState resource="meeting status" message={error} onRetry={refetch} />
      </Card>
    );
  }

  const participants = data?.participants || [];
  const participantsCount = participants.length;
  const camerasEnabledCount = participants.filter((p) => p.webcamStatus === 'on').length;

  const earliestJoinMs = participants.reduce((earliest, p) => {
    const joined = p.joinTime ? new Date(p.joinTime).getTime() : NaN;
    if (Number.isNaN(joined)) return earliest;
    return earliest === null ? joined : Math.min(earliest, joined);
  }, null);

  const durationSeconds = earliestJoinMs ? Math.max(0, Math.floor((now - earliestJoinMs) / 1000)) : null;
  const startedAtLabel = earliestJoinMs
    ? new Date(earliestJoinMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  const statusLabel = isLive ? 'Live' : 'Reconnecting';
  const statusVariant = isLive ? 'success' : 'warning';

  return (
    <Card
      title="Meeting Status"
      className="transition-shadow duration-200 hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {statusLabel}
        </span>
        <Badge variant={statusVariant} pulse={isLive}>
          {isLive ? 'Live' : 'Offline'}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Started at</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {startedAtLabel}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Duration</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {formatDuration(durationSeconds)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <StatTile icon={<UsersIcon />} label="Participants" value={participantsCount} />
        <StatTile icon={<CameraIcon />} label="Cameras On" value={camerasEnabledCount} />
        <StatTile icon={<MicIcon />} label="Active Speaker" value={activeSpeaker || 'None'} />
        <StatTile
          icon={<CandidateIcon />}
          label="Current Candidate"
          value={candidate?.displayName || 'Unknown'}
        />
      </div>
    </Card>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="2.5" />
      <path d="M2.5 16c.5-2.8 2.3-4.5 4.5-4.5s4 1.7 4.5 4.5" strokeLinecap="round" />
      <circle cx="14" cy="7.5" r="2" />
      <path d="M12.5 11.7c1.7.2 3 1.8 3.4 4.3" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="5.5" width="10" height="9" rx="1.5" />
      <path d="M12.5 9l5-2.5v7L12.5 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="7.5" y="2.5" width="5" height="8" rx="2.5" />
      <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0" strokeLinecap="round" />
      <path d="M10 15v2.5" strokeLinecap="round" />
    </svg>
  );
}

function CandidateIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c.7-3.8 3-6 6-6s5.3 2.2 6 6" strokeLinecap="round" />
    </svg>
  );
}

export default MeetingStatusCard;
