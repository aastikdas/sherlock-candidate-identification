# Layouts

Page-level layout wrappers that compose shared chrome around routed pages.

- `MainLayout.jsx` — the app shell used by every route (`Header` +
  `Sidebar` + content area). Owns only the mobile sidebar open/closed
  UI state — no business logic. Used by `pages/Dashboard.jsx`:
  `<MainLayout><Dashboard content /></MainLayout>`.
