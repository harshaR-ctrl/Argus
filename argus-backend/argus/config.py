"""Argus configuration — all settings, limits, timeouts, and paths."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment / .env file."""

    # ── Project ──────────────────────────────────────────────────────
    project_name: str = "Argus"
    version: str = "0.1.0"

    # ── NVIDIA NIM (LLM) ────────────────────────────────────────────
    nvidia_nim_api_key: Optional[str] = None
    nvidia_nim_model: str = "meta/llama-3.1-70b-instruct"
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    llm_enabled: bool = False
    llm_max_findings: int = 20

    # ── Scan Limits ─────────────────────────────────────────────────
    max_repo_size_mb: int = 200
    max_file_count: int = 20_000
    clone_timeout_seconds: int = 120
    scanner_timeout_seconds: int = 300
    global_timeout_seconds: int = 600

    # ── Paths ───────────────────────────────────────────────────────
    reports_dir: Path = Path("./reports")
    temp_dir: Path = Path("./tmp_scans")

    # ── Database ────────────────────────────────────────────────────
    database_url: str = "sqlite:///./argus.db"

    # ── Server ──────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # ── Severity Weights (for scoring) ──────────────────────────────
    weight_critical: int = 10
    weight_high: int = 7
    weight_medium: int = 4
    weight_low: int = 1
    weight_info: int = 0

    # ── Confidence Factors ──────────────────────────────────────────
    confidence_high: float = 1.0
    confidence_medium: float = 0.7
    confidence_low: float = 0.4

    # ── Grade Thresholds ────────────────────────────────────────────
    grade_a_max: int = 9
    grade_b_max: int = 24
    grade_c_max: int = 49
    grade_d_max: int = 74
    # 75–100 → F

    # ── Noise Paths (findings here are hidden by default) ───────────
    noise_paths: list[str] = Field(default=[
        "tests/", "test/", "spec/", "specs/",
        "docs/", "doc/", "examples/", "example/",
        "fixtures/", "__tests__/", "__mocks__/",
    ])
    noise_extensions: list[str] = Field(default=[".min.js", ".min.css", ".map"])

    # ── Skip Paths (never scanned) ──────────────────────────────────
    skip_dirs: list[str] = Field(default=[
        ".git", "node_modules", "vendor", "dist",
        "build", "__pycache__", ".venv", "venv",
    ])

    # ── Semgrep Rulesets ────────────────────────────────────────────
    semgrep_rulesets: list[str] = Field(default=[
        "p/security-audit",
        "p/owasp-top-ten",
    ])

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_repo_size_bytes(self) -> int:
        return self.max_repo_size_mb * 1024 * 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# Singleton
settings = Settings()
