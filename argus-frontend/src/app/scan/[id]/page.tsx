"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getScanStatus, connectScanWS, getHtmlReportUrl } from "@/lib/api";
import type { ScanProgress, ScanStatus } from "@/lib/types";

const SCAN_STEPS = [
  { key: "cloning", label: "Cloning", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ) },
  { key: "scanning", label: "Scanning", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ) },
  { key: "processing", label: "Processing", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ) },
  { key: "complete", label: "Complete", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ) },
];

export default function ScanPage() {
  const params = useParams();
  const scanId = params.id as string;

  const [status, setStatus] = useState<ScanStatus>("pending");
  const [progress, setProgress] = useState<number>(0);
  const [step, setStep] = useState<string>("Initializing...");
  const [detail, setDetail] = useState<string>("Setting up scan sandbox");
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let mounted = true;

    const init = async () => {
      try {
        // Initial fetch to get status and repo info
        const data = await getScanStatus(scanId);
        if (!mounted) return;
        
        setStatus(data.status as ScanStatus);
        if (data.progress_percent) setProgress(data.progress_percent);
        if (data.step) setStep(data.step);
        if (data.detail) setDetail(data.detail);
        if (data.owner && data.repo_name) {
          setRepoInfo({ owner: data.owner, repo: data.repo_name });
        }

        // If completed or failed, we don't need WS
        if (data.status === "complete" || data.status === "failed") {
          return;
        }

        // Connect WebSocket for live updates
        ws = connectScanWS(
          scanId,
          (msg: ScanProgress) => {
            if (!mounted) return;
            setStatus(msg.status);
            setProgress(msg.progress_percent);
            setStep(msg.step);
            setDetail(msg.detail);
          },
          () => console.log("WS closed"),
          (err) => console.warn("WS error:", err)
        );
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "Failed to load scan status");
        setStatus("failed");
      }
    };

    init();

    return () => {
      mounted = false;
      if (ws) ws.close();
    };
  }, [scanId]);

  const getActiveStepIndex = () => {
    const idx = SCAN_STEPS.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  // Render report iframe if complete
  if (status === "complete") {
    return (
      <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
        <div style={{ 
          padding: "12px 24px", 
          background: "var(--surface)", 
          borderBottom: "1px solid var(--border)", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/" style={{ 
              color: "var(--text-muted)", 
              display: "flex", 
              alignItems: "center", 
              gap: "6px",
              fontSize: "14px",
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              transition: "all 0.2s ease",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </Link>
            <div style={{ width: 1, height: 20, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Scan Report</span>
              <strong style={{ fontSize: "14px" }}>{repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : scanId}</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <a 
              href={`/api/scan/${scanId}/report`} 
              download={`argus_${scanId}.json`} 
              className="btn btn-secondary" 
              style={{ fontSize: "13px", padding: "6px 14px" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              JSON
            </a>
            <a 
              href={getHtmlReportUrl(scanId)} 
              download={`argus_${scanId}.html`} 
              className="btn btn-primary" 
              style={{ fontSize: "13px", padding: "6px 14px" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              HTML Report
            </a>
          </div>
        </div>
        <iframe
          src={getHtmlReportUrl(scanId)}
          style={{ width: "100%", flex: 1, border: "none", background: "#fff" }}
          title="Argus Scan Report"
        />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "var(--space-9)", maxWidth: "700px", minHeight: "calc(100vh - 200px)" }}>
      
      <div style={{ textAlign: "center", marginBottom: "var(--space-7)" }}>
        <div style={{ 
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 16px",
          borderRadius: "var(--radius-pill)",
          background: "var(--glow-subtle)",
          border: "1px solid rgba(204,255,0,0.1)",
          marginBottom: "var(--space-5)",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--accent)",
        }}>
          <span className="status-dot running" />
          Scan in progress
        </div>

        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "var(--space-2)", letterSpacing: "-0.02em" }}>
          {repoInfo ? (
            <>Scanning <span style={{ color: "var(--accent)" }}>{repoInfo.owner}/{repoInfo.repo}</span></>
          ) : "Scanning Repository"}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>
          This usually takes 1\u20133 minutes depending on repo size.
        </p>
      </div>

      {/* Step indicators */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        gap: "4px", 
        marginBottom: "var(--space-6)",
        padding: "0 var(--space-4)"
      }}>
        {SCAN_STEPS.map((s, i) => {
          const active = getActiveStepIndex();
          const isComplete = i < active;
          const isCurrent = i === active;
          return (
            <div key={s.key} style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "4px",
              flex: 1,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
                background: isComplete ? "var(--accent)" : isCurrent ? "rgba(204,255,0,0.12)" : "var(--surface-2)",
                color: isComplete ? "var(--accent-fg)" : isCurrent ? "var(--accent)" : "var(--text-faint)",
                border: isCurrent ? "1px solid rgba(204,255,0,0.3)" : "1px solid var(--border)",
                transition: "all 0.3s ease",
                ...(isCurrent ? { animation: "glowPulse 2s ease-in-out infinite" } : {}),
              }}>
                {isComplete ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : s.icon}
              </div>
              {i < SCAN_STEPS.length - 1 && (
                <div style={{
                  flex: 1,
                  height: "2px",
                  background: isComplete ? "var(--accent)" : "var(--border)",
                  transition: "background 0.5s ease",
                  borderRadius: 1,
                }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: "var(--space-6)", borderRadius: "var(--radius-lg)" }}>
        {status === "failed" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ 
              width: "64px", 
              height: "64px", 
              borderRadius: "50%", 
              background: "rgba(255,77,77,0.1)", 
              border: "2px solid var(--sev-critical)",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto var(--space-4)",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--sev-critical)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h2 style={{ color: "var(--sev-critical)", marginBottom: "var(--space-2)", fontSize: "20px" }}>Scan Failed</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "var(--space-5)" }}>
              {error || detail || "An unexpected error occurred during the scan."}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button className="btn btn-secondary" onClick={() => window.history.back()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Go Back
              </button>
              <Link href="/" className="btn btn-primary">Try Again</Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Progress label */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "var(--space-3)", 
            }}>
              <span style={{ 
                fontFamily: "var(--font-mono)", 
                fontSize: "13px", 
                fontWeight: 600,
                color: "var(--accent)" 
              }}>
                {step}
              </span>
              <span style={{ 
                fontFamily: "var(--font-mono)", 
                fontSize: "24px", 
                fontWeight: 700,
                color: "var(--text)",
                letterSpacing: "-0.02em",
              }}>
                {progress}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div style={{ 
              width: "100%", 
              height: "6px", 
              background: "var(--surface-2)", 
              borderRadius: "3px", 
              overflow: "hidden", 
              marginBottom: "var(--space-5)",
              position: "relative",
            }}>
              <div 
                style={{ 
                  height: "100%", 
                  background: "linear-gradient(90deg, var(--accent-dim), var(--accent))",
                  width: `${progress}%`,
                  transition: "width 0.5s ease",
                  borderRadius: "3px",
                  position: "relative",
                }} 
              />
            </div>
            
            {/* Terminal-style detail */}
            <div style={{ 
              fontFamily: "var(--font-mono)", 
              fontSize: "13px", 
              color: "var(--text-muted)", 
              background: "var(--bg)", 
              padding: "14px 16px", 
              borderRadius: "var(--radius)", 
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>$</span>
              <span style={{ flex: 1 }}>{detail}</span>
              <span className="animate-pulse" style={{ color: "var(--accent)" }}>&#x258C;</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
