/* ── Argus TypeScript Types ───────────────────────────────────────── */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'high' | 'medium' | 'low';
export type Category = 'sast' | 'secret' | 'dependency' | 'misconfig';
export type ScanStatus = 'pending' | 'cloning' | 'scanning' | 'processing' | 'complete' | 'failed';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface Finding {
  id: string;
  category: Category;
  title: string;
  severity: Severity;
  confidence: Confidence;
  file: string;
  line_start: number | null;
  line_end: number | null;
  snippet: string;
  description: string;
  cwe: string[];
  owasp: string[];
  rule_id: string;
  tool: string;
  remediation: string;
  references: string[];
  package: string | null;
  installed_version: string | null;
  fixed_version: string | null;
  advisory_ids: string[];
  likely_test_data: boolean;
  in_noise_path: boolean;
}

export interface ScannerError {
  scanner: string;
  error: string;
  exit_code: number | null;
  timed_out: boolean;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface CategoryCounts {
  sast: number;
  secret: number;
  dependency: number;
  misconfig: number;
}

export interface ScanMeta {
  scan_id: string;
  repo_url: string;
  owner: string;
  repo_name: string;
  branch: string | null;
  commit_sha: string;
  scan_date: string;
  duration_seconds: number;
  languages: string[];
  manifests: string[];
  files_scanned: number;
  loc_estimate: number;
  tools_used: string[];
  tool_versions: Record<string, string>;
  scanner_errors: ScannerError[];
  skipped_paths: string[];
}

export interface ScanResult {
  meta: ScanMeta;
  status: ScanStatus;
  risk_score: number;
  grade: Grade;
  severity_counts: SeverityCounts;
  category_counts: CategoryCounts;
  findings: Finding[];
  noise_findings_count: number;
  error_message: string | null;
}

export interface ScanProgress {
  scan_id: string;
  status: ScanStatus;
  step: string;
  detail: string;
  progress_percent: number;
  timestamp: string;
}

export interface ScanHistoryItem {
  scan_id: string;
  repo_url: string;
  owner: string;
  repo_name: string;
  branch: string | null;
  status: string;
  risk_score: number;
  grade: string;
  findings_count: number;
  severity_critical: number;
  severity_high: number;
  severity_medium: number;
  severity_low: number;
  severity_info: number;
  languages: string;
  duration_seconds: number;
  error_message: string | null;
  created_at: string | null;
  completed_at: string | null;
}

export interface HealthStatus {
  status: string;
  version: string;
  scanners: Record<string, boolean>;
}
