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
    <div className="container" style={{ paddingTop: "var(--space-8)", minHeight: "calc(100vh - 200px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "var(--space-2)" }}>Scan History</h1>
          <p style={{ color: "var(--text-muted)" }}>Past security reports for repositories you've scanned.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchHistory} disabled={loading}>
          {loading ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" opacity=".5"/>
              <path d="M12 2v4" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ 
          background: "rgba(255,77,77,0.1)", 
          border: "1px solid rgba(255,77,77,0.3)",
          color: "var(--sev-critical)", 
          padding: "12px 16px", 
          borderRadius: "var(--radius)", 
          marginBottom: "var(--space-5)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      {loading && scans.length === 0 ? (
        <div className="skeleton" style={{ height: "120px", borderRadius: "var(--radius-lg)" }} />
      ) : scans.length === 0 ? (
        <div className="card" style={{ 
          textAlign: "center", 
          padding: "var(--space-8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-faint)",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>No scans found</h3>
            <p style={{ color: "var(--text-muted)" }}>You haven't run any security scans yet.</p>
          </div>
          <Link href="/" className="btn btn-primary" style={{ marginTop: "8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Start a Scan
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {scans.map((scan, i) => (
            <Link 
              key={scan.scan_id} 
              href={`/scan/${scan.scan_id}`}
              className="card animate-fade-in"
              style={{ 
                display: "block", 
                textDecoration: "none",
                padding: "20px 24px",
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px", flexWrap: "wrap" }}>
                
                <div style={{ flex: "1 1 min-content" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "18px", color: "var(--text)" }}>
                      {scan.repo_name ? `${scan.owner}/${scan.repo_name}` : "Unknown Repo"}
                    </strong>
                    {scan.status === "complete" && (
                       <span className={`grade-${scan.grade}`} style={{ 
                         fontFamily: "var(--font-mono)", 
                         fontSize: "12px",
                         padding: "2px 8px",
                         borderRadius: "var(--radius-sm)",
                         fontWeight: 600,
                       }}>
                         Grade {scan.grade}
                       </span>
                    )}
                    {scan.status === "failed" && <span className="sev-badge sev-critical">Failed</span>}
                    {scan.status !== "complete" && scan.status !== "failed" && (
                      <span className="sev-badge sev-info" style={{ color: "var(--accent)", borderColor: "rgba(204,255,0,0.3)" }}>
                        <span className="status-dot running" style={{ marginRight: 4 }} />
                        In Progress
                      </span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {formatDate(scan.created_at)}
                    </span>
                    {scan.status === "complete" && (
                      <>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {scan.duration_seconds.toFixed(1)}s
                        </span>
                        <span>{scan.findings_count} total findings</span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  {scan.status === "complete" && (
                    <div style={{ display: "flex", gap: "4px" }}>
                      {scan.severity_critical > 0 && <span className="sev-badge sev-critical">{scan.severity_critical} Critical</span>}
                      {scan.severity_high > 0 && <span className="sev-badge sev-high">{scan.severity_high} High</span>}
                      {scan.severity_critical === 0 && scan.severity_high === 0 && (
                         <span className="sev-badge" style={{ background: "rgba(204,255,0,0.1)", color: "var(--accent)", border: "1px solid rgba(204,255,0,0.3)" }}>Clean</span>
                      )}
                    </div>
                  )}
                  
                  <button 
                    className="btn-ghost" 
                    style={{ padding: "8px", color: "var(--text-faint)" }}
                    onClick={(e) => handleDelete(scan.scan_id, e)}
                    aria-label="Delete scan"
                    title="Delete"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                  <span style={{ color: "var(--border-hover)", transition: "color 0.2s ease" }} className="arrow-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </span>
                </div>

              </div>
            </Link>
          ))}
          
          <style dangerouslySetInnerHTML={{__html: `
            .card:hover .arrow-icon { color: var(--accent) !important; transform: translateX(2px); }
            .arrow-icon { transition: all 0.2s ease; }
          `}} />
        </div>
      )}
    </div>
  );
}
