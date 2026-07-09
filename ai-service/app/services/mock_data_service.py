"""
Mock meeting data generator.

Produces a self-contained, deterministic "meeting" payload shaped like
what a real meeting/telemetry pipeline would eventually hand to the
Feature Extraction Service: identity info (expected vs. observed), join
timing, speaking activity, camera activity, transcript stats, and
face-detection sampling.

This is intentionally the ONLY place mock data lives, so a future
milestone can swap it for a real data source (e.g. the Node.js backend
or a database) without touching any scoring logic. Nothing in this
module talks to the backend -- it is pure in-process mock data.
"""

from typing import Any, Dict

MOCK_MEETING_ID = "meeting-mock-001"
MOCK_SCHEDULED_START_TIME = "2026-07-08T10:00:00.000Z"
MOCK_MEETING_START_TIME = "2026-07-08T10:01:00.000Z"
MOCK_MEETING_DURATION_SECONDS = 1800  # 30 minutes


def get_mock_meeting_data() -> Dict[str, Any]:
    """Returns a fresh mock meeting payload (camelCase keys, JSON-ready).

    Includes a deliberate mix of scenarios so the extracted features are
    meaningfully different per participant:
      - p-001: identity matches, healthy engagement (model participant).
      - p-002: minor display-name variation, otherwise solid.
      - p-003: identity mismatch + near-absent participation (suspicious).
      - p-004: identity matches, but joined late with low camera presence.
    """

    return {
        "meetingId": MOCK_MEETING_ID,
        "scheduledStartTime": MOCK_SCHEDULED_START_TIME,
        "meetingStartTime": MOCK_MEETING_START_TIME,
        "meetingDurationSeconds": MOCK_MEETING_DURATION_SECONDS,
        "participants": [
            {
                "participantId": "p-001",
                "expectedIdentity": {"displayName": "Jane Doe", "email": "jane.doe@example.com"},
                "observedIdentity": {"displayName": "Jane Doe", "email": "jane.doe@example.com"},
                "joinTime": "2026-07-08T10:00:40.000Z",
                "speaking": {"totalSpeakingSeconds": 620, "speakingTurns": 24},
                "camera": {"cameraOnSeconds": 1740},
                "transcript": {
                    "wordCount": 1450,
                    "fillerWordCount": 40,
                    "segmentsTranscribed": 23,
                    "totalSpeakingSegments": 24,
                },
                "faceDetection": {"framesWithFace": 570, "totalFramesSampled": 600},
            },
            {
                "participantId": "p-002",
                "expectedIdentity": {"displayName": "Alex Kim", "email": "alex.kim@example.com"},
                "observedIdentity": {"displayName": "Alex J. Kim", "email": "alex.kim@example.com"},
                "joinTime": "2026-07-08T10:01:20.000Z",
                "speaking": {"totalSpeakingSeconds": 356, "speakingTurns": 18},
                "camera": {"cameraOnSeconds": 1600},
                "transcript": {
                    "wordCount": 900,
                    "fillerWordCount": 30,
                    "segmentsTranscribed": 17,
                    "totalSpeakingSegments": 18,
                },
                "faceDetection": {"framesWithFace": 540, "totalFramesSampled": 600},
            },
            {
                "participantId": "p-003",
                "expectedIdentity": {"displayName": "Sam Patel", "email": "sam.patel@example.com"},
                "observedIdentity": {"displayName": "Guest User", "email": "guest47@mailinator.com"},
                "joinTime": "2026-07-08T10:03:45.000Z",
                "speaking": {"totalSpeakingSeconds": 48, "speakingTurns": 3},
                "camera": {"cameraOnSeconds": 0},
                "transcript": {
                    "wordCount": 70,
                    "fillerWordCount": 15,
                    "segmentsTranscribed": 1,
                    "totalSpeakingSegments": 3,
                },
                "faceDetection": {"framesWithFace": 0, "totalFramesSampled": 600},
            },
            {
                "participantId": "p-004",
                "expectedIdentity": {"displayName": "Priya Nair", "email": "priya.nair@example.com"},
                "observedIdentity": {"displayName": "Priya Nair", "email": "priya.nair@example.com"},
                "joinTime": "2026-07-08T10:14:10.000Z",
                "speaking": {"totalSpeakingSeconds": 210, "speakingTurns": 9},
                "camera": {"cameraOnSeconds": 300},
                "transcript": {
                    "wordCount": 480,
                    "fillerWordCount": 60,
                    "segmentsTranscribed": 7,
                    "totalSpeakingSegments": 9,
                },
                "faceDetection": {"framesWithFace": 180, "totalFramesSampled": 600},
            },
        ],
    }
