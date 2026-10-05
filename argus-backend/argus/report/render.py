"""Report rendering — generates self-contained HTML + JSON reports."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from argus.config import settings
from argus.models import ScanResult

logger = logging.getLogger(__name__)

# Template directory
_TEMPLATE_DIR = Path(__file__).parent / "templates"


def _get_jinja_env() -> Environment:
    """Create Jinja2 environment with the templates directory."""
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def render_html_report(result: ScanResult) -> str:
    """Render a self-contained HTML report from scan results."""
    env = _get_jinja_env()
    template = env.get_template("report.html.j2")

    # Prepare template context
    context = {
        "result": result,
        "meta": result.meta,
        "findings": result.findings,
        "severity_counts": result.severity_counts,
        "category_counts": result.category_counts,
        "risk_score": result.risk_score,
        "grade": result.grade.value,
        "generated_at": datetime.utcnow().isoformat(),
        # Separate findings by category for tabbed view
        "sast_findings": [f for f in result.findings if f.category.value == "sast"],
        "secret_findings": [f for f in result.findings if f.category.value == "secret"],
        "dependency_findings": [f for f in result.findings if f.category.value == "dependency"],
        # Top 5 priorities
        "top_priorities": result.findings[:5],
    }

    return template.render(**context)


def render_json_report(result: ScanResult) -> str:
    """Render the full JSON report."""
    return result.model_dump_json(indent=2)


def save_reports(result: ScanResult) -> tuple[Path, Path]:
    """
    Save HTML + JSON reports to the reports directory.

    Returns (html_path, json_path).
    """
    # Create report directory
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    report_dir = (
        settings.reports_dir
        / f"{result.meta.owner}__{result.meta.repo_name}__{timestamp}"
    )
    report_dir.mkdir(parents=True, exist_ok=True)

    # Generate and save HTML
    html_content = render_html_report(result)
    html_path = report_dir / "report.html"
    html_path.write_text(html_content, encoding="utf-8")

    # Generate and save JSON
    json_content = render_json_report(result)
    json_path = report_dir / "report.json"
    json_path.write_text(json_content, encoding="utf-8")

    logger.info(f"Reports saved to {report_dir}")
    return html_path, json_path
