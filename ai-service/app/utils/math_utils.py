"""
Small, dependency-free numeric helpers shared by the feature scorers.

Kept separate from `app.services.scorers` so the scoring functions read
as "business logic" (what each feature means) while this module stays
pure arithmetic (how ratios/ranges are computed). No AI/ML involved.
"""

from typing import Union

Number = Union[int, float]


def clamp(value: Number, minimum: Number = 0.0, maximum: Number = 1.0) -> float:
    """Clamps `value` into the inclusive [minimum, maximum] range."""
    return float(max(minimum, min(maximum, value)))


def safe_ratio(numerator: Number, denominator: Number, default: float = 0.0) -> float:
    """Divides numerator/denominator, returning `default` instead of raising
    when the denominator is zero/falsy."""
    if not denominator:
        return default
    return numerator / denominator


def triangular_score(value: Number, low: Number, target: Number, high: Number) -> float:
    """
    Piecewise-linear "ideal range" scorer.

    Rises from 0 at `low` to 1 at `target`, then falls back to 0 at
    `high`. Values at or outside [low, high] score 0. Useful for metrics
    where both "too little" and "too much" are suboptimal (e.g. how much
    of a meeting someone spent speaking).
    """
    if high <= low or target <= low or target >= high:
        raise ValueError("triangular_score requires low < target < high")

    if value <= low or value >= high:
        return 0.0
    if value == target:
        return 1.0
    if value < target:
        return (value - low) / (target - low)
    return (high - value) / (high - target)
