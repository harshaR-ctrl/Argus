"""Scanner base — abstract interface that every scanner implements."""

from __future__ import annotations

import logging
import subprocess
import shutil
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from argus.config import settings
from argus.models import Finding

logger = logging.getLogger(__name__)


@dataclass
class RawResult:
    """Raw output from a scanner before normalization."""
    scanner_name: str
    success: bool
    raw_json: Any = None          # parsed JSON data
    raw_output: str = ""          # stdout
    stderr: str = ""
    exit_code: int = 0
    timed_out: bool = False
    error_message: str = ""
    duration_seconds: float = 0.0


class BaseScanner(ABC):
    """Abstract scanner interface. Every scanner must implement this."""

    name: str = "base"
    binary: str = ""  # CLI binary name to check availability

    def available(self) -> bool:
        """Check if the scanner binary is installed and on PATH."""
        if not self.binary:
            return False
        return shutil.which(self.binary) is not None

    def get_version(self) -> str:
        """Try to get the scanner version string."""
        try:
            result = subprocess.run(
                [self.binary, "--version"],
                capture_output=True,
                text=True,
                shell=False,
            )
            out = result.stdout or ""
            return out.strip().split("\n")[0]
        except Exception:
            return "unknown"

    @abstractmethod
    def run(self, src_dir: Path) -> RawResult:
        """
        Run the scanner on the given source directory.

        Must return a RawResult — never raise exceptions for scanner failures.
        The orchestrator decides what to do with failures.
        """
        ...

    @abstractmethod
    def normalize(self, raw: RawResult, src_dir: Path) -> list[Finding]:
        """
        Convert raw scanner output into the unified Finding schema.

        Must handle malformed data gracefully and return an empty list on
        error rather than raising.
        """
        ...

    def execute(self, src_dir: Path) -> tuple[RawResult, list[Finding]]:
        """
        Run + normalize in one call. This is what the orchestrator uses.
        """
        raw = self.run(src_dir)
        if raw.success and raw.raw_json is not None:
            findings = self.normalize(raw, src_dir)
        else:
            findings = []
        return raw, findings

    def _run_command(
        self,
        cmd: list[str],
        timeout: Optional[int] = None,
        cwd: Optional[str] = None,
        env: Optional[dict] = None,
    ) -> RawResult:
        """
        Helper to run a subprocess command safely.

        Handles timeouts, missing binaries, and non-zero exit codes
        (many scanners exit non-zero when findings exist — handled
        per-scanner in the run() method).
        """
        timeout = timeout or settings.scanner_timeout_seconds

        import time
        start = time.time()

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=cwd,
                env=env,
                shell=False,
            )
            duration = time.time() - start

            return RawResult(
                scanner_name=self.name,
                success=True,  # caller decides based on exit_code
                raw_output=result.stdout,
                stderr=result.stderr,
                exit_code=result.returncode,
                duration_seconds=duration,
            )

        except subprocess.TimeoutExpired:
            duration = time.time() - start
            return RawResult(
                scanner_name=self.name,
                success=False,
                timed_out=True,
                error_message=f"{self.name} timed out after {timeout}s",
                duration_seconds=duration,
            )

        except FileNotFoundError:
            return RawResult(
                scanner_name=self.name,
                success=False,
                error_message=f"{self.name} binary not found. Install {self.binary}.",
            )

        except Exception as exc:
            duration = time.time() - start
            return RawResult(
                scanner_name=self.name,
                success=False,
                error_message=str(exc),
                duration_seconds=duration,
            )
