"""
Candidate Confidence Engine API routes.

Exposes the reusable `ConfidenceEngine` over HTTP. The primary route is
`POST /api/confidence/score`, which takes Feature JSON (the output
shape of `GET /api/features/extract`) plus optional custom weights and
returns the confidence ranking. `GET /api/confidence/score` is a
convenience route that runs the full mock pipeline (mock meeting data
-> Feature Extraction Service -> Confidence Engine) for a quick smoke
test without hand-building a payload.

Intentionally NOT wired to the Node.js backend directly -- the backend
integrates via `POST /api/analyze` (see `app.api.analyze_router`),
which composes this same engine. These routes remain for exercising
the Confidence Engine in isolation.
"""

from fastapi import APIRouter

from app.models.schemas import (
    ConfidenceEngineResponse,
    ConfidenceScoreRequest,
    ConfidenceWeights,
    MeetingData,
)
from app.services.confidence_engine import ConfidenceEngine
from app.services.feature_extraction_service import FeatureExtractionService
from app.services.mock_data_service import get_mock_meeting_data

router = APIRouter(prefix="/api/confidence", tags=["confidence"])

_feature_service = FeatureExtractionService()


@router.get("/weights", response_model=ConfidenceWeights)
def get_default_weights() -> ConfidenceWeights:
    """Returns the default (fully configurable) weight set the engine
    uses when the caller doesn't supply its own."""
    return ConfidenceWeights()


@router.get("/score", response_model=ConfidenceEngineResponse)
def score_mock_meeting() -> ConfidenceEngineResponse:
    """Runs the full pipeline against the built-in mock meeting data,
    using the default weights: mock telemetry -> extracted features ->
    confidence ranking."""
    meeting = MeetingData.model_validate(get_mock_meeting_data())
    features = _feature_service.extract_meeting_features(meeting)
    engine = ConfidenceEngine()
    return engine.score_meeting(features)


@router.post("/score", response_model=ConfidenceEngineResponse)
def score_from_features(request: ConfidenceScoreRequest) -> ConfidenceEngineResponse:
    """Runs the Confidence Engine against caller-supplied Feature JSON.

    `weights` is optional; any omitted feature falls back to the
    corresponding default weight, so callers can override just the
    weights they care about.
    """
    weights = request.weights.model_dump(by_alias=True) if request.weights else None
    engine = ConfidenceEngine(weights=weights)
    return engine.score_meeting(request.features)
