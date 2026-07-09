/**
 * Small inline trend indicator — arrow + delta value.
 * `delta` is the signed change since the last reading (e.g. +4, -2, 0).
 */
function TrendIndicator({ delta = 0, suffix = 'pts', className = '' }) {
  const isUp = delta > 0;
  const isDown = delta < 0;
  const isFlat = delta === 0;

  const colorClass = isUp
    ? 'text-emerald-600 dark:text-emerald-400'
    : isDown
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-400 dark:text-gray-500';

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClass} ${className}`}
      title="Change since last check"
    >
      {isUp && (
        <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
          <path d="M6 2l4 6H2l4-6z" />
        </svg>
      )}
      {isDown && (
        <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
          <path d="M6 10L2 4h8l-4 6z" />
        </svg>
      )}
      {isFlat && (
        <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
          <path d="M2 5.5h8v1H2z" />
        </svg>
      )}
      {isUp ? '+' : ''}
      {delta}
      {suffix}
    </span>
  );
}

export default TrendIndicator;
