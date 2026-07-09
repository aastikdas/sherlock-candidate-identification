/**
 * Responsive width-constrained wrapper.
 * Centers content and applies consistent horizontal gutters that scale
 * with the viewport. Purely presentational — no state, no logic.
 */
function Container({ children, className = '' }) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}

export default Container;
