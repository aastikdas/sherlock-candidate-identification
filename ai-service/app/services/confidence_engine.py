"""
Candidate Confidence Engine.

Reusable, stateless service that turns a participant feature vector
(the "Feature JSON" produced by the Feature Extraction Service) into:

  - a per-participant weighted confidenceScore
  - a full participantRanking (every participant, ordered highest-first)
  - evidence: a transparent breakdown of which features drove the score
  - reasonSummary: a short, rule-based plain-language explanation

No AI/ML models are used -- confidence is a configurable weighted
average of the normalized [0, 1] feature scores. Weights are supplied
by `app.core.config.DEFAULT_CONFIDENCE_WEIGHTS` and can be overridden
per-instance/per-request. Every participant is scored with the exact
same weight configuration; the top-ranked participant is simply
whichever one happens to score highest -- nothing here ever hardcodes
or special-cases a specific participant.

Usage:

    from app.services.confidence_engine import ConfidenceEngine

    engine = ConfidenceEngine()                       # default weights
    result = engine.score_meeting(features)

    engine = ConfidenceEngine(weights={"emailSimilarity": 0.5})  # override
"""

from typing import Dict, List, Optional

from app.core.config import DEFAULT_CONFIDENCE_WEIGHTS
from app.models.schemas import (
    ConfidenceEngineResponse,
    ConfidenceWeights,
    EvidenceItem,
    MeetingFeaturesResponse,
    ParticipantFeatures,
    ParticipantRankingEntry,
)

# Short, plain-language labels used to build the rule-based reason
# summary. Kept as simple lookup tables (not templated prose generation)
# so the summary stays deterministic and auditable -- no AI/NLP here.
FEATURE_LABELS_POSITIVE: Dict[str, str] = {
    "displayNameSimilarity": "display name matches the invited candidate",
    "emailSimilarity": "email matches the invited candidate",
    "speakingDurationScore": "healthy amount of speaking time",
    "speakingFrequencyScore": "healthy speaking-turn frequency",
    "joinTimeScore": "joined promptly",
    "cameraPresenceScore": "camera was on for most of the meeting",
    "transcriptScore": "transcript is complete and clear",
    "facePresenceScore": "face was consistently visible on camera",
}

FEATURE_LABELS_NEGATIVE: Dict[str, str] = {
    "displayNameSimilarity": "display name does not match the invited candidate",
    "emailSimilarity": "email does not match the invited candidate",
    "speakingDurationScore": "spoke unusually little or dominated the conversation",
    "speakingFrequencyScore": "unusual speaking-turn frequency",
    "joinTimeScore": "joined significantly late",
    "cameraPresenceScore": "camera was off for most of the meeting",
    "transcriptScore": "transcript is incomplete or unclear",
    "facePresenceScore": "face was rarely visible on camera",
}

# Thresholds used to classify a feature as "supporting" or "concerning"
# evidence when building the reason summary. Scores strictly between
# the two are treated as neutral and left out of the summary so it
# stays focused on what actually moved the needle.
POSITIVE_EVIDENCE_THRESHOLD = 0.7
NEGATIVE_EVIDENCE_THRESHOLD = 0.4

# Confidence-score bands used only for the human-readable summary tier
# ("High"/"Moderate"/"Low"); the numeric confidenceScore is what should
# actually be used for any downstream logic.
HIGH_CONFIDENCE_THRESHOLD = 0.7
MODERATE_CONFIDENCE_THRESHOLD = 0.4


