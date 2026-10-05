"""Gitleaks scanner — secret detection."""

from __future__ import annotations

import json
import logging
import re
import tempfile
from pathlib import Path

from argus.config import settings
from argus.models import Finding, Severity, Confidence, Category
from argus.scanners.base import BaseScanner, RawResult

logger = logging.getLogger(__name__)

# Patterns that indicate a higher-severity secret
_CRITICAL_PATTERNS = {
    "aws-access-key-id",
    "aws-secret-access-key",
    "gcp-api-key",
    "gcp-service-account",
    "azure-storage-key",
    "private-key",
    "rsa-private-key",
    "ssh-private-key",
    "github-pat",
    "github-fine-grained-pat",
    "github-oauth",
    "stripe-secret-key",
    "stripe-restricted-key",
}


def _mask_secret(value: str) -> str:
    """
    Mask a secret value, showing only first 4 and last 4 chars.
    e.g. "AKIAIOSFODNN7EXAMPLE" → "AKIA••••MPLE"
    """
    if not value or len(value) <= 8:
        return "••••••••"
    return f"{value[:4]}••••{value[-4:]}"


class GitleaksScanner(BaseScanner):
    name = "gitleaks"
    binary = "gitleaks"

    def run(self, src_dir: Path) -> RawResult:
        """Run Gitleaks in detect mode on the source directory."""
        if not self.available():
            return RawResult(
                scanner_name=self.name,
                success=False,
                error_message=(
                    "Gitleaks is not installed. "
                    "Download from: https://github.com/gitleaks/gitleaks/releases"
                ),
            )

        # Gitleaks writes the report to a file
        report_file = Path(tempfile.mktemp(suffix=".json"))

        cmd = [
            "gitleaks",
            "detect",
            "--source", str(src_dir),
            "--no-git",           # scan filesystem, not git history
            "--report-format", "json",
            "--report-path", str(report_file),
            "--redact",           # redact secrets in output
        ]

        raw = self._run_command(cmd, timeout=settings.scanner_timeout_seconds)

        # Gitleaks: exit 0 = no leaks, exit 1 = leaks found, exit 2+ = error
        if raw.exit_code in (0, 1):
            raw.success = True
            if report_file.exists():
                try:
                    content = report_file.read_text(encoding="utf-8")
                    raw.raw_json = json.loads(content) if content.strip() else []
                except json.JSONDecodeError as exc:
                    logger.warning(f"Failed to parse Gitleaks report: {exc}")
                    raw.raw_json = []
                finally:
                    report_file.unlink(missing_ok=True)
            else:
                raw.raw_json = []
        else:
            raw.success = False
            raw.error_message = (
                f"Gitleaks exited with code {raw.exit_code}: "
                f"{raw.stderr[:500]}"
            )
            report_file.unlink(missing_ok=True)

        return raw

    def normalize(self, raw: RawResult, src_dir: Path) -> list[Finding]:
        """Convert Gitleaks JSON output to unified Finding objects."""
        findings: list[Finding] = []

        if not raw.raw_json or not isinstance(raw.raw_json, list):
            return findings

        for item in raw.raw_json:
            try:
                rule_id = item.get("RuleID", "unknown")

                # Determine severity
                severity = Severity.HIGH
                if rule_id.lower() in _CRITICAL_PATTERNS:
                    severity = Severity.CRITICAL

                # File path (relative)
                file_path = item.get("File", "")
                try:
                    file_path = str(
                        Path(file_path).relative_to(src_dir)
                    ).replace("\\", "/")
                except ValueError:
                    pass

                # Mask the secret (defense in depth — Gitleaks --redact should
                # handle this, but we double-mask)
                raw_secret = item.get("Secret", "")
                masked = _mask_secret(raw_secret)

                # Build snippet with context
                match_text = item.get("Match", "")
                line = item.get("StartLine", 0)
                snippet = f"Line {line}: {match_text}" if match_text else ""

                finding = Finding(
                    id=f"GITLEAKS-{rule_id}-{line}",
                    category=Category.SECRET,
                    title=f"Leaked secret: {_humanize_rule(rule_id)}",
                    severity=severity,
                    confidence=Confidence.HIGH,
                    file=file_path,
                    line_start=item.get("StartLine"),
                    line_end=item.get("EndLine"),
                    snippet=snippet,
                    description=(
                        f"A potential {_humanize_rule(rule_id)} was found in the code. "
                        f"Masked value: {masked}. "
                        "If this is a real credential, rotate it immediately."
                    ),
                    rule_id=rule_id,
                    tool=self.name,
                    remediation=(
                        "1. Rotate this credential immediately.\n"
                        "2. Remove it from the code and Git history.\n"
                        "3. Use environment variables or a secrets manager instead.\n"
                        "4. Add the file pattern to .gitignore."
                    ),
                    references=[
                        "https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password",
                    ],
                    cwe=["CWE-798"],
                    owasp=["A07:2021 - Identification and Authentication Failures"],
                )
                findings.append(finding)

            except Exception as exc:
                logger.warning(f"Failed to normalize Gitleaks finding: {exc}")
                continue

        logger.info(f"Gitleaks: normalized {len(findings)} findings")
        return findings


def _humanize_rule(rule_id: str) -> str:
    """Turn a rule ID like 'aws-access-key-id' into 'AWS Access Key ID'."""
    return rule_id.replace("-", " ").replace("_", " ").title()
