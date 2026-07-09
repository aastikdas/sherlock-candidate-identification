/**
 * Formats a whole number of seconds as `m:ss` (or `h:mm:ss` once it
 * reaches an hour), for compact display in tables/tiles.
 *
 * @param {number|null|undefined} totalSeconds
 * @returns {string} e.g. `12:22`, `1:02:05`, or `—` for a missing value.
 */
function formatDuration(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(totalSeconds)) {
    return '—';
  }

  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default formatDuration;
