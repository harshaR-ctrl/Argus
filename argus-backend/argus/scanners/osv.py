"""OSV-Scanner — dependency vulnerability scanning (SCA)."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from argus.config import settings
from argus.models import Finding, Severity, Confidence, Category
from argus.scanners.base import BaseScanner, RawResult

logger = logging.getLogger(__name__)


def _cvss_to_severity(score: Optional[float]) -> Severity:
    """Map a CVSS score to our severity enum."""
    if score is None:
        return Severity.MEDIUM
    if score >= 9.0:
        return Severity.CRITICAL
    if score >= 7.0:
        return Severity.HIGH
    if score >= 4.0:
        return Severity.MEDIUM
    return Severity.LOW


class OSVScanner(BaseScanner):
    name = "osv-scanner"
    binary = "osv-scanner"

    def run(self, src_dir: Path) -> RawResult:
        """Run OSV-Scanner recursively on the source directory."""
        if not self.available():
            return RawResult(
                scanner_name=self.name,
                success=False,
                error_message=(
                    "OSV-Scanner is not installed. "
                    "Download from: https://github.com/google/osv-scanner/releases"
                ),
            )

        cmd = [
            "osv-scanner",
            "scan",
            "--recursive",
            "--format", "json",
            str(src_dir),
        ]

        raw = self._run_command(cmd, timeout=settings.scanner_timeout_seconds)

        if raw.exit_code in (0, 1):
            raw.success = True
            out = raw.raw_output or ""
            if out.strip():
                try:
                    raw.raw_json = json.loads(out)
                except json.JSONDecodeError as exc:
                    logger.warning(f"Failed to parse OSV-Scanner JSON: {exc}")
                    raw.raw_json = {"results": []}
            else:
                raw.raw_json = {"results": []}
        else:
            raw.success = False
            raw.error_message = (
                f"OSV-Scanner exited with code {raw.exit_code}: "
                f"{raw.stderr[:500]}"
            )

        return raw

    def normalize(self, raw: RawResult, src_dir: Path) -> list[Finding]:
        """Convert OSV-Scanner JSON output to unified Finding objects."""
        findings: list[Finding] = []

        if not raw.raw_json:
            return findings

        results = raw.raw_json.get("results", [])

        for result in results:
            source = result.get("source", {})
            manifest_path = source.get("path", "")

            # Make path relative
            try:
                manifest_path = str(
                    Path(manifest_path).relative_to(src_dir)
                ).replace("\\", "/")
            except (ValueError, TypeError):
                pass

            packages = result.get("packages", [])

            for pkg_info in packages:
                package_data = pkg_info.get("package", {})
                package_name = package_data.get("name", "unknown")
                package_version = package_data.get("version", "unknown")
                ecosystem = package_data.get("ecosystem", "")

                vulnerabilities = pkg_info.get("vulnerabilities", [])

                for vuln in vulnerabilities:
                    try:
                        vuln_id = vuln.get("id", "unknown")
                        summary = vuln.get("summary", "")
                        details = vuln.get("details", "")
                        aliases = vuln.get("aliases", [])

                        # Get CVSS score for severity
                        severity_data = vuln.get("database_specific", {}).get(
                            "severity", None
                        )
                        cvss_score = None

                        # Try to find CVSS score from severity entries
                        vuln_severities = vuln.get("severity", [])
                        for sev_entry in vuln_severities:
                            score_str = sev_entry.get("score", "")
                            try:
                                # CVSS vector strings contain the score
                                if "CVSS" in score_str.upper():
                                    # Extract base score from vector
                                    parts = score_str.split("/")
                                    for part in parts:
                                        try:
                                            cvss_score = float(part)
                                            if 0 <= cvss_score <= 10:
                                                break
                                            cvss_score = None
                                        except ValueError:
                                            continue
                                else:
                                    cvss_score = float(score_str)
                            except (ValueError, TypeError):
                                pass

                        severity = _cvss_to_severity(cvss_score)

                        # Find fixed version from affected ranges
                        fixed_version = _find_fixed_version(vuln, package_name)

                        # Advisory IDs (CVE, GHSA)
                        advisory_ids = [vuln_id] + [
                            a for a in aliases if a != vuln_id
                        ]

                        # References
                        references = [
                            ref.get("url", "")
                            for ref in vuln.get("references", [])
                            if ref.get("url")
                        ][:5]  # Cap at 5 references

                        finding = Finding(
                            id=f"OSV-{vuln_id}-{package_name}",
                            category=Category.DEPENDENCY,
                            title=f"Vulnerable dependency: {package_name} ({vuln_id})",
                            severity=severity,
                            confidence=Confidence.HIGH,
                            file=manifest_path,
                            description=summary or details[:300] or f"Known vulnerability in {package_name}",
                            rule_id=vuln_id,
                            tool=self.name,
                            remediation=_build_remediation(
                                package_name, package_version,
                                fixed_version, ecosystem,
                            ),
                            references=references,
                            package=package_name,
                            installed_version=package_version,
                            fixed_version=fixed_version,
                            advisory_ids=advisory_ids,
                        )
                        findings.append(finding)

                    except Exception as exc:
                        logger.warning(
                            f"Failed to normalize OSV finding: {exc}"
                        )
                        continue

        logger.info(f"OSV-Scanner: normalized {len(findings)} findings")
        return findings


def _find_fixed_version(vuln: dict, package_name: str) -> Optional[str]:
    """Extract the lowest fixed version from an OSV vulnerability entry."""
    for affected in vuln.get("affected", []):
        pkg = affected.get("package", {})
        if pkg.get("name", "").lower() == package_name.lower():
            ranges = affected.get("ranges", [])
            for range_entry in ranges:
                events = range_entry.get("events", [])
                for event in events:
                    fixed = event.get("fixed")
                    if fixed:
                        return fixed
    return None


def _build_remediation(
    package_name: str,
    installed_version: str,
    fixed_version: Optional[str],
    ecosystem: str,
) -> str:
    """Generate actionable remediation advice for a vulnerable dependency."""
    lines = []

    if fixed_version:
        lines.append(
            f"Upgrade {package_name} from {installed_version} to "
            f"{fixed_version} or later."
        )
    else:
        lines.append(
            f"No fixed version is available yet for {package_name} "
            f"{installed_version}. Check for alternatives or apply "
            f"mitigations."
        )

    # Ecosystem-specific upgrade command
    eco = ecosystem.lower()
    if eco == "pypi" and fixed_version:
        lines.append(f"  pip install {package_name}>={fixed_version}")
    elif eco == "npm" and fixed_version:
        lines.append(f"  npm install {package_name}@{fixed_version}")
    elif eco == "go" and fixed_version:
        lines.append(f"  go get {package_name}@v{fixed_version}")
    elif eco == "maven" and fixed_version:
        lines.append(
            f"  Update the version in pom.xml to {fixed_version}"
        )

    lines.append(
        "Review the advisory for possible workarounds if upgrading "
        "is not immediately feasible."
    )

    return "\n".join(lines)
