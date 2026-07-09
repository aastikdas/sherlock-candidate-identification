# Components

Reusable UI components for the dashboard.

- `Card.jsx`, `Container.jsx` — presentational shells used by every card/page.
- `Header.jsx`, `Sidebar.jsx` — app shell chrome, composed by `layouts/MainLayout.jsx`.
- `MeetingStatusCard.jsx` — meeting status summary (participant/camera
  counts, active speaker, current candidate, live duration), sourced
  live from `useParticipants` + `useCandidate` + the
  `participant:speaking-changed` socket event. No dummy data.
- `CandidateCard.jsx` — the identified candidate + live confidence,
  hydrated from `/api/participants` and updated over Socket.IO (`useCandidate`).
- `ParticipantsCard.jsx` — the full participant roster table, same data
  source as `CandidateCard`, updated live (`useParticipants`).
- `TimelineCard.jsx` — normalized chronological event feed, live-only
  (`useTimelineEvents`), no REST backing.
- `EvidencePanel.jsx` — the Candidate Confidence Engine's evidence
  trail reconciled with the Gemini Candidate Identification's
  explanation (`/api/candidate/merged`, via `useCandidateAnalysis`).
- `ui/` — small shared primitives (`Badge`, `ProgressBar`, `StatTile`,
  `ErrorState`, `TrendIndicator`, `TimelineEventIcon`) used across the
  cards above.
