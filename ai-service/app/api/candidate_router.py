"""
Candidate Identification API routes.

Exposes the Gemini-backed `CandidateIdentificationService` over HTTP.

- `POST /api/candidate/identify` is the integration-friendly entrypoint
  (mirrors `POST /api/analyze`): runs the full pipeline (telemetry ->
  Feature Extraction Service -> Candidate Confidence Engine -> Gemini
  Candidate Identification) from raw meeting telemetry, falling back to
  the built-in mock meeting data when `meeting` is omitted.
- `POST /api/candidate/identify-from-scores` runs only the last step,
  against caller-supplied meeting metadata, features, and a confidence
  result -- lets the Gemini step be exercised/re-run in isolation
  without recomputing the earlier pipeline stages.
- `GET /api/candidate/identify` is a convenience route that runs the
  full mock pipeline for a quick smoke test.

Every route returns a `CandidateIdentificationResult` no matter what --
see `CandidateIdentificationService`'s fallback behavior -- so none of
these ever fail merely because `GEMINI_API_KEY` is unset.
"""

from typing import Optional

from fastapi import APIRouter

from app.models.schemas import (
    CandidateIdentificationRequest,
    CandidateIdentificationResult,
    CandidateIdentifyRequest,
    ConfidenceWeights,
    MeetingData,
    MergedCandidateResult,
)
from app.services.candidate_identification_service import CandidateIdentificationService
from app.services.candidate_merge_service import merge_confidence_and_identification
from app.services.confidence_engine import ConfidenceEngine
from app.services.feature_extraction_service import FeatureExtractionService
from app.services.mock_data_service import get_mock_meeting_data

router = APIRouter(prefix="/api/candidate", tags=["candidate"])

_feature_service = FeatureExtractionService()
_identification_service = CandidateIdentificationService()


def _run_full_pipeline(
    meeting: MeetingData, weights: Optional[ConfidenceWeights] = None
) -> CandidateIdentificationResult:
    features = _feature_service.extract_meeting_features(meeting)
    engine = ConfidenceEngine(weights=weights.model_dump(by_alias=True) if weights else None)
    confidence = engine.score_meeting(features)
    return _identification_service.identify_candidate(meeting, features, confidence)


def _run_merged_pipeline(
    meeting: MeetingData, weights: Optional[ConfidenceWeights] = None
) -> MergedCandidateResult:
    """Runs the full pipeline (telemetry -> features -> confidence ->
    Gemini candidate identification) and reconciles the two results
    into one flattened `MergedCandidateResult` -- see
    `app.services.candidate_merge_service`.
    """
    features = _feature_service.extract_meeting_features(meeting)
    engine = ConfidenceEngine(weights=weights.model_dump(by_alias=True) if weights else None)
    confidence = engine.score_meeting(features)
    identification = _identification_service.identify_candidate(meeting, features, confidence)
    return merge_confidence_and_identification(confidence, identification)


@router.get("/identify", response_model=CandidateIdentificationResult)
def identify_from_mock_meeting() -> CandidateIdentificationResult:
    """Runs the full pipeline against the built-in mock meeting data,
    using the default confidence weights."""
    meeting = MeetingData.model_validate(get_mock_meeting_data())
    return _run_full_pipeline(meeting)


@router.post("/identify", response_model=CandidateIdentificationResult)
def identify(request: Optional[CandidateIdentifyRequest] = None) -> CandidateIdentificationResult:
    """Runs the full pipeline for a meeting: telemetry -> features ->
    confidence ranking -> Gemini candidate identification.

    If `meeting` is omitted (or the request body is empty), falls back
    to the built-in mock meeting data, same as `POST /api/analyze`.
    """
    meeting = (request.meeting if request else None) or MeetingData.model_validate(
        get_mock_meeting_data()
    )
    weights = request.weights if request else None
    return _run_full_pipeline(meeting, weights=weights)


@router.post("/identify-from-scores", response_model=CandidateIdentificationResult)
def identify_from_scores(request: CandidateIdentificationRequest) -> CandidateIdentificationResult:
    """Runs only the Gemini reasoning step against caller-supplied
    meeting metadata, Feature JSON, and a Confidence Engine result --
    e.g. to re-run identification against an already-computed ranking
    without recomputing it."""
    return _identification_service.identify_candidate(
        meeting=request.meeting,
        features=request.features,
        confidence=request.confidence,
    )


@router.get("/merged", response_model=MergedCandidateResult)
def merged_from_mock_meeting() -> MergedCandidateResult:
    """Runs the full pipeline against the built-in mock meeting data,
    using the default confidence weights, and returns the merged
    candidate + confidence + evidence + Gemini explanation shape.
    """
    meeting = MeetingData.model_validate(get_mock_meeting_data())
    return _run_merged_pipeline(meeting)


@router.post("/merged", response_model=MergedCandidateResult)
def merged(request: Optional[CandidateIdentifyRequest] = None) -> MergedCandidateResult:
    """Runs the full pipeline for a meeting (telemetry -> features ->
    confidence ranking -> Gemini candidate identification) and returns
    the Candidate Confidence Engine's evidence for the identified
    candidate merged with Gemini's explanation, in one flattened shape:
    `candidate`, `confidence`, `reason`, `evidence`, `llmExplanation`.

    If `meeting` is omitted (or the request body is empty), falls back
    to the built-in mock meeting data, same as `POST /api/analyze`.
    """
    meeting = (request.meeting if request else None) or MeetingData.model_validate(
        get_mock_meeting_data()
    )
    weights = request.weights if request else None
    return _run_merged_pipeline(meeting, weights=weights)
