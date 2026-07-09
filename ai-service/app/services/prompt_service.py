"""
Prompt Service.

Reusable, stateless service whose only job is turning the three inputs
the Candidate Identification pipeline is built on --

  - meeting metadata          (`MeetingData`, minus per-participant
                                telemetry -- just the scheduling/duration
                                context)
  - participant features      (`MeetingFeaturesResponse`, the Feature
                                Extraction Service's [0, 1] vectors)
  - confidence scores         (`ConfidenceEngineResponse`, the Candidate
                                Confidence Engine's weighted ranking +
                                evidence + rule-based reason summaries)

-- into a well-structured Gemini prompt. It never calls the model itself
(see `app.services.gemini_client.GeminiClient`) and never decides what
to do with the model's response (see
`app.services.candidate_identification_service`); it is pure
prompt-construction, which keeps it trivially testable (assert on the
returned string) and reusable from anywhere that needs the same prompt
shape -- a different LLM client, a notebook, a unit test fixture, etc.

Usage:

    from app.services.prompt_service import PromptService

    prompt_service = PromptService()
    system_prompt = prompt_service.build_system_prompt()
    user_prompt = prompt_service.build_identification_prompt(
        meeting=meeting_data,
        features=features_response,
        confidence=confidence_response,
    )
"""

import json
from typing import Any, Dict, List

from app.models.schemas import (
    ConfidenceEngineResponse,
    MeetingData,
    MeetingFeaturesResponse,
)

# How many ranked participants to include in the prompt's evidence
# table. The Confidence Engine already sorts highest-first, so this is
# simply "top N" -- kept modest so the prompt stays small and focused
# even for meetings with many participants.
MAX_PARTICIPANTS_IN_PROMPT = 10

# How many evidence rows (feature/raw/weight/contribution) to include
# per participant. All 8 features fit comfortably, but the cap keeps
# this service correct even if the feature vector grows later.
MAX_EVIDENCE_ROWS_PER_PARTICIPANT = 8

SYSTEM_PROMPT = """You are the Candidate Identification reasoning layer for Sherlock, \
an interview-integrity system that identifies which meeting participant is the \
actual interview candidate (as opposed to an interviewer, observer, or an \
impostor sitting in for the real candidate).

You are given three things, all already computed by upstream, non-AI services:
1. Meeting metadata (scheduling/duration context).
2. Per-participant features: eight independent [0, 1] signals (identity-match \
similarity, speaking behavior, join timing, camera presence, transcript quality, \
face-detection presence).
3. Confidence scores: a transparent, weighted ranking already computed from those \
features, with a per-feature evidence breakdown and a rule-based reason summary.

Your job is NOT to recompute the scores. Treat the confidence ranking as strong, \
trustworthy prior evidence. Your job is to:
- Decide which participant is most likely the actual candidate, in light of that \
evidence (normally, but not always, the top-ranked participant).
- Explain the decision in clear, plain language a non-technical interviewer could read.
- Identify plausible alternative candidates (if any) and why they were not chosen.
- State your own uncertainty honestly -- a number in [0, 1], where 0 means \
completely certain and 1 means a coin flip -- based on how close/ambiguous the \
evidence is, not on the underlying confidenceScore alone.

Respond with ONLY a single JSON object (no markdown fences, no prose before or \
after it) matching exactly this shape:

{
  "candidateParticipantId": string,
  "candidateDisplayName": string,
  "explanation": string,
  "alternativeCandidates": [
    { "participantId": string, "displayName": string, "likelihood": number, "reason": string }
  ],
  "uncertainty": number
}

Rules:
- "candidateParticipantId" MUST be one of the participantIds given to you.
- "alternativeCandidates" MUST NOT include the chosen candidate, and MAY be an \
empty array when no other participant is plausible.
- "likelihood" values are independent [0, 1] scores (not required to sum to 1).
- "uncertainty" MUST be a single number in [0, 1].
- Do not invent participants, names, or facts not present in the input."""


