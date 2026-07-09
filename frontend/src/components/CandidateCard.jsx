import Card from './Card.jsx';
import Badge from './ui/Badge.jsx';
import ErrorState from './ui/ErrorState.jsx';
import ProgressBar from './ui/ProgressBar.jsx';
import TrendIndicator from './ui/TrendIndicator.jsx';
import useCandidate from '../hooks/useCandidate.js';
import { getInitials, formatRole } from '../utils/participantDisplay.js';

/**
 * Candidate info card.
 * Hydrated from the backend's `/api/participants` endpoint (via
 * `useCandidate`), which merges the roster, meeting metadata, and the
 * AI service's Candidate Confidence Engine output -- same source
 * `ParticipantsCard` uses, filtered down to the one participant with
 * `role === 'candidate'`. No dummy data.
 *
 * Confidence and its trend then update live over the shared socket
 * connection (`participant:confidence-updated` broadcasts -- see
 * `useCandidate` and `backend/src/sockets/services/realtimeMock.service.js`),
 * with the REST fetch above as the initial hydration plus a slow
 * reconciliation fallback. The "Live" badge reflects actual socket
 * connectivity. No page refresh or re-fetch is needed for updates to
 * appear.
 */

function LoadingCandidateCard() {
  return (
    <Card title="Candidate">
      <div className="animate-pulse">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="flex-1 space-y-2">
            <span className="block h-3 w-28 rounded bg-gray-100 dark:bg-gray-800" />
            <span className="block h-3 w-36 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <span className="block h-3 w-full rounded bg-gray-100 dark:bg-gray-800" />
          <span className="block h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>

        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <span className="block h-3 w-full rounded bg-gray-100 dark:bg-gray-800" />
          <span className="block h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
      No candidate found for this meeting.
    </p>
  );
}

function CandidateCard() {
  const { candidate, loading, error, confidenceTrend, isLive, refetch } = useCandidate();

  if (loading) {
    return <LoadingCandidateCard />;
  }

  if (error) {
    return (
      <Card title="Candidate">
        <ErrorState resource="candidate" message={error} onRetry={refetch} />
      </Card>
    );
  }

  if (!candidate) {
    return (
      <Card title="Candidate">
        <EmptyState />
      </Card>
    );
  }

  const { displayName, participantId, role, aiConfidence } = candidate;

  const hasConfidence = !!aiConfidence && typeof aiConfidence.confidenceScore === 'number';
  const confidencePercent = hasConfidence ? Math.round(aiConfidence.confidenceScore * 100) : 0;
  const evidenceCount = aiConfidence?.evidence?.length ?? 0;
  const reasonSummary = aiConfidence?.reasonSummary || 'No reason summary available yet.';

  return (
    <Card title="Candidate" className="transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            {getInitials(displayName)}
          </span>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {displayName || 'Unknown'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatRole(role)}
            </p>
          </div>
        </div>

        <Badge variant={isLive ? 'success' : 'neutral'} pulse={isLive}>
          {isLive ? 'Live' : 'Offline'}
        </Badge>
      </div>

      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500 dark:text-gray-400">Candidate ID</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {participantId}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Confidence Score
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {hasConfidence ? `${confidencePercent}%` : '—'}
            </span>
            <TrendIndicator delta={confidenceTrend} suffix="%" />
          </div>
        </div>
        <ProgressBar value={confidencePercent} className="mt-2" />
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total Evidence
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {evidenceCount} items
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {reasonSummary}
        </p>
      </div>
    </Card>
  );
}

export default CandidateCard;
