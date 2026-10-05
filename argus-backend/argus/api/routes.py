"""API routes — FastAPI endpoints for scanning, reports, and history."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse

from argus import __version__
from argus.api.schemas import (
    ScanRequest, ScanResponse, ScanStatusResponse,
    ScanHistoryItem, HealthResponse,
)
from argus.config import settings
from argus.cloner import (
    preflight_check, clone_repo, create_temp_dir, cleanup_temp_dir,
    CloneError, RepoTooLargeError, RepoNotFoundError,
)
from argus.database import save_scan, get_scan, get_scan_result, list_scans, delete_scan
from argus.dedupe import deduplicate
from argus.detector import detect_languages_and_manifests
from argus.enrich import enrich_findings
from argus.llm import enrich_with_llm
from argus.models import (
    ScanResult, ScanMeta, ScanStatus, ScanProgress,
    ScannerError, Finding,
)
from argus.report.render import render_html_report, render_json_report, save_reports
from argus.scanners import SemgrepScanner, GitleaksScanner, OSVScanner
from argus.scoring import compute_risk_score, score_to_grade, count_severities, count_categories
from argus.validator import validate_github_url, ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

# ── In-memory scan progress tracking ────────────────────────────────
_scan_progress: dict[str, ScanProgress] = {}
_scan_results: dict[str, ScanResult] = {}
_ws_connections: dict[str, list[WebSocket]] = {}

# Thread pool for running scanners (they are CPU/IO-bound subprocesses)
_executor = ThreadPoolExecutor(max_workers=4)


def _update_progress(
    scan_id: str,
    status: ScanStatus,
    step: str = "",
    detail: str = "",
    progress: int = 0,
) -> None:
    """Update scan progress and notify WebSocket clients."""
    prog = ScanProgress(
        scan_id=scan_id,
        status=status,
        step=step,
        detail=detail,
        progress_percent=progress,
    )
    _scan_progress[scan_id] = prog


async def _notify_ws(scan_id: str) -> None:
    """Send progress update to all connected WebSocket clients."""
    if scan_id in _ws_connections and scan_id in _scan_progress:
        prog = _scan_progress[scan_id]
        data = prog.model_dump_json()
        dead = []
        for ws in _ws_connections[scan_id]:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            _ws_connections[scan_id].remove(ws)


# ── Health Check ────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint — also reports scanner availability."""
    return HealthResponse(
        version=__version__,
        scanners={
            "semgrep": SemgrepScanner().available(),
            "gitleaks": GitleaksScanner().available(),
            "osv-scanner": OSVScanner().available(),
        },
    )


# ── Start Scan ──────────────────────────────────────────────────────

@router.post("/scan", response_model=ScanResponse)
async def start_scan(request: ScanRequest):
    """Start a new vulnerability scan for a GitHub repository."""
    # Validate URL
    try:
        parsed = validate_github_url(request.url)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Create scan
    scan_id = uuid.uuid4().hex
    result = ScanResult(
        meta=ScanMeta(
            scan_id=scan_id,
            repo_url=request.url,
            owner=parsed.owner,
            repo_name=parsed.repo,
            branch=request.branch or parsed.branch,
        ),
        status=ScanStatus.PENDING,
    )

    # Save initial state
    save_scan(result)
    _scan_results[scan_id] = result

    # Start scan in background
    asyncio.create_task(_run_scan(scan_id, parsed, request.enable_llm))

    return ScanResponse(
        scan_id=scan_id,
        status="pending",
        message=f"Scan started for {parsed.full_name}",
    )


# ── Scan Status ─────────────────────────────────────────────────────

@router.get("/scan/{scan_id}", response_model=ScanStatusResponse)
async def get_scan_status(scan_id: str):
    """Get the current status of a scan."""
    # Check in-memory first
    if scan_id in _scan_progress:
        prog = _scan_progress[scan_id]
        result = _scan_results.get(scan_id)
        return ScanStatusResponse(
            scan_id=scan_id,
            status=prog.status.value,
            step=prog.step,
            detail=prog.detail,
            progress_percent=prog.progress_percent,
            repo_url=result.meta.repo_url if result else "",
            owner=result.meta.owner if result else "",
            repo_name=result.meta.repo_name if result else "",
        )

    # Check database
    record = get_scan(scan_id)
    if not record:
        raise HTTPException(status_code=404, detail="Scan not found")

    return ScanStatusResponse(
        scan_id=scan_id,
        status=record["status"],
        repo_url=record.get("repo_url", ""),
        owner=record.get("owner", ""),
        repo_name=record.get("repo_name", ""),
    )


# ── Scan Report ─────────────────────────────────────────────────────

