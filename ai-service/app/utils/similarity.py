"""
String similarity utilities.

Pure, dependency-free helpers used to compare an "expected" identity
string (e.g. the name/email a candidate was invited with) against an
"observed" one (what actually showed up in the meeting). Similarity is
computed with Python's standard-library `difflib.SequenceMatcher` --
a deterministic, explainable character-level ratio. No AI/ML models are
used anywhere in this module.
"""

from difflib import SequenceMatcher

from app.utils.math_utils import clamp


def normalize_text(value: str) -> str:
    """Lowercases and collapses surrounding/internal whitespace."""
    if not value:
        return ""
    return " ".join(value.strip().lower().split())


def string_similarity(a: str, b: str) -> float:
    """
    Similarity ratio between two strings, in [0, 1].

    1.0 = identical (after normalization), 0.0 = completely dissimilar
    or one side missing entirely.
    """
    norm_a, norm_b = normalize_text(a), normalize_text(b)

    if not norm_a and not norm_b:
        return 1.0
    if not norm_a or not norm_b:
        return 0.0

    return round(clamp(SequenceMatcher(None, norm_a, norm_b).ratio()), 4)


def email_similarity(a: str, b: str) -> float:
    """
    Similarity ratio for email addresses, in [0, 1].

    Splits each address into local-part and domain and blends both,
    weighting the local part slightly higher since it's usually the
    more identity-specific segment (domains are often shared across an
    organization).
    """
    norm_a, norm_b = normalize_text(a), normalize_text(b)

    if not norm_a and not norm_b:
        return 1.0
    if not norm_a or not norm_b:
        return 0.0

    local_a, _, domain_a = norm_a.partition("@")
    local_b, _, domain_b = norm_b.partition("@")

    local_score = string_similarity(local_a, local_b)
    domain_score = string_similarity(domain_a, domain_b) if (domain_a or domain_b) else 1.0

    blended = (local_score * 0.65) + (domain_score * 0.35)
    return round(clamp(blended), 4)
