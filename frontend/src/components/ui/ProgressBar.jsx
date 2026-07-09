const AUTO_COLOR = (value) => {
  if (value >= 75) return 'bg-emerald-500';
  if (value >= 50) return 'bg-indigo-500';
  if (value >= 25) return 'bg-amber-500';
  return 'bg-red-500';
};

function ProgressBar({ value = 0, variant, className = '', trackClassName = '' }) {
  const clamped = Math.min(100, Math.max(0, value));
  const barColor = variant ?? 'bg-gradient-to-r from-violet-500 to-indigo-600';

  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${trackClassName} ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export default ProgressBar;
