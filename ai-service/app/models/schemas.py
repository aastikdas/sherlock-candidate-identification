"""
Pydantic schemas for the Feature Extraction Service.

Field names are exposed in camelCase over the wire (matching the rest
of the Sherlock stack -- see e.g.
`backend/src/services/participant.service.js`) while staying ordinary
snake_case attributes in Python. `populate_by_name=True` lets the
models be built from either camelCase JSON payloads or snake_case
keyword arguments, which keeps the service easy to reuse from other
Python code as well as over HTTP.
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _to_camel(snake: str) -> str:
    head, *tail = snake.split("_")
    return head + "".join(word.capitalize() for word in tail)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)


# ---------------------------------------------------------------------------
# Input: raw (mocked) meeting telemetry
# ---------------------------------------------------------------------------


class IdentityInfo(CamelModel):
    """A display name + email pair, used for both the expected (invited)
    and observed (actually joined) identity of a participant."""

    display_name: str = ""
    email: str = ""


class SpeakingInfo(CamelModel):
    total_speaking_seconds: float = 0
    speaking_turns: int = 0


class CameraInfo(CamelModel):
    camera_on_seconds: float = 0


class TranscriptInfo(CamelModel):
    word_count: int = 0
    filler_word_count: int = 0
    segments_transcribed: int = 0
    total_speaking_segments: int = 0


class FaceDetectionInfo(CamelModel):
    frames_with_face: int = 0
    total_frames_sampled: int = 0


class ParticipantData(CamelModel):
    """Raw telemetry for a single participant, as it would come off a
    meeting/recording pipeline (mocked for this milestone)."""

    participant_id: str
    expected_identity: IdentityInfo
    observed_identity: IdentityInfo
    join_time: str
    speaking: SpeakingInfo = Field(default_factory=SpeakingInfo)
    camera: CameraInfo = Field(default_factory=CameraInfo)
    transcript: TranscriptInfo = Field(default_factory=TranscriptInfo)
    face_detection: FaceDetectionInfo = Field(default_factory=FaceDetectionInfo)


class MeetingData(CamelModel):
    """Raw telemetry for an entire meeting: participants plus the
    meeting-level context (scheduling/duration) each score is
    computed relative to."""

    meeting_id: str
    scheduled_start_time: str
    meeting_start_time: Optional[str] = None
    meeting_duration_seconds: float
    participants: List[ParticipantData]

    @field_validator("participants")
    @classmethod
    def _require_at_least_one_participant(
        cls, value: List[ParticipantData]
    ) -> List[ParticipantData]:
        """Rejects an empty participant list at the request boundary with
        a clear 422, instead of letting it reach `ConfidenceEngine.score_meeting`
        (see `app.services.confidence_engine`), which has no participant to
        rank and would otherwise surface as an unhandled 500."""
        if not value:
            raise ValueError("meeting.participants must contain at least one participant.")
        return value


# ---------------------------------------------------------------------------
# Output: extracted feature vector
# ---------------------------------------------------------------------------


class ParticipantFeatures(CamelModel):
    """The 8-field, [0, 1]-normalized feature vector for one participant."""

    participant_id: str
    display_name: str
    display_name_similarity: float
    email_similarity: float
    speaking_duration_score: float
    speaking_frequency_score: float
    join_time_score: float
    camera_presence_score: float
    transcript_score: float
    face_presence_score: float


class MeetingFeaturesResponse(CamelModel):
    """Structured output for a whole meeting: one feature vector per
    participant."""

    meeting_id: str
    participant_count: int
    participants: List[ParticipantFeatures]


# ---------------------------------------------------------------------------
# Candidate Confidence Engine: input weights + output ranking
# ---------------------------------------------------------------------------


class ConfidenceWeights(CamelModel):
    """Configurable per-feature weights for the Candidate Confidence
    Engine. Values don't need to sum to 1 -- the engine normalizes by
    the total weight actually applied, so these express *relative*
    importance. Defaults come from `app.core.config`."""

    display_name_similarity: float = 0.20
    email_similarity: float = 0.15
    speaking_duration_score: float = 0.10
    speaking_frequency_score: float = 0.05
    join_time_score: float = 0.10
    camera_presence_score: float = 0.15
    transcript_score: float = 0.10
    face_presence_score: float = 0.15


class EvidenceItem(CamelModel):
    """One line of evidence backing a participant's confidence score:
    the raw feature score, the weight applied to it, and its resulting
    contribution to the final weighted score."""

    feature: str
    raw_score: float
    weight: float
    contribution: float


class ParticipantRankingEntry(CamelModel):
    """A single participant's position in the confidence ranking, along
    with the full evidence trail and a plain-language explanation."""

    participant_id: str
    display_name: str
    confidence_score: float
    rank: int
    evidence: List[EvidenceItem]
    reason_summary: str


class ConfidenceScoreRequest(CamelModel):
    """Request body for `POST /api/confidence/score`. `features` is the
    Feature JSON produced by the Feature Extraction Service; `weights`
    is optional and, when omitted, falls back to
    `DEFAULT_CONFIDENCE_WEIGHTS`."""

    features: MeetingFeaturesResponse
    weights: Optional[ConfidenceWeights] = None


# ---------------------------------------------------------------------------
# Analyze: single integration-friendly entrypoint for external callers
# ---------------------------------------------------------------------------


class AnalyzeRequest(CamelModel):
    """Request body for `POST /api/analyze`. `meeting` is optional raw
    meeting telemetry (see `MeetingData`); when omitted, the endpoint
    runs against the built-in mock meeting data so it stays exercisable
    on its own, e.g. as a smoke test from the Node.js backend."""

    meeting: Optional[MeetingData] = None


class ConfidenceEngineResponse(CamelModel):
    """Output of the Candidate Confidence Engine. Top-level fields
    (`confidenceScore`, `evidence`, `reasonSummary`) describe the
    top-ranked participant -- whichever participant actually scored
    highest, never a hardcoded one -- while `participantRanking` carries
    the fully-detailed ranking for every participant."""

    meeting_id: str
    participant_id: str
    display_name: str
    confidence_score: float
    reason_summary: str
    evidence: List[EvidenceItem]
    participant_ranking: List[ParticipantRankingEntry]
    weights_used: ConfidenceWeights


# ---------------------------------------------------------------------------
# Gemini-backed Candidate Identification: LLM reasoning layer on top of
# the Candidate Confidence Engine's output.
# ---------------------------------------------------------------------------


class AlternativeCandidate(CamelModel):
    """A runner-up participant the model considered but did not pick as
    the top candidate, with its own likelihood and short reason."""

    participant_id: str
    display_name: str
    likelihood: float
    reason: str


class CandidateIdentificationResult(CamelModel):
    """Output of the Gemini-backed Candidate Identification service:
    the identified candidate, a plain-language explanation, the
    runner-up candidates the model weighed, and a calibrated
    uncertainty score.

    `source` is `"gemini"` when the explanation was actually generated
    by the model, or `"fallback"` when `GEMINI_API_KEY` is unset or the
    Gemini call failed -- callers can use it to decide whether to
    surface an "AI-generated" badge, for instance.
    """

    meeting_id: str
    candidate_participant_id: str
    candidate_display_name: str
    explanation: str
    alternative_candidates: List[AlternativeCandidate]
    uncertainty: float
    source: str
    model: str


class CandidateIdentificationRequest(CamelModel):
    """Request body for `POST /api/candidate/identify-from-scores`.

    Bundles the three inputs the prompt is built from: meeting
    metadata, the extracted per-participant feature vectors, and the
    Candidate Confidence Engine's scored ranking. Letting callers pass
    all three directly (rather than only raw telemetry) means the
    Gemini step can be re-run against a given confidence result without
    recomputing features/scores, and keeps this route testable in
    isolation from the rest of the pipeline.
    """

    meeting: MeetingData
    features: MeetingFeaturesResponse
    confidence: ConfidenceEngineResponse


class CandidateIdentifyRequest(CamelModel):
    """Request body for `POST /api/candidate/identify`. `meeting` is
    optional raw meeting telemetry (see `MeetingData`); when omitted,
    the endpoint runs against the built-in mock meeting data, same as
    `POST /api/analyze`."""

    meeting: Optional[MeetingData] = None
    weights: Optional[ConfidenceWeights] = None


# ---------------------------------------------------------------------------
# Merged Candidate Result: the Candidate Confidence Engine's evidence
# trail reconciled with the Gemini Candidate Identification's pick, in
# one flattened shape for callers (namely the Node.js backend) that
# just want "who, how confident, why, and what did the LLM say" without
# juggling two separate response shapes.
# ---------------------------------------------------------------------------


class CandidateSummary(CamelModel):
    """The minimal identity of the identified candidate."""

    participant_id: str
    display_name: str


class MergedCandidateResult(CamelModel):
    """Output of `POST /api/candidate/merged`: the Gemini-identified
    candidate (or the deterministic fallback pick, when Gemini isn't
    configured/available), together with the Candidate Confidence
    Engine's evidence trail *for that same participant* -- not
    necessarily the engine's own top-ranked participant, since Gemini
    is free to disagree with the rule-based ranking.

    - `confidence` / `reason` / `evidence` come from the Confidence
      Engine's `participantRanking` entry matching `candidate`.
    - `llmExplanation` is Gemini's own explanation for the pick (or the
      rule-based `reasonSummary`, on the deterministic fallback path --
      see `CandidateIdentificationResult.source`).
    """

    meeting_id: str
    candidate: CandidateSummary
    confidence: float
    reason: str
    evidence: List[EvidenceItem]
    llm_explanation: str
    uncertainty: float
    source: str
    model: str
    alternative_candidates: List[AlternativeCandidate]
