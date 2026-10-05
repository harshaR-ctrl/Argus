# PRD: RepoScan — GitHub Repository Vulnerability Detector

> Working name: **RepoScan**. Status: Prototype / MVP. Budget: **₹0 / $0**.

---

## 1. Overview

RepoScan takes a **GitHub repository URL** as input, scans the code with free open-source security engines, and produces a **detailed, readable vulnerability report** (HTML + JSON). It is a *strong prototype*, not an enterprise product: it favors clarity, accuracy of results, and a good report over scale, auth, and multi-tenant features.

## 2. Problem Statement

Developers (especially students, freelancers, and small teams) push code to GitHub without a security review. Existing tools are either paid, complex to set up, or produce raw output that is hard to act on. There is no simple "paste a repo link → get a clear security report" workflow that is free.

## 3. Goals

| # | Goal |
|---|------|
| G1 | Accept a public GitHub URL and produce a full scan report in under ~3 minutes for a typical repo (< 50 MB) |
| G2 | Detect three categories of issues: **code vulnerabilities (SAST)**, **leaked secrets**, **vulnerable dependencies (SCA)** |
| G3 | Present findings with severity, file/line, explanation, CWE/OWASP mapping, and a suggested fix |
| G4 | Run entirely on free tooling and free hosting |
| G5 | Be simple to demo: one command or one web page |

## 4. Non-Goals (explicitly out of scope for the prototype)

- Multi-user accounts, billing, teams, RBAC
- Private repo scanning via OAuth (stretch goal only)
- Continuous monitoring, webhooks, PR comments
- Dynamic testing (DAST), fuzzing, or executing the target code
- Compliance certifications (SOC2, PCI mapping)
- Auto-fix pull requests
- Horizontal scaling / job queues

## 5. Target Users

- **Primary:** Student developers and freelancers who want a quick security check before submitting/deploying a project
- **Secondary:** Reviewers, mentors, and recruiters who want to assess the security hygiene of a candidate's repo

## 6. User Stories

1. As a developer, I paste a GitHub URL and get a report without installing anything.
2. As a developer, I see findings sorted by severity so I know what to fix first.
3. As a developer, I see the exact file, line number, and code snippet for each issue.
4. As a developer, I get a plain-English explanation and a recommended fix for each issue.
5. As a reviewer, I can download the report (HTML/JSON) and share it.
6. As a developer, I can run the same scan from the command line.

## 7. Functional Requirements

### 7.1 Input
- **FR-1** Accept a GitHub HTTPS URL (`https://github.com/<owner>/<repo>`), optionally with a branch (`/tree/<branch>`).
- **FR-2** Validate the URL (host must be `github.com`; reject anything else).
- **FR-3** Optional inputs: branch, scan depth (shallow clone vs. history for secrets), scanner toggles.

### 7.2 Scanning
- **FR-4** Shallow-clone the repo into an isolated temp directory. **Never execute** any code from the repo.
- **FR-5** Detect languages/ecosystems present (Python, JS/TS, Java, Go, etc.) to pick relevant rules.
- **FR-6** Run **SAST** scan for insecure code patterns (injection, XSS, hardcoded crypto, unsafe deserialization, etc.).
- **FR-7** Run **secret detection** (API keys, tokens, private keys, passwords).
- **FR-8** Run **dependency scan** against a public vulnerability database (CVE/GHSA/OSV) from manifest/lock files.
- **FR-9** *(Stretch)* Scan Dockerfiles / IaC for misconfigurations.

### 7.3 Processing
- **FR-10** Normalize all scanner outputs into one **unified finding schema** (see `workflow.md`).
- **FR-11** De-duplicate overlapping findings.
- **FR-12** Assign a severity (Critical / High / Medium / Low / Info) and map to **CWE** and **OWASP Top 10** where available.
- **FR-13** Compute an overall **risk score (0–100)** and a letter grade (A–F).
- **FR-14** *(Optional)* Use an LLM (free tier or local) to write a plain-English explanation + fix suggestion per finding.

### 7.4 Output / Report
- **FR-15** Generate a **self-contained HTML report** and a **JSON report**. *(Stretch: PDF, SARIF.)*
- **FR-16** Report must contain:
  - Executive summary (repo name, commit SHA, scan time, languages, risk score/grade)
  - Findings count by severity and by category (chart or table)
  - Detailed findings list: title, severity, category, file:line, code snippet, description, CWE/OWASP, remediation, reference links
  - Vulnerable dependencies table: package, installed version, CVE/GHSA ID, fixed-in version, severity
  - Secrets section (values **masked** — never print full secrets)
  - Scan metadata: tools used and their versions, duration, any scanner errors/skips
