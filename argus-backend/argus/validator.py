"""URL validation — strict GitHub URL parsing and sanitization."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


# Strict regex: only github.com, alphanumeric + dash/dot/underscore for owner/repo
_GITHUB_URL_RE = re.compile(
    r"^https://github\.com/"
    r"(?P<owner>[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)"
    r"/"
    r"(?P<repo>[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)"
    r"(?:\.git)?"
    r"(?:/tree/(?P<branch>[\w./-]+))?"
    r"/?$"
)


@dataclass(frozen=True)
class ParsedRepo:
    """Validated GitHub repo info."""
    owner: str
    repo: str
    branch: Optional[str]
    clone_url: str

    @property
    def full_name(self) -> str:
        return f"{self.owner}/{self.repo}"

    @property
    def display_name(self) -> str:
        name = self.full_name
        if self.branch:
            name += f" @ {self.branch}"
        return name


class ValidationError(Exception):
    """Raised when a URL fails validation."""
    pass


def validate_github_url(url: str) -> ParsedRepo:
    """
    Validate and parse a GitHub repository URL.

    Accepts:
        https://github.com/<owner>/<repo>
        https://github.com/<owner>/<repo>.git
        https://github.com/<owner>/<repo>/tree/<branch>

    Raises:
        ValidationError: if the URL is invalid or potentially malicious.
    """
    if not url or not isinstance(url, str):
        raise ValidationError("URL must be a non-empty string.")

    url = url.strip()

    # Reject dangerous schemes
    for scheme in ("file://", "ssh://", "ftp://", "git@", "data:"):
        if url.lower().startswith(scheme):
            raise ValidationError(
                f"Unsupported URL scheme. Only HTTPS GitHub URLs are accepted."
            )

    # Reject shell metacharacters (defense in depth — we never use shell=True,
    # but belt-and-suspenders)
    dangerous_chars = set(";|&$`\\!{}[]<>()'\"")
    if any(ch in url for ch in dangerous_chars):
        raise ValidationError(
            "URL contains invalid characters."
        )

    match = _GITHUB_URL_RE.match(url)
    if not match:
        raise ValidationError(
            "Invalid GitHub URL. Expected format: "
            "https://github.com/<owner>/<repo>"
        )

    owner = match.group("owner")
    repo = match.group("repo")
    branch = match.group("branch")

    # Sanitize: remove .git suffix from repo name if present
    if repo.endswith(".git"):
        repo = repo[:-4]

    clone_url = f"https://github.com/{owner}/{repo}.git"

    return ParsedRepo(
        owner=owner,
        repo=repo,
        branch=branch,
        clone_url=clone_url,
    )
