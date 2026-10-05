"""Pydantic models — the unified finding schema and all scan data structures."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ───────────────────────────────────────────────────────────

class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Category(str, Enum):
    SAST = "sast"
    SECRET = "secret"
    DEPENDENCY = "dependency"
    MISCONFIG = "misconfig"


class ScanStatus(str, Enum):
    PENDING = "pending"
    CLONING = "cloning"
    SCANNING = "scanning"
    PROCESSING = "processing"
    COMPLETE = "complete"
    FAILED = "failed"


class Grade(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    F = "F"


# ── Core Models ─────────────────────────────────────────────────────

class Finding(BaseModel):
    """A single normalized vulnerability finding."""
    id: str = Field(default_factory=lambda: f"ARGUS-{uuid.uuid4().hex[:8]}")
    category: Category
    title: str
    severity: Severity
    confidence: Confidence = Confidence.MEDIUM
    file: str = ""
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    snippet: str = ""
    description: str = ""
    cwe: list[str] = Field(default_factory=list)
    owasp: list[str] = Field(default_factory=list)
    rule_id: str = ""
    tool: str = ""
    remediation: str = ""
    references: list[str] = Field(default_factory=list)
    # Dependency-specific fields
    package: Optional[str] = None
    installed_version: Optional[str] = None
    fixed_version: Optional[str] = None
    advisory_ids: list[str] = Field(default_factory=list)
    # Metadata
    likely_test_data: bool = False
    in_noise_path: bool = False


class ScannerError(BaseModel):
    """Records a scanner failure so the report can mention it."""
    scanner: str
    error: str
    exit_code: Optional[int] = None
    timed_out: bool = False


class SeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class CategoryCounts(BaseModel):
    sast: int = 0
    secret: int = 0
    dependency: int = 0
    misconfig: int = 0


class ScanMeta(BaseModel):
    """Metadata about the scan itself."""
    scan_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    repo_url: str
    owner: str = ""
    repo_name: str = ""
    branch: Optional[str] = None
    commit_sha: str = ""
    scan_date: datetime = Field(default_factory=datetime.utcnow)
    duration_seconds: float = 0.0
    languages: list[str] = Field(default_factory=list)
    manifests: list[str] = Field(default_factory=list)
    files_scanned: int = 0
    loc_estimate: int = 0
    tools_used: list[str] = Field(default_factory=list)
    tool_versions: dict[str, str] = Field(default_factory=dict)
    scanner_errors: list[ScannerError] = Field(default_factory=list)
    skipped_paths: list[str] = Field(default_factory=list)


class ScanResult(BaseModel):
    """The complete result of a scan — everything needed for the report."""
    meta: ScanMeta
    status: ScanStatus = ScanStatus.PENDING
    risk_score: int = 0
    grade: Grade = Grade.A
    severity_counts: SeverityCounts = Field(default_factory=SeverityCounts)
    category_counts: CategoryCounts = Field(default_factory=CategoryCounts)
    findings: list[Finding] = Field(default_factory=list)
    noise_findings_count: int = 0
    error_message: Optional[str] = None


class ScanProgress(BaseModel):
    """Real-time progress update sent via WebSocket."""
    scan_id: str
    status: ScanStatus
    step: str = ""
    detail: str = ""
    progress_percent: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)
