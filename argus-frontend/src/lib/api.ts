/* ── Argus API Client ────────────────────────────────────────────── */

import type { ScanResult, ScanProgress, ScanHistoryItem, HealthStatus } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

/** Start a new vulnerability scan. */
export async function startScan(
  url: string,
  branch?: string,
  enableLlm?: boolean,
): Promise<{ scan_id: string; status: string; message: string }> {
  return fetchJSON('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ url, branch, enable_llm: enableLlm }),
  });
}

/** Get scan status/progress. */
export async function getScanStatus(scanId: string) {
  return fetchJSON<{
    scan_id: string;
    status: string;
    step: string;
    detail: string;
    progress_percent: number;
    repo_url: string;
    owner: string;
    repo_name: string;
  }>(`/api/scan/${scanId}`);
}

/** Get the full scan report (JSON). */
export async function getScanReport(scanId: string): Promise<ScanResult> {
  return fetchJSON<ScanResult>(`/api/scan/${scanId}/report`);
}

/** Get the HTML report URL. */
export function getHtmlReportUrl(scanId: string): string {
  return `${API_BASE}/api/scan/${scanId}/report/html`;
}

/** List scan history. */
export async function getHistory(
  limit = 50,
  offset = 0,
): Promise<ScanHistoryItem[]> {
  return fetchJSON<ScanHistoryItem[]>(
    `/api/history?limit=${limit}&offset=${offset}`,
  );
}

/** Delete a scan from history. */
export async function deleteScan(scanId: string): Promise<void> {
  await fetchJSON(`/api/scan/${scanId}`, { method: 'DELETE' });
}

/** Health check. */
export async function getHealth(): Promise<HealthStatus> {
  return fetchJSON<HealthStatus>('/api/health');
}

/** Create a WebSocket connection for scan progress. */
export function connectScanWS(
  scanId: string,
  onMessage: (progress: ScanProgress) => void,
  onClose?: () => void,
  onError?: (err: Event) => void,
): WebSocket {
  const wsBase = API_BASE.replace(/^http/, 'ws');
  const ws = new WebSocket(`${wsBase}/api/ws/${scanId}`);

  ws.onmessage = (event) => {
    try {
      const data: ScanProgress = JSON.parse(event.data);
      onMessage(data);
    } catch {
      console.warn('Failed to parse WS message:', event.data);
    }
  };

  ws.onclose = () => onClose?.();
  ws.onerror = (err) => onError?.(err);

  // Keep alive
  const keepAlive = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('ping');
    } else {
      clearInterval(keepAlive);
    }
  }, 15000);

  return ws;
}
