# techstack.md — RepoScan

**Principle:** glue together proven free open-source scanners with a thin Python layer. Don't write detection engines yourself — write the *orchestration, normalization, and reporting*, which is where the project's value is.

**Total cost: ₹0**

---

## 1. Architecture at a Glance

```
┌──────────────┐    ┌───────────────────────────────────────────────┐
│  Streamlit   │    │               Python Core (reposcan)           │
│  Web UI      │───▶│                                               │
└──────────────┘    │  validator → cloner → detector → runners      │
┌──────────────┐    │                         │                     │
│  CLI (Typer) │───▶│        ┌────────────────┼──────────────┐      │
└──────────────┘    │        ▼                ▼              ▼      │
                    │    Semgrep          Gitleaks      OSV-Scanner │
                    │     (SAST)          (Secrets)       (SCA)     │
                    │        └────────────────┼──────────────┘      │
                    │                         ▼                     │
                    │   normalizer → dedupe → scorer → (LLM opt.)   │
                    │                         ▼                     │
                    │              Jinja2 → HTML / JSON             │
                    └───────────────────────────────────────────────┘
                                   │
                              SQLite (optional scan history)
```

## 2. Stack Summary

| Layer | Choice | Why | Cost |
|-------|--------|-----|------|
| **Language** | Python 3.11+ | Fastest to prototype, great subprocess/JSON handling, you likely already know it | Free |
| **Repo fetching** | `git` CLI (shallow clone) via `subprocess` / GitPython | `--depth 1` is fast and doesn't need an API token | Free |
| **SAST (code vulns)** | **Semgrep OSS** | Multi-language, rich community rules, JSON output, includes CWE/OWASP metadata | Free |
| **Secret detection** | **Gitleaks** | Fast, accurate, maintained rule set, JSON output | Free |
| **Dependency scan (SCA)** | **OSV-Scanner** (backed by OSV.dev) | Reads many lockfiles/manifests, queries a free public DB covering npm, PyPI, Maven, Go, etc. | Free |
| **IaC / Docker (stretch)** | **Trivy** (`config` mode) | One binary, covers Dockerfile/Terraform/K8s misconfigs | Free |
| **Language-specific extra (optional)** | **Bandit** (Python) | Adds depth for Python repos | Free |
| **CLI** | **Typer** | Clean CLI with type hints, minimal code | Free |
| **Web UI** | **Streamlit** | Full UI in ~100 lines; no frontend build | Free |
| **Data models** | **Pydantic v2** | Enforces the unified finding schema, easy JSON export | Free |
| **Report templating** | **Jinja2** + inline CSS/vanilla JS | Self-contained, shareable HTML; filterable tables | Free |
| **Charts in report** | **Chart.js via CDN** or inline SVG | Severity pie/bar; SVG keeps the report offline-capable | Free |
| **PDF (stretch)** | **WeasyPrint** | HTML → PDF with no extra service | Free |
| **Storage (optional)** | **SQLite** | Zero-setup scan history | Free |
| **Optional AI explanations** | **Google Gemini free tier**, **Groq free tier**, or **Ollama** (local) | Plain-English explanation + fix. Must be optional with a template fallback | Free (rate-limited) |
| **Packaging** | **Docker** (single image bundling Python + scanner binaries) | Reproducible, isolates untrusted repos | Free |
| **Hosting (demo)** | Local, **Streamlit Community Cloud**, or **Hugging Face Spaces (Docker)** | Free tiers; HF Spaces handles Docker with bundled binaries best | Free |
| **CI / testing** | **GitHub Actions** + **pytest** | Free minutes for public repos | Free |

> **Note on hosting:** Streamlit Community Cloud can't easily install arbitrary binaries (Gitleaks, OSV-Scanner). If you want the hosted demo, use **Hugging Face Spaces with a Dockerfile**, or install tools via `pip`/packages where available. For college demos, running locally via Docker is perfectly fine.

## 3. Why These Tools (and What They Cover)

| Category | Tool | Detects | Output |
|----------|------|---------|--------|
| SAST | Semgrep | SQL/command injection, XSS, insecure crypto, path traversal, unsafe deserialization, hardcoded creds, etc. | `--json` |
| Secrets | Gitleaks | AWS/GCP/Azure keys, GitHub/Slack tokens, private keys, generic high-entropy secrets | `--report-format json` |
| SCA | OSV-Scanner | Known CVEs/GHSAs in `package-lock.json`, `requirements.txt`, `poetry.lock`, `pom.xml`, `go.mod`, `Cargo.lock`, etc. | `--format json` |
| IaC (stretch) | Trivy config | Dockerfile root user, open security groups, privileged containers | `--format json` |

