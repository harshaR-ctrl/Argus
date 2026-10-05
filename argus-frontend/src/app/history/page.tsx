"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHistory, deleteScan } from "@/lib/api";
import type { ScanHistoryItem } from "@/lib/types";

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getHistory();
      setScans(data);
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this scan record?")) return;
    
    try {
      await deleteScan(id);
      setScans(scans.filter(s => s.scan_id !== id));
    } catch (err) {
      alert("Failed to delete scan");
    }
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "Unknown";
    return new Date(isoStr + "Z").toLocaleString(); // Append Z to ensure UTC parsing
  };

  return (
    <div className="container" style={{ paddingTop: "var(--space-6)", minHeight: "calc(100vh - 200px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600 }}>Scan History</h1>
        <button className="btn-ghost" onClick={fetchHistory} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(255,77,77,0.1)", color: "var(--sev-critical)", padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: "var(--space-4)" }}>
          {error}
        </div>
      )}

      {loading && scans.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Loading history...</p>
      ) : scans.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>No scans found.</p>
          <Link href="/" className="btn btn-primary">Start a Scan</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {scans.map(scan => (
            <Link 
              key={scan.scan_id} 
              href={`/scan/${scan.scan_id}`}
              style={{ display: "block", textDecoration: "none" }}
            >
              <div className="card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                
                <div style={{ flex: "1 1 min-content" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "16px", color: "var(--text)" }}>
                      {scan.repo_name ? `${scan.owner}/${scan.repo_name}` : "Unknown Repo"}
                    </strong>
                    {scan.status === "complete" && (
                       <span style={{ 
                         fontFamily: "var(--font-mono)", 
                         fontSize: "12px",
                         padding: "2px 6px",
                         borderRadius: "4px",
                         border: `1px solid var(--grade-${scan.grade.toLowerCase()})`,
                         color: `var(--grade-${scan.grade.toLowerCase()})`
                       }}>
                         Grade {scan.grade}
                       </span>
                    )}
                    {scan.status === "failed" && <span className="sev-badge sev-critical">Failed</span>}
                    {scan.status !== "complete" && scan.status !== "failed" && <span className="sev-badge sev-info">In Progress</span>}
                  </div>
                  
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <span>📅 {formatDate(scan.created_at)}</span>
                    {scan.status === "complete" && (
                      <>
                        <span>⚠️ {scan.findings_count} findings</span>
                        <span>⏱️ {scan.duration_seconds.toFixed(1)}s</span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {scan.status === "complete" && (
                    <div style={{ display: "flex", gap: "4px" }}>
                      {scan.severity_critical > 0 && <span className="sev-badge sev-critical">{scan.severity_critical}</span>}
                      {scan.severity_high > 0 && <span className="sev-badge sev-high">{scan.severity_high}</span>}
                    </div>
                  )}
                  
                  <button 
                    className="btn-ghost" 
                    style={{ padding: "4px 8px", color: "var(--text-muted)" }}
                    onClick={(e) => handleDelete(scan.scan_id, e)}
                    aria-label="Delete scan"
                  >
                    Delete
                  </button>
                  <span style={{ color: "var(--accent)", fontSize: "18px" }}>→</span>
                </div>

              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