class ConfidenceEngine:
    """Stateless -- safe to instantiate once and share, or fresh
    per-request when custom weights are supplied."""

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        merged = dict(DEFAULT_CONFIDENCE_WEIGHTS)
        if weights:
            merged.update(weights)
        self.weights: Dict[str, float] = merged

    def score_participant(self, participant: ParticipantFeatures) -> ParticipantRankingEntry:
        """Computes the weighted confidence score, evidence breakdown,
        and reason summary for a single participant. `rank` is left at
        0 here -- it's only meaningful relative to the rest of the
        meeting, and is filled in by `score_meeting`."""

        raw_scores = _feature_scores(participant)
        evidence: List[EvidenceItem] = []
        weighted_sum = 0.0
        weight_total = 0.0

        for feature_name, raw_score in raw_scores.items():
            weight = self.weights.get(feature_name, 0.0)
            contribution = raw_score * weight
            weighted_sum += contribution
            weight_total += weight

            evidence.append(
                EvidenceItem(
                    feature=feature_name,
                    raw_score=round(raw_score, 4),
                    weight=round(weight, 4),
                    contribution=round(contribution, 4),
                )
            )

        confidence_score = round(weighted_sum / weight_total, 4) if weight_total else 0.0

        return ParticipantRankingEntry(
            participant_id=participant.participant_id,
            display_name=participant.display_name,
            confidence_score=confidence_score,
            rank=0,
            evidence=evidence,
            reason_summary=_build_reason_summary(participant.display_name, confidence_score, evidence),
        )

    def score_meeting(self, features: MeetingFeaturesResponse) -> ConfidenceEngineResponse:
        """Scores every participant in a meeting, ranks them by
        confidenceScore (highest first), and returns the top-ranked
        participant alongside the full ranking.

        Raises ValueError if the meeting has no participants -- there
        is no top participant to return in that case.
        """

        if not features.participants:
            raise ValueError("Cannot compute confidence ranking: meeting has no participants.")

        scored = [self.score_participant(p) for p in features.participants]

        # Rank strictly by confidence score, highest first. Ties break
        # on participant_id for a stable, deterministic order -- never
        # by favoring any specific participant.
        ranked = sorted(scored, key=lambda entry: (-entry.confidence_score, entry.participant_id))
        for position, entry in enumerate(ranked, start=1):
            entry.rank = position

        top = ranked[0]

        return ConfidenceEngineResponse(
            meeting_id=features.meeting_id,
            participant_id=top.participant_id,
            display_name=top.display_name,
            confidence_score=top.confidence_score,
            reason_summary=top.reason_summary,
            evidence=top.evidence,
            participant_ranking=ranked,
            weights_used=ConfidenceWeights.model_validate(self.weights),
        )


def _feature_scores(participant: ParticipantFeatures) -> Dict[str, float]:
    """Maps a ParticipantFeatures instance to the flat
    {featureName: score} dict the engine scores against. The keys here
    must match `app.core.config.DEFAULT_CONFIDENCE_WEIGHTS`."""
    return {
        "displayNameSimilarity": participant.display_name_similarity,
        "emailSimilarity": participant.email_similarity,
        "speakingDurationScore": participant.speaking_duration_score,
        "speakingFrequencyScore": participant.speaking_frequency_score,
        "joinTimeScore": participant.join_time_score,
        "cameraPresenceScore": participant.camera_presence_score,
        "transcriptScore": participant.transcript_score,
        "facePresenceScore": participant.face_presence_score,
    }


def _build_reason_summary(display_name: str, confidence_score: float, evidence: List[EvidenceItem]) -> str:
    """Builds a short, rule-based (non-AI) plain-language summary that
    calls out the strongest supporting and concerning signals."""

    positives = sorted(
        (e for e in evidence if e.raw_score >= POSITIVE_EVIDENCE_THRESHOLD),
        key=lambda e: e.contribution,
        reverse=True,
    )
    negatives = sorted(
        (e for e in evidence if e.raw_score < NEGATIVE_EVIDENCE_THRESHOLD),
        key=lambda e: e.weight,
        reverse=True,
    )

    if confidence_score >= HIGH_CONFIDENCE_THRESHOLD:
        tier = "High"
    elif confidence_score >= MODERATE_CONFIDENCE_THRESHOLD:
        tier = "Moderate"
    else:
        tier = "Low"

    parts = [f"{tier} confidence ({confidence_score:.2f}) for {display_name}."]

    if positives:
        labels = [FEATURE_LABELS_POSITIVE[e.feature] for e in positives[:2]]
        parts.append("Supported by: " + "; ".join(labels) + ".")

    if negatives:
        labels = [FEATURE_LABELS_NEGATIVE[e.feature] for e in negatives[:2]]
        parts.append("Concerns: " + "; ".join(labels) + ".")

    if not positives and not negatives:
        parts.append("No strongly positive or negative signals; scores were mixed or neutral.")

    return " ".join(parts)
