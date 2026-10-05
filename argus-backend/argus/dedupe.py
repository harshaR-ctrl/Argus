"""De-duplication — merge overlapping findings from multiple scanners."""

from __future__ import annotations

import logging
from typing import Optional

from argus.config import settings
from argus.models import Finding, Severity, Category

logger = logging.getLogger(__name__)

# Severity ordering for comparison
_SEVERITY_ORDER = {
    Severity.CRITICAL: 4,
    Severity.HIGH: 3,
    Severity.MEDIUM: 2,
    Severity.LOW: 1,
    Severity.INFO: 0,
}


def _dedupe_key(finding: Finding) -> str:
    """
    Build a de-duplication key for a finding.

    For code/secret findings: (category, file, line_start, cwe_or_rule_id)
    For dependencies: (package, installed_version, advisory_id)
    """
    if finding.category == Category.DEPENDENCY:
        # Use the first advisory ID as part of the key
        advisory = finding.advisory_ids[0] if finding.advisory_ids else finding.rule_id
        return f"dep:{finding.package}:{finding.installed_version}:{advisory}"

    # For SAST and secrets
    cwe_key = finding.cwe[0] if finding.cwe else finding.rule_id
    return f"{finding.category.value}:{finding.file}:{finding.line_start}:{cwe_key}"


def _is_noise_path(file_path: str) -> bool:
    """Check if a file path is in a noise directory (tests, docs, examples)."""
    lower = file_path.lower().replace("\\", "/")

    for noise in settings.noise_paths:
        if lower.startswith(noise) or f"/{noise}" in lower:
            return True

    for ext in settings.noise_extensions:
        if lower.endswith(ext):
            return True

    return False


def deduplicate(findings: list[Finding]) -> tuple[list[Finding], int]:
    """
    De-duplicate and filter findings.

    Returns:
        (deduplicated_findings, noise_count) — noise_count is the number of
        findings in noise paths that were hidden.
    """
    seen: dict[str, Finding] = {}
    noise_count = 0

    for finding in findings:
        # Mark noise paths
        if finding.file and _is_noise_path(finding.file):
            finding.in_noise_path = True

            # Secrets in test paths are kept but flagged
            if finding.category == Category.SECRET:
                finding.likely_test_data = True
            else:
                noise_count += 1
                continue  # Skip non-secret findings in noise paths

        key = _dedupe_key(finding)

        if key in seen:
            existing = seen[key]

            # Keep the higher severity
            if _SEVERITY_ORDER.get(finding.severity, 0) > _SEVERITY_ORDER.get(existing.severity, 0):
                finding.tool = f"{existing.tool}, {finding.tool}"
                seen[key] = finding
            else:
                existing.tool = f"{existing.tool}, {finding.tool}"
        else:
            seen[key] = finding

    deduplicated = list(seen.values())

    # Sort by severity (critical first), then by file path
    deduplicated.sort(
        key=lambda f: (-_SEVERITY_ORDER.get(f.severity, 0), f.file or ""),
    )

    logger.info(
        f"Deduplicated {len(findings)} → {len(deduplicated)} findings "
        f"({noise_count} noise findings hidden)"
    )

    return deduplicated, noise_count
