import { useEffect, useState } from 'react';

import useSocket from '../hooks/useSocket.js';
import Container from './Container.jsx';

const STATUS_LABEL = {
  connected: 'Live',
  connecting: 'Connecting…',
  disconnected: 'Offline',
};

const STATUS_DOT_CLASS = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-500 animate-pulse',
  disconnected: 'bg-gray-400',
};

/**
 * Small realtime-connection indicator.
 * Purely reflects Socket.IO connectivity — no feature-specific data.
 */
function ConnectionStatus() {
  const { status } = useSocket();

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400"
      title={`Realtime connection: ${status}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[status] ?? STATUS_DOT_CLASS.disconnected}`}
      />
      {STATUS_LABEL[status] ?? 'Offline'}
    </span>
  );
}

/**
 * Top application bar.
 * Shows a menu button (mobile sidebar trigger) and a theme toggle.
 * Purely presentational shell — no routing or data logic.
 */
function Header({ onMenuClick }) {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Toggle sidebar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
            Sherlock
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ConnectionStatus />

          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label="Toggle dark theme"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {isDark ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </Container>
    </header>
  );
}

export default Header;
