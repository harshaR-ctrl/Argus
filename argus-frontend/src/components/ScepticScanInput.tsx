"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { startScan, getHealth, getScanStatus } from "@/lib/api";
import styles from "./ScanInput.module.css";

interface ScanStatusInfo {
  status: string;
  step: string;
  detail: string;
  progress_percent: number;
  scanned_successfully?: boolean;
}

export default function ScepticScanInput() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerHealth, setScannerHealth] = useState<Record<string, boolean> | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatusInfo | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackMode, setFallbackMode] = useState(false);
  const router = useRouter();

  // Question scanner decisions systematically
  const questionScannerDecision = useCallback(async (url: string) => {
    console.log("🔍 Sceptic Agent: Questioning scanner decision for", url);

    // 1. Force rechecking of scanner results - first check health
    try {
      const health = await getHealth();
      setScannerHealth(health.scanners);

      const activeScanners = Object.keys(health.scanners).filter(k => health.scanners[k]);
      console.log("📊 Sceptic Agent: Available scanners:", activeScanners);

      if (activeScanners.length === 0) {
        console.warn("⚠️ Sceptic Agent: No scanners available, switching to fallback mode");
        setFallbackMode(true);
        return "fallback";
      }

      // 2. Question the necessity of the scan - basic frontend validation only
      if (!url.startsWith("https://github.com/")) {
        console.warn("⚠️ Sceptic Agent: Questioning scan necessity - invalid GitHub URL");
        setError("Please enter a valid GitHub repository URL (https://github.com/owner/repo)");
        return "invalid_url";
      }

      // 3. Force rechecking before proceeding - verify scanner readiness
      for (const scannerName of activeScanners) {
        console.log(`🔬 Sceptic Agent: Testing scanner "${scannerName}" readiness...`);

        // Actually start the scan and immediately recheck
        const scanStart = await startScan(url.trim());
        console.log(`📋 Sceptic Agent: Scanner returned:`, scanStart);

        // Force immediate recheck of scan status
        setTimeout(async () => {
          try {
            const status = await getScanStatus(scanStart.scan_id);
            setScanStatus(status);

            console.log(`🔍 Sceptic Agent: Rechecking scan ${scanStart.scan_id} status:`, status);

            if (status.status === 'failed' || status.status === 'error') {
              console.error(`❌ Sceptic Agent: Scanner failed with status ${status.status}: ${status.detail}`);
              setError(`Scanner failed: ${status.detail || 'Unknown error'}`);
              setLoading(false);
              return;
            }

            if (status.status === 'complete') {
              console.log("✅ Sceptic Agent: Scanner completed successfully after recheck");
              setScanStatus({...status, scanned_successfully: true});
            } else {
              console.log(`⏳ Sceptic Agent: Scanner ${status.status}, progress ${status.progress_percent}%`);
            }
          } catch (statusError) {
            console.error(`💥 Sceptic Agent: Recheck failed for scan ${scanStart.scan_id}:`, statusError);
            setError(`Scanner verification failed: ${(statusError as Error).message}`);
            setLoading(false);
          }
        }, 1000); // Immediate recheck

        return "proceeding_with_recheck";
      }

    } catch (err) {
      console.error("💥 Sceptic Agent: Scanner decision questioning failed:", err);
      setError(`Scanner verification failed: ${(err as Error).message}`);
      setLoading(false);
      return "verification_failed";
    }

    return "proceeding";
  }, [retryCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFallbackMode(false);

    if (!url.trim()) return;

    console.log("🔍 Sceptic Agent: Evaluating scan request...")

    // Reset retry counter for fresh evaluation
    setRetryCount(prev => prev + 1);

    setLoading(true);

    try {
      // Question scanner decisions with systematic rechecking
      const decision = await questionScannerDecision(url.trim());

      switch (decision) {
        case "fallback":
          console.warn("⚠️ Sceptic Agent: Operating in fallback mode - no scanners available");
          setError("No scanners available, please try again later or use alternative methods.");
          setLoading(false);
          return;

        case "invalid_url":
          console.warn("⚠️ Sceptic Agent: Questioned URL validity");
          setLoading(false);
          return;

        case "verification_failed":
          console.error("❌ Sceptic Agent: Scanner verification failed");
          setLoading(false);
          return;

        case "proceeding_with_recheck":
          // Wait for recheck to complete before UI change
          console.log("⏳ Sceptic Agent: Waiting for scanner recheck completion...")
          break;

        default:
          console.warn("❓ Sceptic Agent: Unknown decision, proceeding with caution");
      }

      // Check if we got a successful scan status
      if (scanStatus?.scanned_successfully) {
        console.log("✅ Sceptic Agent: Scan verified, redirecting to progress page");
        router.push(`/scan/${scanStatus.scan_id}`);
      } else if (scanStatus) {
        console.log("⏳ Sceptic Agent: Scan in progress, waiting...");
        // Wait a bit more for completion
        setTimeout(() => {
          if (scanStatus.status === 'complete') {
            console.log("✅ Sceptic Agent: Scan completed during wait, redirecting");
            router.push(`/scan/${scanStatus.scan_id}`);
          }
        }, 3000);
      }

    } catch (err) {
      console.error("💥 Sceptic Agent: Unexpected error during scan:", err);
      setError(err instanceof Error ? err.message : "Failed to start scan");
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`argus scan ${url || "<url>"}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.wrapper}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <input
            type="url"
            className={`input ${styles.scanInput} ${error ? "error" : ""}`}
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            disabled={loading}
            required
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="submit"
            className={`btn btn-primary ${styles.scanBtn}`}
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" opacity=".5"/>
                  <path d="M12 2v4" strokeLinecap="round"/>
                </svg>
                Verifying & Scanning...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Question Scanner
              </>
            )}
          </button>
        </div>
        {error && (
          <div className={styles.error}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}
        {scannerHealth && (
          <div className={styles.scannerHealth}>
            <small>Scanners: {Object.keys(scannerHealth).filter(k => scannerHealth[k]).join(', ') || 'None available'}</small>
          </div>
        )}
        {scanStatus && (
          <div className={styles.scanStatus}>
            <small>Status: {scanStatus.status} ({scanStatus.progress_percent}%)</small>
            {scanStatus.detail && <small>Detail: {scanStatus.detail}</small>}
          </div>
        )}
      </form>

      <div className={styles.cliHint}>
        <div className={styles.cliCommand}>
          <span className="tok-prompt">$</span> argus scan {url || "<url>"}
        </div>
        <button
          className={styles.copyBtn}
          onClick={handleCopy}
          title="Copy CLI command"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

const setCopied = () => {}; // Mock for now