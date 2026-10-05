# Argus 👁️‍🗨️

**Argus** is an automated, AI-powered security analysis tool designed to scan Git repositories and detect vulnerabilities, leaked secrets, and insecure dependencies. By orchestrating top-tier open-source security scanners and enriching their findings with a Large Language Model (NVIDIA NIM / Llama 3.1 70B), Argus provides an actionable, unified, and beautifully rendered security report.

---

## 🚀 Features

* **Multi-Scanner Orchestration**:
  * **SAST (Semgrep)**: Detects code vulnerabilities (Injection, XSS, insecure cryptography, OWASP Top 10).
  * **Secrets (Gitleaks)**: Scans for exposed API keys, passwords, and tokens.
  * **SCA (OSV-Scanner)**: Identifies vulnerable open-source dependencies (npm, PyPI, Go, Maven, Rust).
* **AI-Powered Remediation**: Utilizes NVIDIA NIM (Llama 3.1 70B) to explain complex vulnerabilities and suggest concrete fixes.
* **Unified Reporting**: Aggregates all findings, removes duplicates, and generates an elegant HTML report and JSON summary.
* **Risk Scoring**: Evaluates the severity of findings and calculates an overarching "Grade" (A to F) based on a custom CVSS-inspired algorithm.
* **Modern Dashboard**: A Next.js-powered frontend to trigger scans and review historical scan data in real-time via WebSockets.

---

## 🛠️ Architecture

Argus is split into two main components:
1. **Backend (Python / FastAPI)**: Handles repository cloning, orchestrates the CLI scanners concurrently, processes/normalizes their JSON outputs, interfaces with the LLM for explanations, and generates the final HTML reports using Jinja2. Data is stored in SQLite.
2. **Frontend (Next.js / React)**: Provides a stunning Lemon-Green themed UI for the user to initiate scans, track real-time progress, and view historical reports.

---

## 🚦 Getting Started

### Prerequisites

* Python 3.11+
* Node.js 18+
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) *(Strongly Recommended for Windows users to use Semgrep)*

### Option 1: Docker (Recommended)

Running via Docker ensures all scanners (including Semgrep, which requires Linux) are perfectly configured.

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Argus.git
   cd Argus
   ```
2. Configure environment variables:
   * Copy `argus-backend/.env.example` to `argus-backend/.env`.
   * Add your `NVIDIA_NIM_API_KEY`.
3. Build and run using Docker Compose:
   ```bash
   docker-compose up --build
   ```
4. Access the web interface at: `http://localhost:3000`

### Option 2: Local Setup (Native)

*Note: Semgrep will be safely bypassed on native Windows. Gitleaks and OSV-Scanner binaries must be in your `PATH`.*

**Backend Setup:**
```bash
cd argus-backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
python -m argus.main
```

**Frontend Setup:**
```bash
cd argus-frontend
npm install
npm run dev
```

---

## 📝 Usage

1. Open your browser and navigate to `http://localhost:3000`.
2. Enter a valid public Git repository URL (e.g., `https://github.com/OWASP/NodeGoat`).
3. Click **Scan Repository**.
4. Watch the real-time terminal progress.
5. Once complete, you will be presented with a comprehensive HTML report detailing vulnerabilities, LLM insights, and remediation steps.

---

## 🛡️ License

This project is licensed under the MIT License.
