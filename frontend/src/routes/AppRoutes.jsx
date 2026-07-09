import { Routes, Route } from 'react-router-dom';

import Dashboard from '../pages/Dashboard.jsx';

/**
 * Central route configuration.
 *
 * `/` renders the same `Dashboard` as `/dashboard` (rather than the old
 * placeholder `Home` page) since the dashboard is the only real screen
 * the app has today -- landing on `/` previously showed a stale "coming
 * in the next milestone" placeholder even though the live dashboard was
 * fully implemented one click away. `pages/Home.jsx` is kept on disk,
 * unused, in case a future milestone wants a distinct landing page.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default AppRoutes;
