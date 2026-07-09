/**
 * Reusable inline error banner with a retry button.
 * Used by every card that fetches its own data (`CandidateCard`,
 * `ParticipantsCard`, `EvidencePanel`, ...) so the same markup/styles
 * aren't reimplemented per card.
 */
function ErrorState({ resource = 'data', message, onRetry }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm dark:border-red-500/30 dark:bg-red-500/10">
      <p className="text-red-700 dark:text-red-400">
        Couldn&apos;t load {resource}: {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors duration-150 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
      >
        Retry
      </button>
    </div>
  );
}

export default ErrorState;