- **FR-17** Findings are filterable/sortable in the HTML report (by severity, category, file).

### 7.5 Interfaces
- **FR-18** **CLI:** `reposcan scan <github-url> --out report/`
- **FR-19** **Web UI:** single page with URL input, progress indicator, and report view/download.

## 8. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Cost** | Zero. Only open-source tools and free tiers |
| **Performance** | Typical repo (< 50 MB, < 5k files) scans in ≤ 3 min; hard timeout 10 min |
| **Safety** | Clone to temp dir, no code execution, size cap (e.g., 200 MB), file-count cap, cleanup after scan |
| **Privacy** | Public repos only in MVP; no repo contents stored beyond the report; secrets masked |
| **Reliability** | If one scanner fails, the others still run and the report notes the failure |
| **Usability** | Report readable by a non-security person |
| **Portability** | Runs on Windows/Linux/macOS via Docker or a local Python install |

## 9. Report Quality Expectations

- Prefer **fewer, higher-confidence** findings over noisy output. Every finding must include a location and rationale.
- Be honest: the report states it is an automated scan, may contain false positives, and does not guarantee absence of vulnerabilities.

## 10. Success Metrics (prototype level)

| Metric | Target |
|--------|--------|
| Scan completes successfully on a test set of 10 diverse public repos | ≥ 90% |
| Known planted vulnerabilities in a deliberately vulnerable repo are detected (e.g., OWASP Juice Shop, DVWA, WebGoat, NodeGoat) | ≥ 80% |
| Time to first report for a medium repo | ≤ 3 min |
| Report understood without extra explanation (tested with 3 peers) | 3/3 |
| Total running cost | ₹0 |

## 11. Assumptions & Constraints

- Public GitHub repos only; unauthenticated GitHub access (rate limits apply to API, not `git clone`).
- Free-tier hosting has limited CPU/RAM, so large monorepos may be rejected or partially scanned.
- Accuracy is bounded by the underlying open-source rulesets.

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Malicious repo tries to exploit the scanner (e.g., git hooks, symlinks, huge files) | High | Disable hooks, `--depth 1`, no execution, container isolation, size/time limits |
| False positives frustrate users | Medium | Severity + confidence fields, de-duplication, curated Semgrep rulesets |
| Free LLM rate limits | Low | LLM is optional; template-based fallback explanations |
| Large repos exceed free-host limits | Medium | Size cap with a clear error message |
| Leaking real secrets in the report | High | Mask all secret values (show first/last 2–4 chars only) |

## 13. Milestones (suggested ~2 weeks, part-time)

| Phase | Deliverable |
|-------|-------------|
| **Day 1–2** | Repo setup, URL validation, safe clone module |
| **Day 3–5** | Integrate Semgrep, Gitleaks, OSV-Scanner; raw JSON outputs working via CLI |
| **Day 6–7** | Unified schema, normalizer, de-dupe, severity + risk score |
| **Day 8–10** | HTML/JSON report templates |
| **Day 11–12** | Web UI (Streamlit) + progress display |
| **Day 13** | Test on vulnerable repos, fix false positives |
| **Day 14** | Docs, demo run, deploy to free host |

## 14. Acceptance Criteria (MVP "Done")

- [ ] Paste a public GitHub URL → HTML + JSON report generated end to end
- [ ] All three scan categories (SAST, secrets, dependencies) produce findings on a known vulnerable repo
- [ ] Each finding shows severity, location, snippet, explanation, and fix guidance
- [ ] Secrets are masked in all outputs
- [ ] Scanner failure on one engine doesn't crash the whole scan
- [ ] Temp files are cleaned up after every scan
- [ ] README explains setup and usage in under 5 commands

## 15. Future Scope (post-prototype)

- Private repos via GitHub OAuth / PAT
- GitHub Action + PR comments
- SARIF export for GitHub Code Scanning
- IaC / container scanning (Trivy), license compliance, SBOM export (CycloneDX)
- Scan history and diff between scans
- AI-assisted triage to cut false positives

## 16. Open Questions

1. Web UI first or CLI first? (Recommendation: CLI first, Streamlit wrapper second.)
2. Is optional LLM explanation worth including in v1, or is template-based remediation enough?
3. Where will the demo be hosted (local, Hugging Face Spaces, Streamlit Cloud)?
