"""API request/response schemas."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    """Request to start a new scan."""
    url: str = Field(..., description="Public GitHub repository URL")
    branch: Optional[str] = Field(None, description="Specific branch to scan")
    enable_llm: Optional[bool] = Field(None, description="Enable LLM explanations")


class ScanResponse(BaseModel):
    """Response after starting a scan."""
    scan_id: str
    status: str
    message: str


class ScanStatusResponse(BaseModel):
    """Scan progress status response."""
    scan_id: str
    status: str
    step: str = ""
    detail: str = ""
    progress_percent: int = 0
    repo_url: str = ""
    owner: str = ""
    repo_name: str = ""


class ScanHistoryItem(BaseModel):
    """A single scan in the history list."""
    scan_id: str
    repo_url: str
    owner: str = ""
    repo_name: str = ""
    branch: Optional[str] = None
    status: str
    risk_score: int = 0
    grade: str = "A"
    findings_count: int = 0
    severity_critical: int = 0
    severity_high: int = 0
    severity_medium: int = 0
    severity_low: int = 0
    severity_info: int = 0
    languages: str = "[]"
    duration_seconds: float = 0.0
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str
    scanners: dict[str, bool] = {}
