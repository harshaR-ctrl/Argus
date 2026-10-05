"""Enrichment — CWE/OWASP mapping, remediation templates, optional LLM."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from argus.models import Finding

logger = logging.getLogger(__name__)

# ── CWE Lookup Table ────────────────────────────────────────────────
# A curated subset of common CWEs with human-readable names and
# template remediations.

_CWE_DATA: dict[str, dict] = {
    "CWE-79": {
        "name": "Cross-site Scripting (XSS)",
        "owasp": "A03:2021 - Injection",
        "remediation": (
            "Encode all user-supplied output before rendering in HTML. "
            "Use framework auto-escaping (e.g., Jinja2, React JSX). "
            "Implement a Content Security Policy (CSP) header."
        ),
    },
    "CWE-89": {
        "name": "SQL Injection",
        "owasp": "A03:2021 - Injection",
        "remediation": (
            "Use parameterized queries or prepared statements. "
            "Never concatenate user input into SQL strings. "
            "Use an ORM when possible."
        ),
    },
    "CWE-78": {
        "name": "OS Command Injection",
        "owasp": "A03:2021 - Injection",
        "remediation": (
            "Avoid calling OS commands with user input. "
            "If unavoidable, use allowlists and subprocess with shell=False. "
            "Never pass user input to shell=True."
        ),
    },
    "CWE-22": {
        "name": "Path Traversal",
        "owasp": "A01:2021 - Broken Access Control",
        "remediation": (
            "Validate and sanitize file paths. "
            "Use os.path.realpath() to resolve paths and verify they stay "
            "within the intended directory. Reject inputs containing '../'."
        ),
    },
    "CWE-798": {
        "name": "Use of Hard-coded Credentials",
        "owasp": "A07:2021 - Identification and Authentication Failures",
        "remediation": (
            "Never hard-code secrets in source code. "
            "Use environment variables, secret managers (Vault, AWS SSM), "
            "or .env files excluded from version control."
        ),
    },
    "CWE-502": {
        "name": "Deserialization of Untrusted Data",
        "owasp": "A08:2021 - Software and Data Integrity Failures",
        "remediation": (
            "Avoid deserializing data from untrusted sources. "
            "Use safe alternatives (e.g., json.loads instead of pickle.loads). "
            "Implement integrity checks on serialized data."
        ),
    },
    "CWE-327": {
        "name": "Use of a Broken or Risky Cryptographic Algorithm",
        "owasp": "A02:2021 - Cryptographic Failures",
        "remediation": (
            "Replace MD5/SHA1 with SHA-256 or stronger. "
            "Use established crypto libraries (e.g., cryptography, libsodium). "
            "Never implement your own crypto."
        ),
    },
    "CWE-326": {
        "name": "Inadequate Encryption Strength",
        "owasp": "A02:2021 - Cryptographic Failures",
        "remediation": (
            "Use AES-256 for symmetric encryption, RSA-2048+ or ECDSA for "
            "asymmetric. Ensure TLS 1.2+ for data in transit."
        ),
    },
    "CWE-200": {
        "name": "Exposure of Sensitive Information",
        "owasp": "A01:2021 - Broken Access Control",
        "remediation": (
            "Review error messages and logs for sensitive data exposure. "
            "Use generic error messages in production. "
            "Never log passwords, tokens, or PII."
        ),
    },
    "CWE-611": {
        "name": "Improper Restriction of XML External Entity Reference (XXE)",
        "owasp": "A05:2021 - Security Misconfiguration",
        "remediation": (
            "Disable external entity processing in XML parsers. "
            "Use defusedxml (Python) or equivalent safe parsers. "
            "Prefer JSON over XML when possible."
        ),
    },
    "CWE-918": {
        "name": "Server-Side Request Forgery (SSRF)",
        "owasp": "A10:2021 - Server-Side Request Forgery",
        "remediation": (
            "Validate and whitelist URLs before making server-side requests. "
            "Block access to internal/private IP ranges. "
            "Use a URL allowlist for external services."
        ),
    },
    "CWE-352": {
        "name": "Cross-Site Request Forgery (CSRF)",
        "owasp": "A01:2021 - Broken Access Control",
        "remediation": (
            "Use anti-CSRF tokens for all state-changing operations. "
            "Implement SameSite cookie attribute. "
            "Verify the Origin/Referer header."
        ),
    },
    "CWE-434": {
        "name": "Unrestricted Upload of File with Dangerous Type",
        "owasp": "A04:2021 - Insecure Design",
        "remediation": (
            "Validate file types server-side (not just by extension). "
            "Store uploads outside the web root. "
            "Scan uploaded files for malware."
        ),
    },
    "CWE-307": {
        "name": "Improper Restriction of Excessive Authentication Attempts",
        "owasp": "A07:2021 - Identification and Authentication Failures",
        "remediation": (
            "Implement rate limiting on authentication endpoints. "
            "Use account lockout after N failed attempts. "
            "Consider multi-factor authentication."
        ),
    },
}


def enrich_findings(findings: list[Finding]) -> list[Finding]:
    """
    Enrich findings with CWE names, OWASP categories, and template
    remediations where they're missing.
    """
    for finding in findings:
        for cwe_id in finding.cwe:
            data = _CWE_DATA.get(cwe_id)
            if data:
                # Add OWASP if not already present
                owasp = data.get("owasp", "")
                if owasp and owasp not in finding.owasp:
                    finding.owasp.append(owasp)

                # Add remediation if missing
                if not finding.remediation:
                    finding.remediation = data.get("remediation", "")

        # Fallback remediation for findings with no CWE match
        if not finding.remediation:
            finding.remediation = _fallback_remediation(finding)

    return findings


def _fallback_remediation(finding: Finding) -> str:
    """Generate generic remediation advice when no CWE template matches."""
    if finding.category.value == "secret":
        return (
            "1. Rotate this credential immediately.\n"
            "2. Remove it from the code and Git history.\n"
            "3. Use environment variables or a secrets manager.\n"
            "4. Add sensitive files to .gitignore."
        )
    if finding.category.value == "dependency":
        if finding.fixed_version:
            return (
                f"Upgrade {finding.package} to version {finding.fixed_version} "
                f"or later to fix this vulnerability."
            )
        return (
            f"Check for updates to {finding.package} or consider "
            f"alternative packages. Review the advisory for workarounds."
        )
    return (
        "Review the flagged code and apply secure coding practices. "
        "Consult the CWE and OWASP references for detailed guidance."
    )
