"""
Feature extraction API routes.

Exposes the reusable `FeatureExtractionService` over HTTP so it can be
exercised on its own. The Node.js backend integrates via `POST
/api/analyze` (see `app.api.analyze_router`) rather than calling this
router directly. All data here is generated in-process by
`app.services.mock_data_service`, or supplied directly by the caller
for the POST route.
"""

from fastapi import APIRouter

from app.models.schemas import MeetingData, MeetingFeaturesResponse
from app.services.feature_extraction_service import FeatureExtractionService
from app.services.mock_data_service import get_mock_meeting_data

router = APIRouter(prefix="/api/features", tags=["features"])

# Stateless service -- one shared instance is fine.
_service = FeatureExtractionService()


@router.get("/mock-meeting")
def get_mock_meeting() -> dict:
    """Returns the raw mock meeting payload the extractor would consume."""
    return get_mock_meeting_data()


@router.get("/extract", response_model=MeetingFeaturesResponse)
def extract_from_mock_meeting() -> MeetingFeaturesResponse:
    """Runs feature extraction against the built-in mock meeting data."""
    meeting = MeetingData.model_validate(get_mock_meeting_data())
    return _service.extract_meeting_features(meeting)


@router.post("/extract", response_model=MeetingFeaturesResponse)
def extract_from_payload(meeting: MeetingData) -> MeetingFeaturesResponse:
    """Runs feature extraction against a caller-supplied meeting payload.

    Lets the service be exercised/tested with custom data while staying
    fully decoupled from any real backend integration.
    """
    return _service.extract_meeting_features(meeting)