@router.get("/scan/{scan_id}/report")
async def get_scan_report(scan_id: str):
    """Get the full scan report as JSON."""
    # Check in-memory first
    result = _scan_results.get(scan_id)
    if result and result.status == ScanStatus.COMPLETE:
        return JSONResponse(content=result.model_dump(mode="json"))

    # Check database
    result = get_scan_result(scan_id)
    if not result:
        record = get_scan(scan_id)
        if not record:
            raise HTTPException(status_code=404, detail="Scan not found")
        if record["status"] != "complete":
            raise HTTPException(
                status_code=202,
                detail=f"Scan is still {record['status']}",
            )
        raise HTTPException(status_code=404, detail="Report not found")

    return JSONResponse(content=result.model_dump(mode="json"))


@router.get("/scan/{scan_id}/report/html")
async def get_html_report(scan_id: str):
    """Get the scan report as a self-contained HTML page."""
    result = _scan_results.get(scan_id)
    if not result or result.status != ScanStatus.COMPLETE:
        result = get_scan_result(scan_id)

    if not result:
        raise HTTPException(status_code=404, detail="Report not found")

    html = render_html_report(result)
    return HTMLResponse(content=html)


# ── Scan History ────────────────────────────────────────────────────

@router.get("/history")
async def get_history(limit: int = 50, offset: int = 0):
    """List past scans, most recent first."""
    scans = list_scans(limit=limit, offset=offset)
    return scans


