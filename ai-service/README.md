# AI Service

Python FastAPI microservice. On top of the **Feature Extraction
Service** and **Candidate Confidence Engine**, this milestone adds a
**Gemini-backed Candidate Identification** reasoning layer. All three
are self-contained and config-driven; the Gemini layer is the only one
that calls an external AI model, and it degrades gracefully to a
deterministic result when no API key is configured. The Node.js backend
integrates via `POST /api/analyze` and `POST /api/candidate`, and the
frontend dashboard consumes that integration end-to-end.

## Structure

```
ai-service/
  app/
    api/
      features_router.py           # /api/features/* routes
      confidence_router.py         # /api/confidence/* routes
      analyze_router.py            # /api/analyze route (features + confidence in one call)
      candidate_router.py          # /api/candidate/* routes (+ Gemini)
    core/
      config.py                    # DEFAULT_CONFIDENCE_WEIGHTS + GEMINI_* env settings
    models/
      schemas.py                   # Pydantic request/response schemas
    services/
      mock_data_service.py         # the ONLY place mock meeting data lives
      scorers.py                   # 8 pure, independent feature-scoring functions
      feature_extraction_service.py  # orchestrates the scorers
      confidence_engine.py         # weighted scoring + ranking + evidence + summary
      prompt_service.py            # reusable Gemini prompt builder (no API calls)
      gemini_client.py             # thin google-generativeai wrapper
      candidate_identification_service.py  # orchestrates prompt_service + gemini_client, with fallback
    utils/
      math_utils.py                # clamp / ratio / triangular-range helpers
      similarity.py                 # difflib-based string & email similarity
  main.py                          # FastAPI entrypoint
  requirements.txt
  .env.example
```

## Feature Extraction Service

`FeatureExtractionService.extract_meeting_features(meeting)` computes,
for every participant in a meeting, an 8-field feature vector with all
scores clamped to `[0, 1]`:

| Feature                  | What it measures                                                          |
|---------------------------|----------------------------------------------------------------------------|
| `displayNameSimilarity`   | How closely the observed meeting name matches the expected (invited) name |
| `emailSimilarity`         | How closely the observed meeting email matches the expected email        |
| `speakingDurationScore`   | How healthy the participant's share of total speaking time is            |
| `speakingFrequencyScore`  | How healthy the participant's rate of speaking turns/minute is           |
| `joinTimeScore`           | How promptly the participant joined relative to the scheduled start      |
| `cameraPresenceScore`     | Fraction of the meeting the camera was on                                |
| `transcriptScore`         | Transcript coverage + clarity (filler-word ratio), heuristic only        |
| `facePresenceScore`       | Fraction of sampled video frames with a detected face                    |

Every score is a deterministic heuristic (ratio, piecewise-linear range,
or `difflib` string similarity) — **no AI/ML models are used**.

## Candidate Confidence Engine

`ConfidenceEngine.score_meeting(features)` takes the **Feature JSON**
produced above and turns it into a weighted confidence ranking:

- **`confidenceScore`** — a weighted average of the 8 feature scores
  (weighted sum ÷ total weight, so it stays in `[0, 1]` regardless of
  how the weights are scaled).
- **`participantRanking`** — every participant, ranked highest-first,
  each with its own `confidenceScore`, `rank`, `evidence`, and
  `reasonSummary`. Ties break on `participantId` for a stable,
  deterministic order.
- **`evidence`** — a transparent per-feature breakdown (`rawScore`,
  `weight`, `contribution`) showing exactly what drove the score.
- **`reasonSummary`** — a short, rule-based (non-AI) explanation that
  calls out the strongest supporting and concerning signals.

The engine never hardcodes or special-cases a participant — every
participant is scored with the identical weight configuration, and the
"top" participant returned at the top level of the response is simply
whichever one scored highest. Changing the weights genuinely changes
who ranks where (verified during development).

**Weights are configurable**: defaults live in
`app.core.config.DEFAULT_CONFIDENCE_WEIGHTS` and can be overridden
per-instance (`ConfidenceEngine(weights={...})`) or per-request (via
the `weights` field on `POST /api/confidence/score`). Weights don't
need to sum to 1 — the engine normalizes by the total weight actually
applied, so they express *relative* importance.

## Gemini-backed Candidate Identification

`CandidateIdentificationService.identify_candidate(meeting, features, confidence)`
adds an LLM reasoning layer on top of the Candidate Confidence Engine's
output. Given meeting metadata, the extracted feature vectors, and the
engine's scored ranking, it returns:

