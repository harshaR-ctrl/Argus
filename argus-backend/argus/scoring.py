"""Scoring — compute the overall risk score (0–100) and letter grade (A–F)."""

from __future__ import annotations

import logging

from argus.config import settings
from argus.models import (
    Finding, Grade, Severity, Confidence,
    SeverityCounts, CategoryCounts, Category,
)

logger = logging.getLogger(__name__)

# Weight lookup
_WEIGHTS = {
    Severity.CRITICAL: settings.weight_critical,
    Severity.HIGH: settings.weight_high,
    Severity.MEDIUM: settings.weight_medium,
    Severity.LOW: settings.weight_low,
    Severity.INFO: settings.weight_info,
}

# Confidence factor lookup
_CONF_FACTORS = {
    Confidence.HIGH: settings.confidence_high,
    Confidence.MEDIUM: settings.confidence_medium,
    Confidence.LOW: settings.confidence_low,
}


def compute_risk_score(findings: list[Finding]) -> int:
    """
    Compute a risk score from 0 (clean) to 100 (severe).

    Formula:
        raw = Σ weight(severity) × confidence_factor
        score = min(100, round(raw))
    """
    raw = 0.0
    for f in findings:
        weight = _WEIGHTS.get(f.severity, 0)
        factor = _CONF_FACTORS.get(f.confidence, 0.7)
        raw += weight * factor

    score = min(100, round(raw))
    logger.info(f"Risk score: {score}/100 (from {len(findings)} findings)")
    return score


def score_to_grade(score: int) -> Grade:
    """Convert a risk score to a letter grade."""
    if score <= settings.grade_a_max:
        return Grade.A
    if score <= settings.grade_b_max:
        return Grade.B
    if score <= settings.grade_c_max:
        return Grade.C
    if score <= settings.grade_d_max:
        return Grade.D
    return Grade.F


def count_severities(findings: list[Finding]) -> SeverityCounts:
    """Count findings by severity level."""
    counts = SeverityCounts()
    for f in findings:
        if f.severity == Severity.CRITICAL:
            counts.critical += 1
        elif f.severity == Severity.HIGH:
            counts.high += 1
        elif f.severity == Severity.MEDIUM:
            counts.medium += 1
        elif f.severity == Severity.LOW:
            counts.low += 1
        elif f.severity == Severity.INFO:
            counts.info += 1
    return counts


def count_categories(findings: list[Finding]) -> CategoryCounts:
    """Count findings by category."""
    counts = CategoryCounts()
    for f in findings:
        if f.category == Category.SAST:
            counts.sast += 1
        elif f.category == Category.SECRET:
            counts.secret += 1
        elif f.category == Category.DEPENDENCY:
            counts.dependency += 1
        elif f.category == Category.MISCONFIG:
            counts.misconfig += 1
    return counts
