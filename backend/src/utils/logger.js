/**
 * logger.js
 * Minimal structured logging helper.
 *
 * Emits single-line, timestamped, machine-parseable log entries so that
 * server/socket lifecycle events (server started, socket connected,
 * socket disconnected, room joined, etc.) look consistent regardless of
 * where they're logged from. Kept dependency-free for now; the internal
 * implementation can be swapped for a library like winston/pino later
 * without changing call sites (`logger.info(scope, message, meta)`).
 */

function timestamp() {
  return new Date().toISOString();
}

function write(level, scope, message, meta = {}) {
  const entry = {
    timestamp: timestamp(),
    level,
    scope,
    message,
    ...meta,
  };

  const metaKeys = Object.keys(meta);
  const suffix = metaKeys.length ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${entry.timestamp}] [${level.toUpperCase()}] [${scope}] ${message}${suffix}`;

  // eslint-disable-next-line no-console
  const sink = level === 'error' ? console.error : console.log;
  sink(line);
}

module.exports = {
  info: (scope, message, meta) => write('info', scope, message, meta),
  warn: (scope, message, meta) => write('warn', scope, message, meta),
  error: (scope, message, meta) => write('error', scope, message, meta),
};
