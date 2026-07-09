# API Layer

This folder contains route definitions and controllers for the backend.

Current structure:

```
api/
  routes/
    index.js               # root router (aggregator), mounted at /api
    health.routes.js       # GET /health, mounted at the app root (not under /api)
    meeting.routes.js      # /api/meeting resource routes
    participant.routes.js  # /api/participants resource routes
    analyze.routes.js      # /api/analyze resource routes
    candidate.routes.js    # /api/candidate resource routes
  controllers/
    health.controller.js
    meeting.controller.js
    participant.controller.js
    analyze.controller.js
    candidate.controller.js
  validators/
    meeting.validator.js
    participant.validator.js
```

Controllers stay thin and delegate to `services/` (in `src/services/`).
`src/api/routes/index.js` is where future resource routers (e.g. upload)
will be mounted.

## Analyze resource (AI Candidate Confidence Engine)

- `POST /api/analyze` — runs the AI service's Candidate Confidence
  Engine for a meeting and returns the confidence result (top
  participant + full ranking + evidence). Body: `{ meeting? }` —
  `meeting` is optional raw telemetry; when omitted, the AI service
  falls back to its own mock meeting data.

## Candidate resource (AI Gemini Candidate Identification)

- `POST /api/candidate` — runs the AI service's Gemini-backed
  Candidate Identification for a meeting. Body: `{ meeting?, weights? }`.
- `POST /api/candidate/merged` — runs the Candidate Confidence Engine
  and Gemini Candidate Identification together and returns the merged
  shape: `candidate`, `confidence`, `reason`, `evidence`,
  `llmExplanation`. Body: `{ meeting?, weights? }`.

Neither route has its own request validator middleware today (unlike
`meeting`/`participant`) — malformed bodies are instead caught by the
AI service's Pydantic schemas and surface as a `422` via
`aiServiceClient`'s error mapping.

## Meeting resource (mocked, no database)

- `GET /api/meeting` — returns the current (in-memory, mocked) meeting
  status: `idle`, `in_progress`, or `ended`.
- `POST /api/meeting/start` — starts a meeting. Body: `{ meetingId,
  candidateName, participants? }`. `meetingId` and `candidateName` are
  required non-empty strings; `participants`, if present, must be an array
  of non-empty strings. Returns `409` if a meeting is already in progress.
- `POST /api/meeting/end` — ends the in-progress meeting. Returns `409` if
  no meeting is currently in progress.

All responses share the shape `{ success, message, data }` on success or
`{ success: false, message, details? }` on error. State is held in memory
only (`src/services/meeting.service.js`) — there is no database yet.

## Participant resource (mocked roster + live AI confidence)

- `GET /api/participants` — returns `{ meeting, participants }`: the
  current meeting metadata plus the full roster, each participant
  merged with their AI-derived confidence.
- `GET /api/participants/:id` — returns a single participant (merged
  with `meeting` metadata and `aiConfidence`) by `participantId`.
  Returns `400` if `id` is missing/blank, `404` if no participant
  matches.

Each request merges three sources into one response, so callers never
need to hit three endpoints to build a full picture of a participant:

1. **Participant info** (roster) — `participantId`, `displayName`,
   `email`, `webcamStatus`, `microphoneStatus`, `speakingDuration`,
   `joinTime`, `role`, `avatar`. Still an in-memory mock — there is no
   database yet — and lives in `src/services/participant.service.js`.
2. **Meeting metadata** — `status`, `isLive`, `meetingId`,
   `candidateName`, `startedAt`, `endedAt`, `duration`, sourced live
   from `src/services/meeting.service.js`.
3. **AI confidence** (`aiConfidence`) — `confidenceScore`, `rank`,
   `evidence`, `reasonSummary`, fetched from the AI service's
   Candidate Confidence Engine via `POST /api/analyze` (see
   `src/services/analysis.service.js` /
   `src/clients/aiServiceClient.js`). `aiConfidence` is `null` if the
   AI service has no ranking entry for that participant.

Because confidence is now fetched from the AI service on every read,
these endpoints propagate the same `ApiError`s as `/api/analyze` when
the AI service is slow or unreachable: `504` (timeout), `503`
(unavailable), or `502` (invalid/failed response).

