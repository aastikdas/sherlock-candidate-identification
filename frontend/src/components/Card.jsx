/**
 * Base card shell shared by all dashboard cards.
 * Presentational only — no state, no data fetching.
 */
function Card({ title, className = '', children }) {
  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export default Card;