- **`candidateParticipantId` / `candidateDisplayName`** — the
  participant Gemini identifies as the actual interview candidate.
- **`explanation`** — a plain-language explanation of the decision.
- **`alternativeCandidates`** — other plausible participants, each with
  its own `likelihood` (`[0, 1]`) and short `reason`.
- **`uncertainty`** — a single `[0, 1]` score for how confident the
  model is (0 = certain, 1 = a coin flip), judged from how ambiguous
  the evidence is rather than the raw `confidenceScore` alone.
- **`source`** — `"gemini"` when the explanation actually came from the
  model, or `"fallback"` when it didn't (see below).
- **`model`** — the Gemini model name used (or `"none"` on fallback).

### Reusable Prompt Service

`app/services/prompt_service.py` is a small, stateless, dependency-free
service whose only job is building the prompt text — it never calls
Gemini and never interprets a response:

- `build_system_prompt()` — the fixed instructions/response-contract
  prompt.
- `build_identification_prompt(meeting, features, confidence)` — the
  per-request prompt: meeting metadata + a per-participant table
  (feature vector + confidence evidence + reason summary), serialized
  as JSON so the model reads exact numbers rather than a paraphrase.

Because it's pure prompt construction with no I/O, it's trivially unit
testable (assert on the returned string) and reusable anywhere the same
prompt shape is needed — a different LLM client, a notebook, a test
fixture, etc.

### Gemini Client

`app/services/gemini_client.py` (`GeminiClient`) thinly wraps the
`google-generativeai` SDK: API-key handling, model selection, timeout,
and error classification, all in one place — mirroring the Node
backend's `AiServiceClient`. `is_configured()` reports whether
`GEMINI_API_KEY` is set; `generate(system_prompt, user_prompt)` returns
raw text or raises `GeminiError`.

### Graceful fallback (no API key required)

`CandidateIdentificationService` never raises. When `GEMINI_API_KEY` is
unset, the Gemini call fails, or the response can't be parsed into the
expected shape, it returns a **deterministic fallback** derived
straight from the Confidence Engine's own ranking instead: the
top-ranked participant is the candidate, the next two ranked
participants become `alternativeCandidates` (using their own
`confidenceScore`/`reasonSummary`), and `uncertainty` is derived from
how close the top two confidence scores are (a narrow gap ⇒ high
uncertainty). This keeps every `/api/candidate/*` route fully
exercisable with zero external dependencies, exactly like the rest of
this service.

## API

- `GET /health` — liveness check
- `GET /api/features/mock-meeting` — returns the raw mock meeting payload
- `GET /api/features/extract` — runs extraction against the built-in mock meeting
- `POST /api/features/extract` — runs extraction against a caller-supplied `MeetingData` JSON body
- `GET /api/confidence/weights` — returns the default weight configuration
- `GET /api/confidence/score` — runs the full mock pipeline (mock data → features → confidence ranking) with default weights
- `POST /api/confidence/score` — runs the Confidence Engine against a caller-supplied `{ features, weights? }` body (Feature JSON in, ranking out)
- `GET /api/analyze` *(N/A — POST only)*; `POST /api/analyze` — runs the full pipeline (mock or caller-supplied `{ meeting? }`) and returns the confidence ranking in one call
- `GET /api/candidate/identify` — runs the full pipeline (mock data → features → confidence → Gemini) with default weights, for a quick smoke test
- `POST /api/candidate/identify` — runs the full pipeline against a caller-supplied `{ meeting?, weights? }` body and returns a `CandidateIdentificationResult`
- `POST /api/candidate/identify-from-scores` — runs only the Gemini step against a caller-supplied `{ meeting, features, confidence }` body, without recomputing features/confidence
- `GET /api/candidate/merged` — runs the full mock pipeline and returns the merged shape: `candidate`, `confidence`, `reason`, `evidence`, `llmExplanation` (plus `uncertainty`/`source`/`model`/`alternativeCandidates`)
- `POST /api/candidate/merged` — runs the full pipeline against a caller-supplied `{ meeting?, weights? }` body and reconciles the Candidate Confidence Engine's evidence trail (for whichever participant Gemini actually identified) with Gemini's explanation into one flattened `MergedCandidateResult`

## Running

```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

Then visit `http://localhost:8000/health` or
`http://localhost:8000/api/confidence/score`.

To exercise the Gemini-backed candidate identification with a real
model, set `GEMINI_API_KEY` in `.env` before starting the server (see
`.env.example`); leave it unset to run entirely in fallback mode.
