# ◈ Argus — Frontend

Next.js React frontend for the Argus GitHub Repository Vulnerability Scanner.

## Features

- **Dark-first Design**: Black and limegreen (`#32CD32`) minimalist UI.
- **Real-time Scan Progress**: WebSocket integration to stream scan status.
- **Self-contained Reports**: Displays the backend-generated HTML report in an iframe.
- **Scan History**: View and manage past scans.

## Quick Start

### Prerequisites
- **Node.js 18+**
- The [Argus Backend](../argus-backend) must be running on `http://localhost:8000`.

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The UI will be available at `http://localhost:3000`.

### Environment Variables

You can configure the API URL if the backend is running elsewhere:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Architecture

- **`src/app/page.tsx`**: Landing page with hero animation and feature list.
- **`src/app/scan/[id]/page.tsx`**: Scan progress view that switches to the HTML report iframe upon completion.
- **`src/app/history/page.tsx`**: Lists all past scans fetched from the SQLite backend.
- **`src/lib/api.ts`**: API wrapper and WebSocket handler.
