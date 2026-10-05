# ◈ Argus — Backend

GitHub Repository Vulnerability Scanner — Python + FastAPI backend.

## Quick Start

### Prerequisites

- **Python 3.11+**
- **Git** installed and on PATH
- At least one scanner installed:
  - **Semgrep**: `pip install semgrep`
  - **Gitleaks**: [Download binary](https://github.com/gitleaks/gitleaks/releases)
  - **OSV-Scanner**: [Download binary](https://github.com/google/osv-scanner/releases)

### Setup

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Copy environment config
copy .env.example .env

# Start the server
python -m argus.main
```

The API will be running at `http://localhost:8000`.

- Swagger docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Start a new scan |
| `GET` | `/api/scan/{scan_id}` | Get scan status |
| `GET` | `/api/scan/{scan_id}/report` | Get JSON report |
| `GET` | `/api/scan/{scan_id}/report/html` | Get HTML report |
| `GET` | `/api/history` | List past scans |
| `DELETE` | `/api/scan/{scan_id}` | Delete a scan |
| `WS` | `/api/ws/{scan_id}` | Real-time progress |
| `GET` | `/api/health` | Health check |

### Example: Start a Scan

```bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/OWASP/NodeGoat"}'
```

### Environment Variables

See `.env.example` for all available configuration options.

Key settings:
- `NVIDIA_NIM_API_KEY` — For AI-powered explanations
- `LLM_ENABLED` — Enable/disable LLM features
- `MAX_REPO_SIZE_MB` — Max repo size (default: 200 MB)
