"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startScan } from "@/lib/api";
import styles from "./ScanInput.module.css";

export default function ScanInput() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!url.trim()) return;

    // Basic frontend validation
    if (!url.startsWith("https://github.com/")) {
      setError("Please enter a valid GitHub repository URL (https://github.com/owner/repo)");
      return;
    }

    setLoading(true);
    try {
      // Start the scan
      const res = await startScan(url.trim());
      // Redirect to the scan progress page
      router.push(`/scan/${res.scan_id}`);
    } catch (err: any) {
      setError(err.message || "Failed to start scan");
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
                Scanning...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Scan repo
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
