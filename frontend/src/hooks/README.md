# Hooks

Custom React hooks.

- `useSocket` — access to the shared Socket.IO connection and its live
  status (`connecting` / `connected` / `disconnected`). Requires
  `SocketProvider` (mounted in `main.jsx`) to be an ancestor. Only
  exposes connectivity, not any particular real-time feature.
- `useMeetingRoom` — joins the Socket.IO room for a meeting (re-joins on
  every reconnect) so this client starts receiving that meeting's
  broadcasts. Must run above/alongside any hook below that depends on
  room broadcasts.
- `useParticipants` — fetches the participant roster (merged with
  meeting metadata + AI confidence) from `services/participant.service.js`,
  then patches `aiConfidence`/`webcamStatus` in place from live socket
  broadcasts. Exposes `{ data, loading, error, refetch }`. Used by
  `ParticipantsCard`.
- `useCandidate` — same roster source as `useParticipants`, filtered to
  the participant with `role === 'candidate'`, plus a computed
  `confidenceTrend` delta. Exposes
  `{ candidate, loading, error, confidenceTrend, isLive, refetch }`.
  Used by `CandidateCard`.
- `useCandidateAnalysis` — fetches the merged Candidate Confidence
  Engine + Gemini Candidate Identification result
  (`POST /api/candidate/merged`). REST-only, no live socket patching.
  Used by `EvidencePanel`.
- `useTimelineEvents` — subscribes to the `timeline:event` socket
  broadcast and keeps a capped, most-recent-first list. Live-only, no
  REST backing. Used by `TimelineCard`.
