# Evaluation

## 1. How the system was tested

This prototype has no automated test suite yet (see Limitations), so
verification was done by exercising every layer directly:

- **Unit-level, by construction.** The Feature Extraction Service's
  scorers (`ai-service/app/services/scorers.py`) are small pure
  functions — each takes primitive inputs and returns a single
  `[0, 1]` float, so each was reasoned through and manually checked
  against boundary inputs (0%, 100%, missing/unparseable timestamps,
  identical strings, completely different strings, empty strings).
- **Integration, via the built-in mock meeting.**
  `ai-service/app/services/mock_data_service.py` ships a fixed
  4-participant scenario deliberately built to exercise different
  regions of the scoring space in one request:
  - `p-001` — identity matches exactly, healthy engagement → expected
    to rank #1 with high confidence.
  - `p-002` — minor display-name variation ("Alex J. Kim" vs. "Alex
    Kim") but everything else solid → expected to still rank highly
    despite the imperfect name match, demonstrating that no single
    signal is decisive.
  - `p-003` — display name and email both mismatch the invited
    candidate, camera off, almost no speaking or transcript → expected
    to rank lowest, modeling a silent observer or a misattributed
    guest account.
  - `p-004` — identity matches, but joined 13 minutes late with low
    camera presence → expected to rank in the middle, showing that
    engagement signals pull the score down even when identity is
    correct.
  Every AI-service route (`/api/features/extract`,
  `/api/confidence/score`, `/api/analyze`, `/api/candidate/identify`,
  `/api/candidate/merged`) was exercised against this scenario, with
  and without a `GEMINI_API_KEY` configured, to confirm both the
  rule-based path and the Gemini + fallback paths produce a valid,
  fully-populated result.
- **End-to-end, via the Node backend and frontend.** The backend's
  `/api/analyze` and `/api/candidate*` routes were hit directly to
  confirm the AI service integration, response validation, and error
  mapping (`aiServiceClient.js`) behave correctly when the AI service
  is up, down, and returning malformed data. The Dashboard was loaded
  against a running backend + AI service to confirm the confidence
  score, evidence, ranking, and reasoning render correctly on load and
  continue to update live as the Socket.IO mock session broadcasts
  join/leave/speaking/camera/confidence events.

## 2. Edge cases (from the challenge brief) and how they're handled

| Scenario from the brief | How it's handled today |
|---|---|
| Candidate joins as "MacBook Pro" (device name, not a person) | `displayNameSimilarity` scores near 0 against the expected name, so identity contributes little/nothing to that participant's confidence — the system leans on the other 7 signals (speaking time, camera, transcript, join time) instead of failing outright. |
| Candidate joins using a nickname | `string_similarity` (character-level `difflib` ratio, case/whitespace-normalized) gives partial credit for close-but-not-exact names (e.g. "Alex Kim" vs. "Alex J. Kim" in the mock data) rather than an all-or-nothing exact match. |
| Interviewer enters the wrong candidate name | Because identity is only 2 of 8 weighted signals (`displayNameSimilarity` 0.20 + `emailSimilarity` 0.15 = 0.35 of the default weight total), a wrong invited name doesn't dominate the outcome — engagement/presence signals can still correctly surface the real candidate, and the mismatch itself shows up as a "concern" in the evidence trail rather than being silently ignored. |
| Multiple interviewers are present | Every participant is scored identically and independently; interviewers typically score low on `displayNameSimilarity`/`emailSimilarity` against the *candidate's* expected identity, which the engine has no reason to conflate with them. The full `participantRanking` (not just the top pick) is always returned, so multiple present-but-not-the-candidate participants are visible, not discarded. |
| Candidate changes their display name mid-meeting | Not modeled by the current mock telemetry shape (`observedIdentity` is a single snapshot, not a time series) — see Limitations. The architecture supports it (feature extraction would just need a time-bucketed `observedIdentity`), but it isn't implemented in this prototype. |
| Multiple observers join silently | Silence shows up directly as near-zero `speakingDurationScore`/`speakingFrequencyScore`/`transcriptScore`, which pulls their overall confidence down (mirrors `p-003` in the mock scenario) without needing a dedicated "observer" rule. |
| Missing information (no email on file, no transcript, camera never toggled) | Identity fields default to empty strings rather than raising; `string_similarity`/`email_similarity` treat "both sides missing" as neutral (1.0) and "one side missing" as no-match (0.0) rather than crashing; every ratio-based scorer uses a safe-division helper (`safe_ratio`) that returns a sane default instead of dividing by zero. An empty participant list is rejected at the request boundary with a clear validation error rather than surfacing as an unhandled failure downstream. |
| Ambiguous situations (two participants with similarly strong signals) | `participantRanking` exposes every participant's score, not just the winner, so a close call is visible rather than hidden. The Gemini-backed identification layer additionally produces an explicit `uncertainty` score (and the deterministic fallback derives its own uncertainty from how close the top two confidence scores are), plus `alternativeCandidates` with their own likelihoods — the system surfaces "I'm not fully sure, and here's who else it could be" instead of a false-confidence single answer. |

## 3. Accuracy

There is no labeled ground-truth dataset in this prototype (no real
meetings were run through it), so "accuracy" here means **internal
consistency and explainability**, not a measured precision/recall
number:

- Every score is deterministic and reproducible from its inputs — the
  same telemetry always produces the same ranking, which makes the
  system auditable and testable even without ML-style accuracy
  metrics.
- The rule-based Confidence Engine and the Gemini-backed Identification
  layer are evaluated independently (`source: "gemini" | "fallback"`
  on every result), which makes it possible to compare "what the
  weighted heuristic says" against "what the LLM says" for the same
  meeting — in the mock scenario tested, both layers agree on the
  top-ranked participant, with the LLM adding a richer natural-language
  explanation and its own uncertainty estimate on top.
- Confidence is intentionally **relative, not absolute** — it answers
  "who is most likely the candidate, given everyone else in this
  meeting" rather than claiming a calibrated probability. Before this
  is used against real interviews, it needs to be validated against a
  labeled set of real (or realistically synthesized) meetings, and the
  default feature weights need to be tuned against that data rather
  than the hand-picked defaults used here.

## 4. Limitations

- **Single mock scenario.** `mock_data_service.py` ships one
  deterministic 4-participant meeting. It's designed to cover several
  distinct regions of the scoring space (see §2), but it is not a
  representative or statistically meaningful sample — real interview
  data (or a much larger synthetic set) is needed before any accuracy
  claim can be made.
- **No mid-meeting identity changes.** `observedIdentity` is a single
  snapshot per participant, not a time series, so a candidate renaming
  themselves partway through a call isn't modeled end-to-end yet.
- **Within-meeting "learning," not cross-meeting learning.** Because
  the AI service is called with the meeting's current telemetry at any
  point in time, confidence naturally strengthens as more of the
  interview happens (more speaking time, more transcript, more camera
  samples accumulate) — that's the "continuously update confidence"
  requirement, and it's fully implemented. What is *not* implemented
  is learning across interviews (e.g. adjusting the default feature
  weights automatically based on outcomes from past interviews) — that
  would require a persistence/feedback layer, which is intentionally
  out of scope for this prototype (see root `README.md` §7).
- **No persistence.** All meeting/participant state is in-memory on
  the Node backend and resets on restart; the AI service is fully
  stateless per-request.
- **No authentication.** Every REST/Socket.IO endpoint is open — fine
  for a local prototype, not for a production deployment.
- **No automated test suite.** All verification described in §1 was
  manual/exploratory; Jest/Vitest (JS) and Pytest (Python) suites are
  the natural next step.
- **Socket.IO transport.** The realtime layer is configured for
  `websocket` transport only (no long-polling fallback), which is fine
  for local development but should be revisited for networks/proxies
  that block WebSocket upgrades.
- **Partial request validation.** `POST /api/analyze` and
  `POST /api/candidate*` on the Node backend rely on the AI service's
  Pydantic validation rather than an Express-level validation
  middleware of their own; malformed payloads are still rejected, but
  with a less specific error message than the `meeting.routes.js`
  validators provide.
- **Heuristic, not learned, scoring.** Every feature score is a
  hand-tuned deterministic function (string similarity, ratios,
  piecewise-linear ranges). This keeps the system fully explainable,
  but a learned model (trained on labeled real interviews) would
  likely outperform hand-tuned heuristics on genuinely ambiguous cases.
