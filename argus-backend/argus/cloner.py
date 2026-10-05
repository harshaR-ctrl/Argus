"""Safe shallow clone — fetch a repo with full security hardening."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import httpx

from argus.config import settings
from argus.validator import ParsedRepo

logger = logging.getLogger(__name__)


class CloneError(Exception):
    """Raised when cloning fails."""
    pass


class RepoTooLargeError(CloneError):
    """Raised when the repo exceeds the size cap."""
    pass


class RepoNotFoundError(CloneError):
    """Raised when the repo doesn't exist or is private."""
    pass


async def preflight_check(parsed: ParsedRepo) -> dict:
    """
    Hit the GitHub API to check the repo exists, is public, and is within
    the size cap.  Returns repo metadata dict.

    If the API is rate-limited, returns an empty dict (clone proceeds anyway
    and relies on clone-time limits).
    """
    api_url = f"https://api.github.com/repos/{parsed.owner}/{parsed.repo}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(api_url)

        if resp.status_code == 404:
            raise RepoNotFoundError(
                "Repository not found or is private. "
                "Only public repos are supported."
            )

        if resp.status_code == 403:
            # Rate-limited — skip the check
            logger.warning("GitHub API rate-limited; skipping preflight size check.")
            return {}

        if resp.status_code != 200:
            logger.warning(f"GitHub API returned {resp.status_code}; skipping preflight.")
            return {}

        data = resp.json()

        if data.get("private"):
            raise RepoNotFoundError(
                "This is a private repository. "
                "Only public repos are supported in this version."
            )

        # GitHub API `size` is in KB
        size_kb = data.get("size", 0)
        size_mb = size_kb / 1024
        if size_mb > settings.max_repo_size_mb:
            raise RepoTooLargeError(
                f"Repository is ~{size_mb:.0f} MB, which exceeds the "
                f"{settings.max_repo_size_mb} MB limit."
            )

        return data

    except (httpx.RequestError, httpx.TimeoutException) as exc:
        logger.warning(f"Preflight check failed ({exc}); proceeding with clone.")
        return {}


def clone_repo(
    parsed: ParsedRepo,
    dest_dir: Path,
    timeout: Optional[int] = None,
) -> tuple[str, float]:
    """
    Perform a safe shallow clone into dest_dir.

    Returns (commit_sha, duration_seconds).

    Security controls:
    - Hooks disabled (core.hooksPath=/dev/null)
    - file:// protocol blocked
    - Terminal prompts disabled
    - Depth 1 (shallow)
    - Timeout enforced
    - No code from the repo is ever executed
    """
    timeout = timeout or settings.clone_timeout_seconds

    dest_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        "git",
        "-c", "core.hooksPath=/dev/null",
        "-c", "protocol.file.allow=never",
        "clone",
        "--depth", "1",
        "--single-branch",
    ]

    if parsed.branch:
        cmd.extend(["--branch", parsed.branch])

    cmd.extend([parsed.clone_url, str(dest_dir)])

    env = {
        **os.environ,
        "GIT_TERMINAL_PROMPT": "0",
    }

    import time
    start = time.time()

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
            shell=False,  # NEVER shell=True
        )
    except subprocess.TimeoutExpired:
        raise CloneError(
            f"Clone timed out after {timeout}s. The repo may be too large."
        )
    except FileNotFoundError:
        raise CloneError(
            "Git is not installed or not on PATH. "
            "Please install git: https://git-scm.com/"
        )

    duration = time.time() - start

    if result.returncode != 0:
        stderr = result.stderr.strip()
        if "not found" in stderr.lower() or "does not exist" in stderr.lower():
            raise RepoNotFoundError(
                "Repository not found. Check the URL and ensure it is public."
            )
        raise CloneError(f"Clone failed (exit {result.returncode}): {stderr}")

    # Get the commit SHA
    try:
        sha_result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            cwd=str(dest_dir),
            timeout=10,
            shell=False,
        )
        commit_sha = sha_result.stdout.strip()
    except Exception:
        commit_sha = "unknown"

    # Post-clone guard: count files and total bytes
    _post_clone_guard(dest_dir)

    return commit_sha, duration


def _post_clone_guard(dest_dir: Path) -> None:
    """
    After cloning, verify the repo doesn't exceed file-count or total-size
    limits.  Raises RepoTooLargeError if exceeded.
    """
    total_files = 0
    total_bytes = 0

    for root, dirs, files in os.walk(dest_dir):
        # Skip .git directory
        dirs[:] = [d for d in dirs if d != ".git"]

        total_files += len(files)
        for f in files:
            try:
                total_bytes += (Path(root) / f).stat().st_size
            except OSError:
                pass

        if total_files > settings.max_file_count:
            raise RepoTooLargeError(
                f"Repository has more than {settings.max_file_count:,} files. "
                "This exceeds the scan limit."
            )

    size_mb = total_bytes / (1024 * 1024)
    if size_mb > settings.max_repo_size_mb:
        raise RepoTooLargeError(
            f"Repository is ~{size_mb:.0f} MB on disk, exceeding the "
            f"{settings.max_repo_size_mb} MB limit."
        )


def create_temp_dir(scan_id: str) -> Path:
    """Create an isolated temp directory for a scan."""
    base = settings.temp_dir / scan_id
    base.mkdir(parents=True, exist_ok=True)
    return base


def cleanup_temp_dir(scan_dir: Path) -> None:
    """Remove a scan's temp directory (always call in a finally block)."""
    try:
        if scan_dir.exists():
            shutil.rmtree(scan_dir, ignore_errors=True)
            logger.info(f"Cleaned up temp dir: {scan_dir}")
    except Exception as exc:
        logger.error(f"Failed to clean up {scan_dir}: {exc}")
