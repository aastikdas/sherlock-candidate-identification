"""
Candidate Identification Service.

Orchestrates the Gemini-backed reasoning layer on top of the Candidate
Confidence Engine's output:

    meeting metadata + participant features + confidence scores
        -> PromptService.build_identification_prompt(...)
        -> GeminiClient.generate(...)
        -> parsed + validated CandidateIdentificationResult

Never talks to Gemini's SDK directly (that's `GeminiClient`'s job) and
never builds prompt text itself (that's `PromptService`'s job) -- this
module's only responsibility is wiring the two together and turning
whatever comes back into a trustworthy `CandidateIdentificationResult`,
no matter what happens along the way.

Fallback behavior: when `GeminiClient.is_configured()` is False, or the
Gemini call raises `GeminiError`, or the model's response can't be
parsed into the expected shape, this service does NOT raise -- it
returns a deterministic result derived straight from the Confidence
Engine's own ranking (`source: "fallback"`). This keeps every route
that uses this service exercisable end-to-end with zero external
dependencies, exactly like the rest of the AI service.
"""

import json
import logging
from typing import List, Optional

from app.models.schemas import (
    AlternativeCandidate,
    CandidateIdentificationResult,
    ConfidenceEngineResponse,
    MeetingData,
    MeetingFeaturesResponse,
)
from app.services.gemini_client import GeminiClient, GeminiError
from app.services.prompt_service import PromptService

logger = logging.getLogger(__name__)

# How many runner-ups the deterministic fallback includes as
# alternative candidates.
FALLBACK_ALTERNATIVE_COUNT = 2

# Uncertainty in the fallback path is derived from how close the
# top two confidence scores are: a tiny gap means the engine itself is
# unsure who the candidate is, so uncertainty should be high. This
# multiplier maps a [0, 1] score gap onto a [0, 1] uncertainty value;
# anything at or above the multiplier's reciprocal is treated as fully
# certain.
FALLBACK_UNCERTAINTY_GAP_SCALE = 2.5


class CandidateIdentificationService:
    """Holds a `PromptService` and a `GeminiClient`. Both are cheap,
    stateless-ish collaborators, so a fresh instance per request is
    fine, but a shared instance works too."""

    def __init__(
        self,
        prompt_service: Optional[PromptService] = None,
        gemini_client: Optional[GeminiClient] = None,
    ):
        self.prompt_service = prompt_service or PromptService()
        self.gemini_client = gemini_client or GeminiClient()

    def identify_candidate(
        self,
        meeting: MeetingData,
        features: MeetingFeaturesResponse,
        confidence: ConfidenceEngineResponse,
    ) -> CandidateIdentificationResult:
        """Runs the full Gemini reasoning step, falling back to a
        deterministic result derived from `confidence` on any failure.
        Never raises -- always returns a usable result."""

        if not self.gemini_client.is_configured():
            logger.info("Gemini client not configured; using fallback candidate identification.")
            return self._fallback_result(confidence)

        try:
            system_prompt = self.prompt_service.build_system_prompt()
            user_prompt = self.prompt_service.build_identification_prompt(
                meeting=meeting, features=features, confidence=confidence
            )
            raw_text = self.gemini_client.generate(system_prompt, user_prompt)
            return self._parse_gemini_response(raw_text, confidence)
        except GeminiError as exc:
            logger.warning("Gemini candidate identification failed, using fallback: %s", exc)
            return self._fallback_result(confidence)
        except (ValueError, KeyError, TypeError) as exc:
            logger.warning("Gemini response could not be parsed, using fallback: %s", exc)
            return self._fallback_result(confidence)

    # -- internal helpers ---------------------------------------------------

    def _parse_gemini_response(
        self, raw_text: str, confidence: ConfidenceEngineResponse
    ) -> CandidateIdentificationResult:
        """Parses and validates Gemini's JSON response into a
        `CandidateIdentificationResult`. Raises `ValueError`/`KeyError`
        on anything malformed so the caller's fallback path takes over
        -- this function never silently invents data."""
        data = json.loads(raw_text)

        known_ids = {p.participant_id for p in confidence.participant_ranking}
        display_names = {p.participant_id: p.display_name for p in confidence.participant_ranking}

        candidate_id = data["candidateParticipantId"]
        if candidate_id not in known_ids:
            raise ValueError(f"Gemini returned an unknown participantId: {candidate_id!r}")

        alternatives: List[AlternativeCandidate] = []
        for alt in data.get("alternativeCandidates", []) or []:
            alt_id = alt["participantId"]
            if alt_id == candidate_id or alt_id not in known_ids:
                # Skip anything that isn't a real, distinct participant
                # rather than failing the whole response over it.
                continue
            alternatives.append(
                AlternativeCandidate(
                    participant_id=alt_id,
                    display_name=alt.get("displayName") or display_names.get(alt_id, ""),
                    likelihood=_clamp01(float(alt.get("likelihood", 0.0))),
                    reason=alt.get("reason", ""),
                )
            )

        uncertainty = _clamp01(float(data["uncertainty"]))

        return CandidateIdentificationResult(
            meeting_id=confidence.meeting_id,
            candidate_participant_id=candidate_id,
            candidate_display_name=data.get("candidateDisplayName") or display_names.get(candidate_id, ""),
            explanation=data.get("explanation", ""),
            alternative_candidates=alternatives,
            uncertainty=uncertainty,
            source="gemini",
            model=self.gemini_client.model_name,
        )

    def _fallback_result(self, confidence: ConfidenceEngineResponse) -> CandidateIdentificationResult:
        """Deterministic, non-AI result derived from the Confidence
        Engine's own ranking: top participant is the candidate, the
        next few ranked participants are the alternatives, and
        uncertainty is derived from how close the top two scores are."""
        ranked = sorted(confidence.participant_ranking, key=lambda entry: entry.rank)
        top = ranked[0]
        runner_ups = ranked[1 : 1 + FALLBACK_ALTERNATIVE_COUNT]

        alternatives = [
            AlternativeCandidate(
                participant_id=entry.participant_id,
                display_name=entry.display_name,
                likelihood=entry.confidence_score,
                reason=entry.reason_summary,
            )
            for entry in runner_ups
        ]

        uncertainty = _fallback_uncertainty(ranked)

        return CandidateIdentificationResult(
            meeting_id=confidence.meeting_id,
            candidate_participant_id=top.participant_id,
            candidate_display_name=top.display_name,
            explanation=top.reason_summary,
            alternative_candidates=alternatives,
            uncertainty=uncertainty,
            source="fallback",
            model="none",
        )


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _fallback_uncertainty(ranked) -> float:
    """The closer the top two confidence scores are, the less certain
    the deterministic fallback can be about who the real candidate is.
    A single participant (no runner-up to compare against) is treated
    as maximally uncertain -- there's no competing evidence to confirm
    the pick either way."""
    if len(ranked) < 2:
        return 1.0

    gap = ranked[0].confidence_score - ranked[1].confidence_score
    uncertainty = 1.0 - min(1.0, max(0.0, gap) * FALLBACK_UNCERTAINTY_GAP_SCALE)
    return round(_clamp01(uncertainty), 4)
