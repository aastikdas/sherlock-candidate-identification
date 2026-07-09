import Card from './Card.jsx';
import Badge from './ui/Badge.jsx';
import ErrorState from './ui/ErrorState.jsx';
import ProgressBar from './ui/ProgressBar.jsx';
import useCandidateAnalysis from '../hooks/useCandidateAnalysis.js';

/**
 * Evidence panel — the Candidate Confidence Engine's evidence trail
 * reconciled with the Gemini Candidate Identification's explanation
 * (`POST /api/candidate/merged`, via `useCandidateAnalysis`). Shows:
 *
 *   - Confidence: the weighted score for the identified candidate
 *   - Reason: the Confidence Engine's rule-based summary
 *   - LLM Explanation: Gemini's plain-language explanation for the
 *     pick (or the deterministic fallback's explanation, when
 *     `GEMINI_API_KEY` isn't configured -- see the `source` badge)
 *   - Supporting Evidence: the per-feature score/weight/contribution
 *     breakdown that actually produced the confidence score
 *   - Alternative Candidates: runner-ups the model weighed, with their
 *     own likelihood and reason
 *
 * No dummy data -- everything here comes straight from the backend.
 */

// Short, human-readable labels for the Confidence Engine's raw feature
// keys (see `ai-service/app/services/confidence_engine.py`'s
// `FEATURE_LABELS_POSITIVE`/`_NEGATIVE` for the rule-based-summary
// equivalent of this same mapping).
const FEATURE_LABELS = {
  displayNameSimilarity: 'Name Match',
  emailSimilarity: 'Email Match',
  speakingDurationScore: 'Speaking Duration',
  speakingFrequencyScore: 'Speaking Frequency',
  joinTimeScore: 'Join Time',
  cameraPresenceScore: 'Camera Presence',
  transcriptScore: 'Transcript Quality',
  facePresenceScore: 'Face Detection',
};

function featureLabel(feature) {
  return FEATURE_LABELS[feature] || feature;
}

function toPercent(value) {
  return Math.round((value ?? 0) * 100);
}

function scoreTextColor(score) {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-indigo-600 dark:text-indigo-400';
  if (score >= 25) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function LoadingEvidencePanel() {
  return (
    <Card title="Evidence">
      <div className="animate-pulse space-y-5">
        <div className="space-y-2">
          <span className="block h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
          <span className="block h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="space-y-2">
          <span className="block h-3 w-full rounded bg-gray-100 dark:bg-gray-800" />
          <span className="block h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="block h-20 rounded-md bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
      No evidence available for this meeting.
    </p>
  );
}

function EvidenceRow({ feature, rawScore, weight, contribution }) {
  const percent = toPercent(rawScore);

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-3.5 transition-colors duration-200 dark:border-gray-800 dark:bg-gray-800/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {featureLabel(feature)}
        </span>
        <span className={`text-sm font-semibold ${scoreTextColor(percent)}`}>
          {percent}%
        </span>
      </div>
      <ProgressBar value={percent} className="mt-2" />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Weight {Math.round((weight ?? 0) * 100)}% · Contribution{' '}
        {(contribution ?? 0).toFixed(3)}
      </p>
    </div>
  );
}

function AlternativeCandidateRow({ displayName, likelihood, reason }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {displayName || 'Unknown participant'}
        </span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {toPercent(likelihood)}%
        </span>
      </div>
      {reason && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{reason}</p>
      )}
    </div>
  );
}

function EvidencePanel() {
  const { data, loading, error, refetch } = useCandidateAnalysis();

  if (loading) {
    return <LoadingEvidencePanel />;
  }

  if (error) {
    return (
      <Card title="Evidence">
        <ErrorState resource="evidence" message={error} onRetry={refetch} />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title="Evidence">
        <EmptyState />
      </Card>
    );
  }

  const {
    candidate,
    confidence,
    reason,
    evidence = [],
    llmExplanation,
    source,
    alternativeCandidates = [],
  } = data;

  const confidencePercent = toPercent(confidence);
  const isLlmGenerated = source === 'gemini';

  return (
    <Card
      title="Evidence"
      className="transition-shadow duration-200 hover:shadow-md"
    >
      {/* Confidence */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Confidence{candidate?.displayName ? ` — ${candidate.displayName}` : ''}
          </span>
          <span className={`text-sm font-semibold ${scoreTextColor(confidencePercent)}`}>
            {confidencePercent}%
          </span>
        </div>
        <ProgressBar value={confidencePercent} className="mt-2" />
      </div>

      {/* Reason */}
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Reason</h3>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
          {reason || 'No reason summary available yet.'}
        </p>
      </div>

      {/* LLM Explanation */}
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            LLM Explanation
          </h3>
          <Badge variant={isLlmGenerated ? 'info' : 'neutral'}>
            {isLlmGenerated ? 'AI-generated' : 'Rule-based fallback'}
          </Badge>
        </div>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
          {llmExplanation || 'No explanation available yet.'}
        </p>
      </div>

      {/* Supporting Evidence */}
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Supporting Evidence
        </h3>
        {evidence.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {evidence.map((item) => (
              <EvidenceRow
                key={item.feature}
                feature={item.feature}
                rawScore={item.rawScore}
                weight={item.weight}
                contribution={item.contribution}
              />
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            No supporting evidence available yet.
          </p>
        )}
      </div>

      {/* Alternative Candidates */}
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Alternative Candidate{alternativeCandidates.length === 1 ? '' : 's'}
        </h3>
        {alternativeCandidates.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {alternativeCandidates.map((alt) => (
              <AlternativeCandidateRow
                key={alt.participantId}
                displayName={alt.displayName}
                likelihood={alt.likelihood}
                reason={alt.reason}
              />
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            No alternative candidates were identified.
          </p>
        )}
      </div>
    </Card>
  );
}

export default EvidencePanel;
