"""Language and manifest detection — walk the repo tree to identify ecosystems."""

from __future__ import annotations

import logging
import os
from collections import Counter
from pathlib import Path

from argus.config import settings

logger = logging.getLogger(__name__)

# ── Extension → Language mapping ────────────────────────────────────

EXTENSION_MAP: dict[str, str] = {
    ".py": "Python",
    ".pyw": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".kt": "Kotlin",
    ".kts": "Kotlin",
    ".go": "Go",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".c": "C",
    ".h": "C",
    ".hpp": "C++",
    ".swift": "Swift",
    ".scala": "Scala",
    ".r": "R",
    ".R": "R",
    ".dart": "Dart",
    ".lua": "Lua",
    ".pl": "Perl",
    ".pm": "Perl",
    ".sh": "Shell",
    ".bash": "Shell",
    ".zsh": "Shell",
    ".ps1": "PowerShell",
    ".sql": "SQL",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sass": "SASS",
    ".less": "LESS",
    ".vue": "Vue",
    ".svelte": "Svelte",
    ".tf": "Terraform",
    ".hcl": "HCL",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".json": "JSON",
    ".xml": "XML",
    ".md": "Markdown",
    ".toml": "TOML",
}

# ── Dependency manifest filenames ───────────────────────────────────

MANIFEST_FILES: set[str] = {
    # Python
    "requirements.txt",
    "Pipfile",
    "Pipfile.lock",
    "poetry.lock",
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    # JavaScript / TypeScript
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    # Java / JVM
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "gradle.lockfile",
    # Go
    "go.mod",
    "go.sum",
    # Rust
    "Cargo.toml",
    "Cargo.lock",
    # Ruby
    "Gemfile",
    "Gemfile.lock",
    # PHP
    "composer.json",
    "composer.lock",
    # .NET / C#
    "packages.config",
    # Dart / Flutter
    "pubspec.yaml",
    "pubspec.lock",
    # Docker / IaC
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
}


def detect_languages_and_manifests(
    repo_dir: Path,
) -> tuple[list[str], list[str], int, int]:
    """
    Walk the repo tree and detect languages, manifests, file count, and LOC.

    Returns:
        (languages, manifest_paths, file_count, loc_estimate)
    """
    lang_counter: Counter[str] = Counter()
    manifests_found: list[str] = []
    file_count = 0
    loc_estimate = 0

    skip_dirs_set = set(settings.skip_dirs)

    for root, dirs, files in os.walk(repo_dir):
        # Prune directories we don't want to scan
        dirs[:] = [d for d in dirs if d not in skip_dirs_set]

        for filename in files:
            filepath = Path(root) / filename
            rel_path = str(filepath.relative_to(repo_dir)).replace("\\", "/")

            file_count += 1

            # Check manifests
            if filename in MANIFEST_FILES:
                manifests_found.append(rel_path)

            # Detect language from extension
            ext = filepath.suffix.lower()
            if ext in EXTENSION_MAP:
                lang = EXTENSION_MAP[ext]
                lang_counter[lang] += 1

                # Rough LOC estimate (count newlines in source files)
                if ext not in {".json", ".xml", ".yaml", ".yml", ".md", ".toml"}:
                    try:
                        content = filepath.read_bytes()
                        loc_estimate += content.count(b"\n") + 1
                    except (OSError, PermissionError):
                        pass

    # Sort languages by frequency, descending
    languages = [lang for lang, _ in lang_counter.most_common()]

    logger.info(
        f"Detected {len(languages)} languages, "
        f"{len(manifests_found)} manifests, "
        f"{file_count} files, ~{loc_estimate} LOC"
    )

    return languages, manifests_found, file_count, loc_estimate
