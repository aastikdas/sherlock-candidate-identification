# Shared Config

Cross-service reference values (ports, Socket.IO event name constants,
etc.) that both `frontend/` and `backend/` should stay in sync with.

This is intentionally lightweight for now — `frontend` and `backend` are
independent runtimes (Vite dev server vs Node process), so this file is a
**documentation source of truth** rather than a directly-imported module.

If the project later moves to an npm-workspaces monorepo, this folder can
become an actual shared `@sherlock/shared-config` package imported by both.
