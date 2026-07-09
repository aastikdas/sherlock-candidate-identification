"""
Individual score calculators for participant feature extraction.

Each function is intentionally small, pure, and independently testable:
given primitive inputs it returns a single float clamped to [0, 1]. No
AI/ML models are involved anywhere in this module -- every score is a
deterministic heuristic derived from mock meeting telemetry (identity
strings, join events, speaking activity, camera activity, transcript
stats, and face-detection sampling).
"""

from datetime import datetime
from typing import Optional

from app.utils.math_utils import clamp, safe_ratio, triangular_score
from app.utils.similarity import email_similarity, string_similarity

# ---------------------------------------------------------------------------
# Identity scores
# ---------------------------------------------------------------------------


def score_display_name_similarity(expected_name: str, observed_name: str) -> float:
    """How closely the name shown in the meeting matches the invited name."""
    return string_similarity(expected_name, observed_name)


def score_email_similarity(expected_email: str, observed_email: str) -> float:
    """How closely the meeting account's email matches the invited email."""
    return email_similarity(expected_email, observed_email)


# ---------------------------------------------------------------------------
# Engagement scores
# ---------------------------------------------------------------------------

# "Ideal" participation band: a participant speaking for roughly
# 5%-85% of the meeting, peaking around a third of the meeting, is
# treated as healthy engagement. Below/above that band the score
# tapers back down to 0 (near-silent or dominating the whole call).
SPEAKING_DURATION_LOW_RATIO = 0.05
SPEAKING_DURATION_TARGET_RATIO = 0.35
SPEAKING_DURATION_HIGH_RATIO = 0.85


def score_speaking_duration(total_speaking_seconds: float, meeting_duration_seconds: float) -> float:
    """Rewards a healthy share of speaking time relative to meeting length."""
    ratio = safe_ratio(total_speaking_seconds, meeting_duration_seconds)
    score = triangular_score(
        ratio,
        SPEAKING_DURATION_LOW_RATIO,
        SPEAKING_DURATION_TARGET_RATIO,
        SPEAKING_DURATION_HIGH_RATIO,
    )
    return round(clamp(score), 4)


# Speaking turns per minute -- too few suggests disengagement, too many
# (rapid back-and-forth interruption) suggests a chaotic exchange rather
# than natural conversation.
SPEAKING_FREQUENCY_LOW_PER_MIN = 0.1
SPEAKING_FREQUENCY_TARGET_PER_MIN = 1.0
SPEAKING_FREQUENCY_HIGH_PER_MIN = 4.0


def score_speaking_frequency(speaking_turns: int, meeting_duration_seconds: float) -> float:
    """Rewards a healthy rate of speaking turns per minute."""
    minutes = safe_ratio(meeting_duration_seconds, 60.0)
    turns_per_minute = safe_ratio(speaking_turns, minutes)
    score = triangular_score(
        turns_per_minute,
        SPEAKING_FREQUENCY_LOW_PER_MIN,
        SPEAKING_FREQUENCY_TARGET_PER_MIN,
        SPEAKING_FREQUENCY_HIGH_PER_MIN,
    )
    return round(clamp(score), 4)


# ---------------------------------------------------------------------------
# Punctuality score
# ---------------------------------------------------------------------------

JOIN_GRACE_PERIOD_SECONDS = 60        # joining up to 1 min late still scores 1.0
JOIN_MAX_PENALIZED_SECONDS = 900      # 15+ min late scores 0.0
JOIN_EARLY_BONUS_CAP_SECONDS = 300    # arriving 5+ min early doesn't add extra credit


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def score_join_time(scheduled_start_iso: str, join_time_iso: str) -> float:
    """Scores how promptly the participant joined relative to the
    scheduled start time. On-time/early joins score 1.0; the score
    decays linearly the later the join, reaching 0.0 at 15+ minutes
    late. Unparseable timestamps score 0.0."""
    scheduled = _parse_iso(scheduled_start_iso)
    joined = _parse_iso(join_time_iso)

    if scheduled is None or joined is None:
        return 0.0

    delta_seconds = (joined - scheduled).total_seconds()

    if delta_seconds <= JOIN_GRACE_PERIOD_SECONDS:
        # Covers everything from "very early" through the grace window.
        return 1.0

    late_seconds = delta_seconds - JOIN_GRACE_PERIOD_SECONDS
    penalized_window = JOIN_MAX_PENALIZED_SECONDS - JOIN_GRACE_PERIOD_SECONDS
    score = 1.0 - safe_ratio(late_seconds, penalized_window, default=1.0)
    return round(clamp(score), 4)


# ---------------------------------------------------------------------------
# Presence scores
# ---------------------------------------------------------------------------


def score_camera_presence(camera_on_seconds: float, meeting_duration_seconds: float) -> float:
    """Fraction of the meeting the participant's camera was on."""
    ratio = safe_ratio(camera_on_seconds, meeting_duration_seconds)
    return round(clamp(ratio), 4)


def score_face_presence(frames_with_face: int, total_frames_sampled: int) -> float:
    """Fraction of sampled video frames in which a face was detected."""
    ratio = safe_ratio(frames_with_face, total_frames_sampled)
    return round(clamp(ratio), 4)


# ---------------------------------------------------------------------------
# Transcript quality score
# ---------------------------------------------------------------------------


def score_transcript(
    segments_transcribed: int,
    total_speaking_segments: int,
    word_count: int,
    filler_word_count: int,
) -> float:
    """
    Blends two heuristics into a single transcript-quality score. No
    AI/NLP model is involved:

    - coverage: fraction of speaking segments that were successfully
      transcribed at all (a stand-in for transcript completeness).
    - clarity: fraction of transcribed words that are NOT filler words
      ("um", "uh", "like", ...), used as a crude proxy for how clean
      the speech/transcript is.
    """
    coverage = safe_ratio(segments_transcribed, total_speaking_segments, default=0.0)
    clarity = 1.0 - safe_ratio(filler_word_count, word_count, default=0.0)

    blended = (coverage * 0.6) + (clamp(clarity) * 0.4)
    return round(clamp(blended), 4)
