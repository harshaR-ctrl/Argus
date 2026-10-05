"""NVIDIA NIM LLM integration — optional AI-powered explanations and fixes."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Optional

import httpx

from argus.config import settings
from argus.models import Finding

logger = logging.getLogger(__name__)

# In-memory cache: rule_id + snippet_hash → (explanation, fix)
_cache: dict[str, tuple[str, str]] = {}


def _cache_key(finding: Finding) -> str:
    """Build a cache key from rule_id and snippet hash."""
    snippet_hash = hashlib.sha256(
        finding.snippet.encode("utf-8", errors="replace")
    ).hexdigest()[:12]
    return f"{finding.rule_id}:{snippet_hash}"


async def enrich_with_llm(findings: list[Finding]) -> list[Finding]:
    """
    Send top-severity findings to NVIDIA NIM for AI explanations.

    Rules:
    - Only runs if LLM is enabled and API key is set
    - Caps at llm_max_findings per scan (top severity first)
    - Never sends secrets or whole files — only rule title + snippet
    - On any error, falls back silently to template remediation
    - Results are cached by rule_id + snippet hash
    """
    if not settings.llm_enabled or not settings.nvidia_nim_api_key:
        logger.info("LLM enrichment skipped (not configured)")
        return findings

    # Sort by severity and take top N
    sorted_findings = sorted(
        findings,
        key=lambda f: {
            "critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4
        }.get(f.severity.value, 5),
    )

    to_enrich = sorted_findings[:settings.llm_max_findings]
    enriched_count = 0

    async with httpx.AsyncClient(timeout=30) as client:
        for finding in to_enrich:
            # Skip secrets (never send secret data to LLM)
            if finding.category.value == "secret":
                continue

            # Check cache
            key = _cache_key(finding)
            if key in _cache:
                explanation, fix = _cache[key]
                finding.description = explanation
                if fix:
                    finding.remediation = fix
                enriched_count += 1
                continue

            try:
                explanation, fix = await _call_nim(client, finding)
                if explanation:
                    finding.description = explanation
                if fix:
                    finding.remediation = fix
                _cache[key] = (explanation or "", fix or "")
                enriched_count += 1
            except Exception as exc:
                logger.warning(
                    f"LLM enrichment failed for {finding.id}: {exc}"
                )
                # Fall back silently — the template remediation stays
                continue

    logger.info(f"LLM enriched {enriched_count}/{len(to_enrich)} findings")
    return findings


async def _call_nim(
    client: httpx.AsyncClient,
    finding: Finding,
) -> tuple[Optional[str], Optional[str]]:
    """
    Call NVIDIA NIM API for a single finding.

    Returns (explanation, suggested_fix).
    """
    # Build a safe prompt — no secrets, limited snippet
    snippet = finding.snippet[:500] if finding.snippet else "N/A"
    cwe_str = ", ".join(finding.cwe) if finding.cwe else "N/A"

    prompt = f"""You are a security expert. Analyze this code vulnerability finding and provide:
1. A clear 2-3 sentence explanation of the vulnerability (for a developer who may not be a security expert)
2. A corrected code snippet showing the fix

Finding: {finding.title}
CWE: {cwe_str}
File: {finding.file}
Line: {finding.line_start}
Code:
```
{snippet}
```

Respond in this exact JSON format:
{{"explanation": "...", "fix": "..."}}

Keep the explanation simple and actionable. The fix should be a working code snippet."""

    headers = {
        "Authorization": f"Bearer {settings.nvidia_nim_api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.nvidia_nim_model,
        "messages": [
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 512,
    }

    resp = await client.post(
        f"{settings.nvidia_nim_base_url}/chat/completions",
        headers=headers,
        json=payload,
    )
    resp.raise_for_status()

    data = resp.json()
    content = data["choices"][0]["message"]["content"].strip()

    # Try to parse as JSON
    try:
        # Handle markdown code fences
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        parsed = json.loads(content)
        return parsed.get("explanation"), parsed.get("fix")
    except (json.JSONDecodeError, IndexError):
        # If not valid JSON, use the whole response as explanation
        return content[:500], None
