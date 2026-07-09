"""
Centralized configuration for the AI service.

Holds the default (fully overridable) weight configuration used by the
Candidate Confidence Engine, plus the environment-driven settings for
the Gemini-backed Candidate Identification service. Kept in `core/` so
both are easy to find/tune without digging through business logic --
callers can also override the confidence weights per-request without
touching this file at all (see `ConfidenceEngine.__init__`).

Weights express *relative* importance and do not need to sum to 1; the
engine normalizes by the total weight actually applied. Keys match the
feature names produced by the Feature Extraction Service
(`app.models.schemas.ParticipantFeatures`).
"""

from typing import Dict

DEFAULT_CONFIDENCE_WEIGHTS: Dict[str, float] = {
    "displayNameSimilarity": 0.20,
    "emailSimilarity": 0.15,
    "speakingDurationScore": 0.10,
    "speakingFrequencyScore": 0.05,
    "joinTimeScore": 0.10,
    "cameraPresenceScore": 0.15,
    "transcriptScore": 0.10,
    "facePresenceScore": 0.15,
}


# ---------------------------------------------------------------------------
# Gemini-backed Candidate Identification (see
# app.services.gemini_client / app.services.prompt_service /
# app.services.candidate_identification_service).
#
# `GEMINI_API_KEY` is intentionally read from the environment only (never
# hardcoded, never accepted from a request body) so a key never leaks into
# logs or client payloads. When it's unset, `GeminiClient` reports itself
# as unconfigured and `CandidateIdentificationService` falls back to a
# deterministic, non-AI result derived straight from the Confidence
# Engine's ranking -- the route stays exercisable end-to-end without any
# API key at all.
# ---------------------------------------------------------------------------

import os

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_TIMEOUT_SECONDS: float = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "20"))
