# Services Layer

Business logic and integrations, kept separate from route handlers so
controllers stay thin (see `src/api/controllers/`).

Implemented services:

- `meeting.service.js` — in-memory (no database yet) meeting lifecycle:
  `getMeeting`, `startMeeting`, `endMeeting`.
- `participant.service.js` — merges the static participant roster with
  live meeting metadata (`meeting.service.js`) and the AI service's
  Candidate Confidence Engine ranking (`analysis.service.js`) into one
  response per participant.
- `analysis.service.js` — thin domain wrapper around `aiServiceClient`
  for the AI service's `POST /api/analyze` (Candidate Confidence
  Engine) integration.
- `candidate.service.js` — thin domain wrapper around `aiServiceClient`
  for the AI service's Gemini-backed Candidate Identification
  (`POST /api/candidate/identify`) and merged pipeline
  (`POST /api/candidate/merged`) integrations.

`upload.service.js` is not implemented yet — `middleware/upload.js`
(Multer) is configured but not wired to any route.
