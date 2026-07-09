"""
Feature Extraction Service.

Reusable, stateless service that turns raw (mocked) meeting telemetry
into a flat, normalized feature vector per participant. Every score is
a deterministic heuristic in the [0, 1] range -- no AI/ML models are
used anywhere in this module, and it has no dependency on the Node.js
backend; it operates purely on the meeting-data shape defined in
`app.models.schemas`.

Usage:

    from app.services.feature_extraction_service import FeatureExtractionService
    from app.services.mock_data_service import get_mock_meeting_data
    from app.models.schemas import MeetingData

    service = FeatureExtractionService()
    meeting = MeetingData.model_validate(get_mock_meeting_data())
    result = service.extract_meeting_features(meeting)
"""

from app.models.schemas import (
    MeetingData,
    MeetingFeaturesResponse,
    ParticipantData,
    ParticipantFeatures,
)
from app.services import scorers


class FeatureExtractionService:
    """Stateless -- safe to instantiate once and share across requests."""

    def extract_participant_features(
        self,
        participant: ParticipantData,
        meeting_duration_seconds: float,
        scheduled_start_time: str,
    ) -> ParticipantFeatures:
        """Computes the full 8-field feature vector for a single participant."""

        return ParticipantFeatures(
            participant_id=participant.participant_id,
            display_name=participant.observed_identity.display_name,
            display_name_similarity=scorers.score_display_name_similarity(
                participant.expected_identity.display_name,
                participant.observed_identity.display_name,
            ),
            email_similarity=scorers.score_email_similarity(
                participant.expected_identity.email,
                participant.observed_identity.email,
            ),
            speaking_duration_score=scorers.score_speaking_duration(
                participant.speaking.total_speaking_seconds,
                meeting_duration_seconds,
            ),
            speaking_frequency_score=scorers.score_speaking_frequency(
                participant.speaking.speaking_turns,
                meeting_duration_seconds,
            ),
            join_time_score=scorers.score_join_time(
                scheduled_start_time,
                participant.join_time,
            ),
            camera_presence_score=scorers.score_camera_presence(
                participant.camera.camera_on_seconds,
                meeting_duration_seconds,
            ),
            transcript_score=scorers.score_transcript(
                participant.transcript.segments_transcribed,
                participant.transcript.total_speaking_segments,
                participant.transcript.word_count,
                participant.transcript.filler_word_count,
            ),
            face_presence_score=scorers.score_face_presence(
                participant.face_detection.frames_with_face,
                participant.face_detection.total_frames_sampled,
            ),
        )

    def extract_meeting_features(self, meeting: MeetingData) -> MeetingFeaturesResponse:
        """Computes a feature vector for every participant in a meeting."""

        participant_features = [
            self.extract_participant_features(
                participant,
                meeting.meeting_duration_seconds,
                meeting.scheduled_start_time,
            )
            for participant in meeting.participants
        ]

        return MeetingFeaturesResponse(
            meeting_id=meeting.meeting_id,
            participant_count=len(participant_features),
            participants=participant_features,
        )
