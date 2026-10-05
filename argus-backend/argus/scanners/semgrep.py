"""Semgrep scanner — SAST (Static Application Security Testing)."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from argus.config import settings
from argus.models import Finding, Severity, Confidence, Category
from argus.scanners.base import BaseScanner, RawResult

logger = logging.getLogger(__name__)

# Semgrep severity mapping
_SEVERITY_MAP = {
    "ERROR": Severity.HIGH,
    "WARNING": Severity.MEDIUM,
    "INFO": Severity.LOW,
}

_CONFIDENCE_MAP = {
    "HIGH": Confidence.HIGH,
    "MEDIUM": Confidence.MEDIUM,
    "LOW": Confidence.LOW,
}


class SemgrepScanner(BaseScanner):
    name = "semgrep"
    binary = "semgrep"

    def run(self, src_dir: Path) -> RawResult:
        """Run Semgrep with security rulesets."""
        if not self.available():
            return RawResult(
                scanner_name=self.name,
                success=False,
                error_message="Semgrep is not installed. Run: pip install semgrep",
            )

        cmd = [
            "semgrep",
            "scan",
            "--json",
            "--metrics=off",
            "--timeout", "30",  # per-rule timeout
            "--timeout-threshold", "5",
            "--no-git-ignore",  # scan everything
        ]

        # Add rulesets
        for ruleset in settings.semgrep_rulesets:
            cmd.extend(["--config", ruleset])

        cmd.append(str(src_dir))

        raw = self._run_command(cmd, timeout=settings.scanner_timeout_seconds)

        # Semgrep exits 1 when findings exist — that's success for us
        if raw.exit_code in (0, 1) and raw.raw_output:
            try:
                raw.raw_json = json.loads(raw.raw_output)
                raw.success = True
            except json.JSONDecodeError as exc:
                raw.success = False
                raw.error_message = f"Failed to parse Semgrep JSON: {exc}"
        elif raw.exit_code > 1:
            raw.success = False
            raw.error_message = (
                f"Semgrep exited with code {raw.exit_code}: "
                f"{raw.stderr[:500]}"
            )

        return raw

    def normalize(self, raw: RawResult, src_dir: Path) -> list[Finding]:
        """Convert Semgrep JSON output to unified Finding objects."""
        findings: list[Finding] = []

        if not raw.raw_json:
            return findings

        results = raw.raw_json.get("results", [])

        for item in results:
            try:
                extra = item.get("extra", {})
                metadata = extra.get("metadata", {})

                # Severity
                sev_str = extra.get("severity", "INFO").upper()
                severity = _SEVERITY_MAP.get(sev_str, Severity.LOW)

                # Confidence
                conf_str = metadata.get("confidence", "MEDIUM").upper()
                confidence = _CONFIDENCE_MAP.get(conf_str, Confidence.MEDIUM)

                # CWE
                cwe_list = metadata.get("cwe", [])
                if isinstance(cwe_list, str):
                    cwe_list = [cwe_list]

                # OWASP
                owasp_list = metadata.get("owasp", [])
                if isinstance(owasp_list, str):
                    owasp_list = [owasp_list]

                # File path (relative to repo root)
                file_path = item.get("path", "")
                try:
                    file_path = str(
                        Path(file_path).relative_to(src_dir)
                    ).replace("\\", "/")
                except ValueError:
                    pass

                # Code snippet
                snippet = extra.get("lines", "").strip()

                # Description / message
                description = extra.get("message", "")

                # References
                references = metadata.get("references", [])
                if isinstance(references, str):
                    references = [references]

                finding = Finding(
                    id=f"SEMGREP-{item.get('check_id', 'unknown')[:40]}-{item.get('start', {}).get('line', 0)}",
                    category=Category.SAST,
                    title=_make_title(item.get("check_id", ""), description),
                    severity=severity,
                    confidence=confidence,
                    file=file_path,
                    line_start=item.get("start", {}).get("line"),
                    line_end=item.get("end", {}).get("line"),
                    snippet=snippet,
                    description=description,
                    cwe=cwe_list,
                    owasp=owasp_list,
                    rule_id=item.get("check_id", ""),
                    tool=self.name,
                    references=references,
                )
                findings.append(finding)

            except Exception as exc:
                logger.warning(f"Failed to normalize Semgrep finding: {exc}")
                continue

        logger.info(f"Semgrep: normalized {len(findings)} findings")
        return findings


def _make_title(check_id: str, description: str) -> str:
    """Build a human-readable title from the check ID or description."""
    if description:
        # Use first sentence of the description
        first_sentence = description.split(".")[0].strip()
        if len(first_sentence) <= 100:
            return first_sentence

    # Fall back to a cleaned-up check ID
    if check_id:
        # e.g. "python.lang.security.audit.formatted-sql-query"
        parts = check_id.split(".")
        return parts[-1].replace("-", " ").replace("_", " ").title()

    return "Unknown Finding"