Semgrep rulesets to start with: `p/security-audit`, `p/owasp-top-ten`, `p/secrets` (optional), plus language packs like `p/python`, `p/javascript`, `p/java`.

## 4. Python Dependencies

```text
# requirements.txt
typer>=0.12
pydantic>=2.6
jinja2>=3.1
streamlit>=1.35
gitpython>=3.1        # or just use subprocess + git CLI
requests>=2.31        # optional LLM / OSV API calls
semgrep>=1.70         # installs the semgrep CLI
bandit>=1.7           # optional
pytest>=8.0
```

External binaries (installed in Docker image or locally):

```bash
# Gitleaks (Linux example)
curl -sSL https://github.com/gitleaks/gitleaks/releases/latest/download/<asset> | tar xz
# OSV-Scanner
go install github.com/google/osv-scanner/v2/cmd/osv-scanner@latest   # or download a release binary
# Semgrep
pip install semgrep
```

*(Check each project's releases page for the current asset name for your OS.)*

## 5. Suggested Project Structure

```
reposcan/
├── reposcan/
│   ├── __init__.py
│   ├── cli.py              # Typer entry point
│   ├── config.py           # limits, timeouts, severity weights
│   ├── validator.py        # URL validation
│   ├── cloner.py           # safe shallow clone + size caps + cleanup
│   ├── detector.py         # language / ecosystem detection
│   ├── models.py           # Pydantic: Finding, ScanResult, Dependency
│   ├── scanners/
│   │   ├── base.py         # Scanner interface: run() -> list[Finding]
│   │   ├── semgrep.py
│   │   ├── gitleaks.py
│   │   ├── osv.py
│   │   └── trivy.py        # stretch
│   ├── normalize.py        # raw → unified Finding
│   ├── dedupe.py
│   ├── scoring.py          # severity + risk score + grade
│   ├── enrich.py           # CWE/OWASP map, remediation templates, optional LLM
│   └── report/
│       ├── render.py
│       └── templates/report.html.j2
├── app.py                  # Streamlit UI
├── tests/
├── Dockerfile
├── requirements.txt
└── README.md
```

## 6. Security Hardening (cheap but important)

Since the tool clones *untrusted* repos:

| Risk | Control |
|------|---------|
| Git hooks / config execution | Clone with `-c core.hooksPath=/dev/null`, `GIT_TERMINAL_PROMPT=0`; never run `make`, `npm install`, `pip install`, etc. on the target |
| Huge repos / zip bombs | Check size via GitHub API (`/repos/{owner}/{repo}` → `size`) before cloning; cap total files and bytes |
| Symlink escapes | Scanners get `--no-follow-symlinks` where supported; skip symlinks outside the clone root |
| Command injection through URL | Strict regex validation; pass args as a list to `subprocess.run` (never `shell=True`) |
| Long-running scans | Per-scanner and global timeouts |
| Secret leakage in reports | Mask values (`AKIA****MPLE`); never log raw secrets |
| Host compromise | Run inside Docker as a non-root user with no extra mounts |
| Leftover data | Delete temp dir in a `finally` block |

## 7. Free-Tier Limits to Know

| Service | Limit to watch |
|---------|----------------|
| GitHub API (unauthenticated) | 60 requests/hour — only used for a repo-size check; `git clone` itself isn't API-limited |
| OSV.dev | Generous public API, no key needed |
| Gemini / Groq free tiers | Per-minute and per-day request caps — batch findings and cap LLM calls per scan |
| Hugging Face Spaces (free CPU) | Limited RAM/CPU, sleeps when idle |

## 8. Alternatives Considered

| Instead of | Alternative | Why not chosen |
|------------|-------------|----------------|
| Semgrep | CodeQL | Powerful but heavier setup; licensing limits for non-open-source use |
| Semgrep | SonarQube Community | Needs a server; overkill for a prototype |
| Gitleaks | TruffleHog, detect-secrets | Also good — swap-able behind the scanner interface |
| OSV-Scanner | Trivy / Grype / `npm audit` / `pip-audit` | Fine alternatives; OSV-Scanner covers the most ecosystems in one tool |
| Streamlit | FastAPI + React | Better for production, far more work for a prototype |
| Celery + Redis | Plain `subprocess` + threads | Queue is unnecessary at prototype scale |

## 9. Recommended Build Order

1. CLI + clone + Semgrep only → get one real finding printed
2. Add Gitleaks and OSV-Scanner
3. Unified schema + scoring
4. HTML report
5. Streamlit wrapper
6. Dockerize
7. (Optional) LLM explanations, Trivy, PDF
