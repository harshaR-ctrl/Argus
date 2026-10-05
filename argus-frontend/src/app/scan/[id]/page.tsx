"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getScanStatus, connectScanWS, getHtmlReportUrl } from "@/lib/api";
import type { ScanProgress, ScanStatus } from "@/lib/types";

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

  // Render report iframe if complete
  if (status === "complete") {
    return (
      <div style={{ height: "calc(100vh - 56px)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "8px 24px", background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
             <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Scan Report</span>
             <strong style={{ fontSize: "14px" }}>{repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : scanId}</strong>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
             <a href={`/api/scan/${scanId}/report`} download={`argus_${scanId}.json`} className="btn-ghost" style={{ fontSize: "13px" }}>
               Download JSON
             </a>
             <a href={getHtmlReportUrl(scanId)} download={`argus_${scanId}.html`} className="btn-ghost" style={{ fontSize: "13px" }}>
               Download HTML
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
    <div className="container" style={{ paddingTop: "var(--space-8)", maxWidth: "800px", minHeight: "calc(100vh - 200px)" }}>
      
      <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "var(--space-2)" }}>
          {repoInfo ? `Scanning ${repoInfo.owner}/${repoInfo.repo}` : "Scanning Repository"}
        </h1>
        <p style={{ color: "var(--text-muted)" }}>This usually takes 1-3 minutes depending on repo size.</p>
      </div>

      <div className="card" style={{ padding: "var(--space-6)" }}>
        {status === "failed" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "var(--space-4)" }}>❌</div>
            <h2 style={{ color: "var(--sev-critical)", marginBottom: "var(--space-2)" }}>Scan Failed</h2>
            <p style={{ color: "var(--text-muted)" }}>{error || detail || "An unexpected error occurred."}</p>
            <button className="btn btn-secondary" style={{ marginTop: "var(--space-5)" }} onClick={() => window.history.back()}>
              Go Back
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-2)", fontFamily: "var(--font-mono)", fontSize: "14px" }}>
              <span style={{ color: "var(--accent)" }}>{step}</span>
              <span>{progress}%</span>
            </div>
            
            {/* Progress Bar Track */}
            <div style={{ width: "100%", height: "8px", background: "var(--surface-2)", borderRadius: "4px", overflow: "hidden", marginBottom: "var(--space-4)" }}>
              {/* Progress Bar Fill */}
              <div 
                style={{ 
                  height: "100%", 
                  background: "var(--accent)", 
                  width: `${progress}%`,
                  transition: "width 0.5s ease"
                }} 
              />
            </div>
            
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-muted)", background: "var(--bg)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
              <span className="tok-prompt">$</span> {detail}
              <span className="animate-pulse">_</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
