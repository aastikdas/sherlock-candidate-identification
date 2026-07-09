/**
 * Reusable compact stat tile — icon, label, and value.
 * Used inside metric grids (meeting status, participants, etc.).
 */
function StatTile({ icon, label, value, className = '' }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5 transition-colors duration-200 dark:border-gray-800 dark:bg-gray-800/50 ${className}`}
    >
      {icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {value}
        </p>
      </div>
    </div>
  );
}

export default StatTile;
