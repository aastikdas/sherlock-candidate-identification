import Card from './Card.jsx';
import Badge from './ui/Badge.jsx';
import ErrorState from './ui/ErrorState.jsx';
import ProgressBar from './ui/ProgressBar.jsx';
import useParticipants from '../hooks/useParticipants.js';
import useSocket from '../hooks/useSocket.js';
import formatDuration from '../utils/formatDuration.js';
import { getInitials, formatRole } from '../utils/participantDisplay.js';

/**
 * Participants table card.
 * Live data from the backend's `/api/participants` endpoint -- which
 * itself merges the meeting roster, meeting metadata, and the AI
 * service's Candidate Confidence Engine output into one response (see
 * `backend/src/services/participant.service.js`). No dummy data.
 *
 * The REST fetch (`useParticipants`) only hydrates the initial table;
 * confidence and camera-status cells then update in place as
 * `participant:confidence-updated` / `participant:camera-status-changed`
 * socket broadcasts arrive, with no re-fetch and no page refresh (see
 * `useParticipants` and
 * `backend/src/sockets/services/realtimeMock.service.js`).
 *
 * Columns:
 *   - Confidence -- `aiConfidence.confidenceScore` (AI-derived, "—"
 *     when the AI service has no ranking entry for that participant).
 *   - Camera     -- `webcamStatus` ("on" / "off").
 *   - Speaking   -- `speakingDuration`, formatted as m:ss.
 *   - Role       -- `role`.
 *   - Status     -- `microphoneStatus` ("on" / "muted"); this is the
 *     one roster field left over once camera (webcam) and speaking
 *     have their own columns, so it's what "status" maps to here.
 */

function CameraBadge({ webcamStatus }) {
  const isOn = webcamStatus === 'on';
  return (
    <Badge variant={isOn ? 'success' : 'neutral'}>{isOn ? 'On' : 'Off'}</Badge>
  );
}

function StatusBadge({ microphoneStatus }) {
  const isOn = microphoneStatus === 'on';
  return (
    <Badge variant={isOn ? 'success' : 'warning'}>{isOn ? 'On' : 'Muted'}</Badge>
  );
}

function ConfidenceCell({ aiConfidence }) {
  if (!aiConfidence || typeof aiConfidence.confidenceScore !== 'number') {
    return <span className="text-sm text-gray-400 dark:text-gray-500">—</span>;
  }

  const percent = Math.round(aiConfidence.confidenceScore * 100);

  return (
    <div className="flex w-28 items-center gap-2">
      <ProgressBar value={percent} className="flex-1" />
      <span className="w-9 shrink-0 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
        {percent}%
      </span>
    </div>
  );
}

function ParticipantRow({ participant }) {
  const { displayName, avatar, role, webcamStatus, microphoneStatus, speakingDuration, aiConfidence } =
    participant;

  return (
    <tr className="border-b border-gray-100 last:border-0 dark:border-gray-800">
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2.5">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-7 w-7 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800"
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              {getInitials(displayName)}
            </span>
          )}
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {displayName || 'Unknown'}
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-3">
        <span className="text-sm text-gray-600 dark:text-gray-300">{formatRole(role)}</span>
      </td>
      <td className="py-2.5 pr-3">
        <CameraBadge webcamStatus={webcamStatus} />
      </td>
      <td className="py-2.5 pr-3">
        <StatusBadge microphoneStatus={microphoneStatus} />
      </td>
      <td className="py-2.5 pr-3">
        <span className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
          {formatDuration(speakingDuration)}
        </span>
      </td>
      <td className="py-2.5">
        <ConfidenceCell aiConfidence={aiConfidence} />
      </td>
    </tr>
  );
}

const COLUMN_HEADERS = ['Participant', 'Role', 'Camera', 'Status', 'Speaking', 'Confidence'];

function TableHead() {
  return (
    <thead>
      <tr className="border-b border-gray-200 dark:border-gray-800">
        {COLUMN_HEADERS.map((label) => (
          <th
            key={label}
            className="whitespace-nowrap py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function LoadingRows({ count = 3 }) {
  return (
    <tbody>
      {Array.from({ length: count }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key -- skeleton rows have no stable identity
        <tr key={i} className="animate-pulse border-b border-gray-100 last:border-0 dark:border-gray-800">
          <td className="py-3 pr-3">
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800" />
              <span className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </td>
          <td className="py-3 pr-3">
            <span className="block h-3 w-14 rounded bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="py-3 pr-3">
            <span className="block h-4 w-10 rounded-full bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="py-3 pr-3">
            <span className="block h-4 w-10 rounded-full bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="py-3 pr-3">
            <span className="block h-3 w-10 rounded bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="py-3">
            <span className="block h-2 w-28 rounded-full bg-gray-100 dark:bg-gray-800" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function EmptyState() {
  return (
    <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
      No participants have joined yet.
    </p>
  );
}

function ParticipantsCard() {
  const { data, loading, error, refetch } = useParticipants();
  const { isConnected } = useSocket();

  if (error) {
    return (
      <Card title="Participants">
        <ErrorState resource="participants" message={error} onRetry={refetch} />
      </Card>
    );
  }

  const participants = data?.participants ?? [];

  return (
    <Card title="Participants">
      <div className="mb-3 flex items-center justify-end">
        <Badge variant={isConnected ? 'success' : 'neutral'} pulse={isConnected}>
          {isConnected ? 'Live' : 'Offline'}
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <TableHead />
          {loading ? (
            <LoadingRows />
          ) : (
            <tbody>
              {participants.map((participant) => (
                <ParticipantRow key={participant.participantId} participant={participant} />
              ))}
            </tbody>
          )}
        </table>
      </div>
      {!loading && participants.length === 0 && <EmptyState />}
    </Card>
  );
}

export default ParticipantsCard;
