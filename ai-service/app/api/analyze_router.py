"""
Analyze API route.

Single, integration-friendly entrypoint for external callers -- namely
the Node.js backend. `POST /api/analyze` runs the full pipeline
(telemetry -> Feature Extraction Service -> Candidate Confidence Engine)
and returns the confidence ranking in one call, so callers don't need to
know about the two-step `/api/features` -> `/api/confidence` pipeline
exposed elsewhere. Internally it just composes those same reusable
services; no logic is duplicated here.
"""

from typing import Optional

from fastapi import APIRouter

from app.models.schemas import AnalyzeRequest, ConfidenceEngineResponse, MeetingData
from app.services.confidence_engine import ConfidenceEngine
from app.services.feature_extraction_service import FeatureExtractionService
from app.services.mock_data_service import get_mock_meeting_data

router = APIRouter(prefix="/api", tags=["analyze"])

_feature_service = FeatureExtractionService()


@router.post("/analyze", response_model=ConfidenceEngineResponse)
def analyze(request: Optional[AnalyzeRequest] = None) -> ConfidenceEngineResponse:
    """Runs the full confidence pipeline for a meeting.

    If `meeting` is omitted (or the request body is empty), falls back
    to the built-in mock meeting data so the route is exercisable
    standalone -- e.g. as a connectivity smoke test from the Node.js
    backend -- without a hand-built payload.
    """
    meeting = (request.meeting if request else None) or MeetingData.model_validate(
        get_mock_meeting_data()
    )
    features = _feature_service.extract_meeting_features(meeting)
    engine = ConfidenceEngine()
    return engine.score_meeting(features)
