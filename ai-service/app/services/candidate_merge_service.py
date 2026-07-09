"""
Candidate Merge Service.

Reconciles the two things the rest of this service produces separately:

  - `ConfidenceEngineResponse`  -- a rule-based, fully auditable
    evidence trail (per-feature scores, weights, contributions) for
    *every* participant, ranked by a weighted confidenceScore.
  - `CandidateIdentificationResult` -- Gemini's (or, on fallback, the
    deterministic pick's) chosen candidate, plain-language explanation,
    runner-ups, and calibrated uncertainty.

`merge_confidence_and_identification` combines them into one flattened
`MergedCandidateResult`: the identified candidate, together with the
Confidence Engine's evidence trail *for that same participant*.

This last point matters: Gemini is free to disagree with the
Confidence Engine's own top-ranked participant (e.g. it may weigh a
piece of transcript context the rule-based engine can't see), so the
merge always looks up the ranking entry that matches whichever
candidate was actually identified, rather than assuming it's always
`confidence.participantRanking[0]`.
"""

from app.models.schemas import (
    CandidateIdentificationResult,
    CandidateSummary,
    ConfidenceEngineResponse,
    MergedCandidateResult,
)


def merge_confidence_and_identification(
    confidence: ConfidenceEngineResponse,
    identification: CandidateIdentificationResult,
) -> MergedCandidateResult:
    """Builds a `MergedCandidateResult` from a Confidence Engine result
    and a Candidate Identification result computed against the same
    meeting.

    Looks up the `participantRanking` entry for
    `identification.candidateParticipantId`; if, for any reason, that
    participant isn't present in the ranking (e.g. the two results were
    computed against different meetings), falls back to the Confidence
    Engine's own top-ranked participant so the merge never raises.
    """

    matching_entry = next(
        (
            entry
            for entry in confidence.participant_ranking
            if entry.participant_id == identification.candidate_participant_id
        ),
        None,
    )

    if matching_entry is not None:
        confidence_score = matching_entry.confidence_score
        reason = matching_entry.reason_summary
        evidence = matching_entry.evidence
    else:
        confidence_score = confidence.confidence_score
        reason = confidence.reason_summary
        evidence = confidence.evidence

    return MergedCandidateResult(
        meeting_id=confidence.meeting_id,
        candidate=CandidateSummary(
            participant_id=identification.candidate_participant_id,
            display_name=identification.candidate_display_name,
        ),
        confidence=confidence_score,
        reason=reason,
        evidence=evidence,
        llm_explanation=identification.explanation,
        uncertainty=identification.uncertainty,
        source=identification.source,
        model=identification.model,
        alternative_candidates=identification.alternative_candidates,
    )
