/**
 * Reusable icon + color badge for a timeline event type.
 * Add new event types here to keep icon/color mapping in one place.
 */
const EVENT_STYLES = {
  participant_joined: {
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
    icon: (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="7" r="2.5" />
        <path d="M3 16c.5-2.8 2.3-4.5 5-4.5s4.5 1.7 5 4.5" strokeLinecap="round" />
        <path d="M15 6.5v4M13 8.5h4" strokeLinecap="round" />
      </svg>
    ),
  },
  participant_left: {
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
    icon: (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="7" r="2.5" />
        <path d="M3 16c.5-2.8 2.3-4.5 5-4.5s4.5 1.7 5 4.5" strokeLinecap="round" />
        <path d="M13 8.5h4.5M17.5 8.5L15 6M17.5 8.5L15 11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  camera_enabled: {
    color: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
    icon: (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2.5" y="5.5" width="10" height="9" rx="1.5" />
        <path d="M12.5 9l5-2.5v7L12.5 11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  camera_disabled: {
    color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    icon: (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2.5" y="5.5" width="10" height="9" rx="1.5" />
        <path d="M12.5 9l5-2.5v7L12.5 11" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.5 3l15 14" strokeLinecap="round" />
      </svg>
    ),
  },
  started_speaking: {
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    icon: (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="7.5" y="2.5" width="5" height="8" rx="2.5" />
        <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0" strokeLinecap="round" />
        <path d="M10 15v2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  confidence_updated: {
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    icon: (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 13l4-4 3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 6h3v3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  candidate_selected: {
    color: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400',
    icon: (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10" cy="7" r="3" />
        <path d="M4 17c.7-3.8 3-6 6-6s5.3 2.2 6 6" strokeLinecap="round" />
        <path d="M13.5 4l1 1 2-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

const DEFAULT_STYLE = {
  color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  icon: (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="7.25" />
    </svg>
  ),
};

function TimelineEventIcon({ type, className = '' }) {
  const style = EVENT_STYLES[type] ?? DEFAULT_STYLE;

  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.color} ${className}`}
    >
      {style.icon}
    </span>
  );
}

export default TimelineEventIcon;
