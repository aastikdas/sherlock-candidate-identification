/**
 * Reusable pill-style badge.
 * `variant` controls color; `pulse` adds a live-indicator dot (for
 * real-time/"live" style statuses).
 */
const VARIANT_STYLES = {
  success:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  info: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

const DOT_STYLES = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-indigo-500',
  neutral: 'bg-gray-400',
};

function Badge({ children, variant = 'neutral', pulse = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${DOT_STYLES[variant]}`}
          />
          <span
            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${DOT_STYLES[variant]}`}
          />
        </span>
      )}
      {children}
    </span>
  );
}

export default Badge;