class PromptService:
    """Stateless -- safe to instantiate once and share."""

    def build_system_prompt(self) -> str:
        """Returns the fixed system/instructions prompt. Split out from
        the per-request user prompt so callers (e.g. `GeminiClient`) can
        pass it as a distinct `system_instruction` where the underlying
        SDK supports that, without re-deriving it each time."""
        return SYSTEM_PROMPT

    def build_identification_prompt(
        self,
        meeting: MeetingData,
        features: MeetingFeaturesResponse,
        confidence: ConfidenceEngineResponse,
    ) -> str:
        """Builds the per-request user prompt: meeting metadata,
        participant features, and confidence scores, serialized as
        compact JSON the model can read unambiguously, followed by a
        short restatement of the task.

        Deliberately data-first (JSON) rather than prose-first -- large
        language models are reliable at reading structured JSON, and it
        avoids any lossy paraphrasing of the actual numbers.
        """
        payload = {
            "meeting": self._meeting_metadata(meeting),
            "participants": self._participant_rows(features, confidence),
        }

        return (
            "Here is the meeting data, extracted participant features, and "
            "confidence scores for one meeting:\n\n"
            f"{json.dumps(payload, indent=2)}\n\n"
            "Identify the actual interview candidate and respond with the JSON "
            "object described in your instructions -- nothing else."
        )

    # -- internal helpers ---------------------------------------------------

    def _meeting_metadata(self, meeting: MeetingData) -> Dict[str, Any]:
        """Meeting-level context only -- deliberately excludes raw
        per-participant telemetry, since that's already been distilled
        into `features`/`confidence` and repeating it would just bloat
        the prompt without adding signal."""
        return {
            "meetingId": meeting.meeting_id,
            "scheduledStartTime": meeting.scheduled_start_time,
            "meetingStartTime": meeting.meeting_start_time,
            "meetingDurationSeconds": meeting.meeting_duration_seconds,
            "participantCount": len(meeting.participants),
        }

    def _participant_rows(
        self,
        features: MeetingFeaturesResponse,
        confidence: ConfidenceEngineResponse,
    ) -> List[Dict[str, Any]]:
        """Joins each participant's feature vector with its confidence
        ranking entry (by `participantId`), ordered by rank (best
        evidence first) and capped at `MAX_PARTICIPANTS_IN_PROMPT`."""
        features_by_id = {p.participant_id: p for p in features.participants}
        ranking_by_id = {e.participant_id: e for e in confidence.participant_ranking}

        ranked = sorted(
            confidence.participant_ranking, key=lambda entry: entry.rank
        )[:MAX_PARTICIPANTS_IN_PROMPT]

        rows: List[Dict[str, Any]] = []
        for entry in ranked:
            participant_features = features_by_id.get(entry.participant_id)
            ranking_entry = ranking_by_id.get(entry.participant_id, entry)

            rows.append(
                {
                    "participantId": entry.participant_id,
                    "displayName": entry.display_name,
                    "rank": entry.rank,
                    "confidenceScore": entry.confidence_score,
                    "reasonSummary": ranking_entry.reason_summary,
                    "features": self._feature_summary(participant_features),
                    "evidence": [
                        {
                            "feature": item.feature,
                            "rawScore": item.raw_score,
                            "weight": item.weight,
                            "contribution": item.contribution,
                        }
                        for item in ranking_entry.evidence[:MAX_EVIDENCE_ROWS_PER_PARTICIPANT]
                    ],
                }
            )
        return rows

    def _feature_summary(self, participant_features) -> Dict[str, float]:
        if participant_features is None:
            return {}
        return {
            "displayNameSimilarity": participant_features.display_name_similarity,
            "emailSimilarity": participant_features.email_similarity,
            "speakingDurationScore": participant_features.speaking_duration_score,
            "speakingFrequencyScore": participant_features.speaking_frequency_score,
            "joinTimeScore": participant_features.join_time_score,
            "cameraPresenceScore": participant_features.camera_presence_score,
            "transcriptScore": participant_features.transcript_score,
            "facePresenceScore": participant_features.face_presence_score,
        }
