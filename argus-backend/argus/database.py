"""SQLite database — scan history storage."""

from __future__ import annotations

import json
import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from argus.models import ScanResult, ScanStatus

logger = logging.getLogger(__name__)

DB_PATH = Path("argus.db")


def _get_connection() -> sqlite3.Connection:
    """Get a SQLite connection with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    conn = _get_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                scan_id TEXT PRIMARY KEY,
                repo_url TEXT NOT NULL,
                owner TEXT DEFAULT '',
                repo_name TEXT DEFAULT '',
                branch TEXT,
                commit_sha TEXT DEFAULT '',
                status TEXT DEFAULT 'pending',
                risk_score INTEGER DEFAULT 0,
                grade TEXT DEFAULT 'A',
                findings_count INTEGER DEFAULT 0,
                severity_critical INTEGER DEFAULT 0,
                severity_high INTEGER DEFAULT 0,
                severity_medium INTEGER DEFAULT 0,
                severity_low INTEGER DEFAULT 0,
                severity_info INTEGER DEFAULT 0,
                languages TEXT DEFAULT '[]',
                duration_seconds REAL DEFAULT 0.0,
                result_json TEXT,
                error_message TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                completed_at TEXT
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_scans_created
            ON scans(created_at DESC)
        """)
        conn.commit()
        logger.info("Database initialized")
    finally:
        conn.close()


def save_scan(result: ScanResult) -> None:
    """Insert or update a scan record."""
    conn = _get_connection()
    try:
        conn.execute("""
            INSERT INTO scans (
                scan_id, repo_url, owner, repo_name, branch, commit_sha,
                status, risk_score, grade, findings_count,
                severity_critical, severity_high, severity_medium,
                severity_low, severity_info, languages, duration_seconds,
                result_json, error_message, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(scan_id) DO UPDATE SET
                status=excluded.status,
                risk_score=excluded.risk_score,
                grade=excluded.grade,
                findings_count=excluded.findings_count,
                severity_critical=excluded.severity_critical,
                severity_high=excluded.severity_high,
                severity_medium=excluded.severity_medium,
                severity_low=excluded.severity_low,
                severity_info=excluded.severity_info,
                duration_seconds=excluded.duration_seconds,
                result_json=excluded.result_json,
                error_message=excluded.error_message,
                completed_at=excluded.completed_at
        """, (
            result.meta.scan_id,
            result.meta.repo_url,
            result.meta.owner,
            result.meta.repo_name,
            result.meta.branch,
            result.meta.commit_sha,
            result.status.value,
            result.risk_score,
            result.grade.value,
            len(result.findings),
            result.severity_counts.critical,
            result.severity_counts.high,
            result.severity_counts.medium,
            result.severity_counts.low,
            result.severity_counts.info,
            json.dumps(result.meta.languages),
            result.meta.duration_seconds,
            result.model_dump_json() if result.status in (ScanStatus.COMPLETE, ScanStatus.FAILED) else None,
            result.error_message,
            datetime.utcnow().isoformat() if result.status in (ScanStatus.COMPLETE, ScanStatus.FAILED) else None,
        ))
        conn.commit()
    finally:
        conn.close()


def get_scan(scan_id: str) -> Optional[dict]:
    """Get a scan record by ID."""
    conn = _get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM scans WHERE scan_id = ?", (scan_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_scan_result(scan_id: str) -> Optional[ScanResult]:
    """Get the full ScanResult object for a completed scan."""
    record = get_scan(scan_id)
    if not record or not record.get("result_json"):
        return None
    try:
        return ScanResult.model_validate_json(record["result_json"])
    except Exception as exc:
        logger.error(f"Failed to parse scan result: {exc}")
        return None


def list_scans(limit: int = 50, offset: int = 0) -> list[dict]:
    """List scan history, most recent first."""
    conn = _get_connection()
    try:
        rows = conn.execute(
            """SELECT scan_id, repo_url, owner, repo_name, branch,
                      status, risk_score, grade, findings_count,
                      severity_critical, severity_high, severity_medium,
                      severity_low, severity_info, languages,
                      duration_seconds, error_message, created_at, completed_at
               FROM scans
               ORDER BY created_at DESC
               LIMIT ? OFFSET ?""",
            (limit, offset),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def delete_scan(scan_id: str) -> bool:
    """Delete a scan record."""
    conn = _get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM scans WHERE scan_id = ?", (scan_id,)
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()