@router.delete("/scan/{scan_id}")
async def delete_scan_record(scan_id: str):
    """Delete a scan from history."""
    deleted = delete_scan(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scan not found")
    # Also remove from in-memory
    _scan_progress.pop(scan_id, None)
    _scan_results.pop(scan_id, None)
    return {"message": "Scan deleted"}


# ── WebSocket ───────────────────────────────────────────────────────

@router.websocket("/ws/{scan_id}")
async def websocket_progress(ws: WebSocket, scan_id: str):
    """WebSocket endpoint for real-time scan progress updates."""
    await ws.accept()

    if scan_id not in _ws_connections:
        _ws_connections[scan_id] = []
    _ws_connections[scan_id].append(ws)

    try:
        # Send current progress if available
        if scan_id in _scan_progress:
            await ws.send_text(_scan_progress[scan_id].model_dump_json())

        # Keep alive until scan completes or client disconnects
        while True:
            try:
                # Wait for messages from client (ping/pong)
                await asyncio.wait_for(ws.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # Send ping
                if scan_id in _scan_progress:
                    await ws.send_text(_scan_progress[scan_id].model_dump_json())
                    if _scan_progress[scan_id].status in (
                        ScanStatus.COMPLETE, ScanStatus.FAILED
                    ):
                        break
    except WebSocketDisconnect:
        pass
    finally:
        if scan_id in _ws_connections:
            try:
                _ws_connections[scan_id].remove(ws)
            except ValueError:
                pass


# ── Scan Orchestrator ───────────────────────────────────────────────

async def _run_scan(
    scan_id: str,
    parsed,
    enable_llm: Optional[bool] = None,
) -> None:
    """
    Main scan orchestration — runs the full pipeline:
    validate → clone → detect → scan → normalize → dedupe → enrich → score → report
    """
    result = _scan_results[scan_id]
    scan_dir = None
    start_time = time.time()

    try:
        # ── Step 1: Preflight ────────────────────────────────
        _update_progress(scan_id, ScanStatus.PENDING, "Validating", "Checking repository...", 5)
        await _notify_ws(scan_id)

        try:
            await preflight_check(parsed)
        except (RepoTooLargeError, RepoNotFoundError) as exc:
            result.status = ScanStatus.FAILED
            result.error_message = str(exc)
            save_scan(result)
            _update_progress(scan_id, ScanStatus.FAILED, "Failed", str(exc), 0)
            await _notify_ws(scan_id)
            return

        # ── Step 2: Clone ────────────────────────────────────
        _update_progress(scan_id, ScanStatus.CLONING, "Cloning", f"Cloning {parsed.full_name}...", 15)
        await _notify_ws(scan_id)

        scan_dir = create_temp_dir(scan_id)
        src_dir = scan_dir / "src"

        loop = asyncio.get_event_loop()
        try:
            commit_sha, clone_duration = await loop.run_in_executor(
                _executor, clone_repo, parsed, src_dir
            )
        except CloneError as exc:
            result.status = ScanStatus.FAILED
            result.error_message = str(exc)
            save_scan(result)
            _update_progress(scan_id, ScanStatus.FAILED, "Clone failed", str(exc), 0)
            await _notify_ws(scan_id)
            return

        result.meta.commit_sha = commit_sha
        _update_progress(
            scan_id, ScanStatus.CLONING, "Cloned",
            f"Cloned @ {commit_sha[:8]} ({clone_duration:.1f}s)", 25,
        )
        await _notify_ws(scan_id)

        # ── Step 3: Detect ───────────────────────────────────
        languages, manifests, file_count, loc = await loop.run_in_executor(
            _executor, detect_languages_and_manifests, src_dir,
        )
        result.meta.languages = languages
        result.meta.manifests = manifests
        result.meta.files_scanned = file_count
        result.meta.loc_estimate = loc

        # ── Step 4: Scan ─────────────────────────────────────
        _update_progress(scan_id, ScanStatus.SCANNING, "Scanning", "Running security scanners...", 35)
        await _notify_ws(scan_id)

        all_findings: list[Finding] = []
        scanners = [SemgrepScanner(), GitleaksScanner(), OSVScanner()]

        for i, scanner in enumerate(scanners):
            scanner_name = scanner.name
            progress_pct = 35 + ((i + 1) / len(scanners)) * 30

            if not scanner.available():
                result.meta.scanner_errors.append(
                    ScannerError(
                        scanner=scanner_name,
                        error=f"{scanner_name} not installed",
                    )
                )
                _update_progress(
                    scan_id, ScanStatus.SCANNING, f"{scanner_name}",
                    f"{scanner_name} not available — skipped", int(progress_pct),
                )
                await _notify_ws(scan_id)
                continue

            _update_progress(
                scan_id, ScanStatus.SCANNING, f"{scanner_name}",
                f"Running {scanner_name}...", int(progress_pct),
            )
            await _notify_ws(scan_id)

            try:
                raw, findings = await loop.run_in_executor(
                    _executor, scanner.execute, src_dir,
                )

                result.meta.tools_used.append(scanner_name)
                result.meta.tool_versions[scanner_name] = scanner.get_version()

                if not raw.success:
                    result.meta.scanner_errors.append(
                        ScannerError(
                            scanner=scanner_name,
                            error=raw.error_message,
                            exit_code=raw.exit_code,
                            timed_out=raw.timed_out,
                        )
                    )

                all_findings.extend(findings)
                _update_progress(
                    scan_id, ScanStatus.SCANNING, f"{scanner_name}",
                    f"{scanner_name}: {len(findings)} findings", int(progress_pct),
                )
                await _notify_ws(scan_id)

            except Exception as exc:
                logger.error(f"Scanner {scanner_name} failed: {exc}")
                result.meta.scanner_errors.append(
                    ScannerError(scanner=scanner_name, error=str(exc))
                )

        # ── Step 5: Process ──────────────────────────────────
        _update_progress(scan_id, ScanStatus.PROCESSING, "Processing", "De-duplicating and enriching...", 70)
        await _notify_ws(scan_id)

        # De-duplicate
        deduplicated, noise_count = deduplicate(all_findings)
        result.noise_findings_count = noise_count

        # Enrich with CWE/OWASP
        enriched = enrich_findings(deduplicated)

        # Optional LLM enrichment
        llm_active = enable_llm if enable_llm is not None else settings.llm_enabled
        if llm_active and settings.nvidia_nim_api_key:
            _update_progress(scan_id, ScanStatus.PROCESSING, "AI Analysis", "Running AI explanations...", 80)
            await _notify_ws(scan_id)
            enriched = await enrich_with_llm(enriched)

        # Score
        result.findings = enriched
        result.risk_score = compute_risk_score(enriched)
        result.grade = score_to_grade(result.risk_score)
        result.severity_counts = count_severities(enriched)
        result.category_counts = count_categories(enriched)

        # ── Step 6: Report ───────────────────────────────────
        _update_progress(scan_id, ScanStatus.PROCESSING, "Report", "Generating report...", 90)
        await _notify_ws(scan_id)

        result.meta.duration_seconds = time.time() - start_time
        result.status = ScanStatus.COMPLETE

        # Save reports to disk
        try:
            await loop.run_in_executor(_executor, save_reports, result)
        except Exception as exc:
            logger.error(f"Failed to save reports: {exc}")

        # Save to database
        save_scan(result)

        _update_progress(
            scan_id, ScanStatus.COMPLETE, "Complete",
            f"Risk score: {result.risk_score}/100 · Grade: {result.grade.value} · "
            f"{len(result.findings)} findings", 100,
        )
        await _notify_ws(scan_id)

    except Exception as exc:
        logger.exception(f"Scan {scan_id} failed unexpectedly")
        result.status = ScanStatus.FAILED
        result.error_message = str(exc)
        result.meta.duration_seconds = time.time() - start_time
        save_scan(result)
        _update_progress(scan_id, ScanStatus.FAILED, "Error", str(exc), 0)
        await _notify_ws(scan_id)

    finally:
        # ── Step 7: Cleanup ──────────────────────────────────
        if scan_dir:
            cleanup_temp_dir(scan_dir)
