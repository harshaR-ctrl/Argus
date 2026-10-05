"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startScan } from "@/lib/api";
import styles from "./ScanInput.module.css";

export default function ScanInput() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className={styles.wrapper}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <input
            type="url"
            className={`input ${error ? "error" : ""}`}
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            required
            autoComplete="off"
            spellCheck="false"
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !url.trim()}
          >
            {loading ? "Starting..." : "Scan repo →"}
          </button>
        </div>
        {error && <div className={styles.error}>{error}</div>}
      </form>
      
      <div className={styles.cliHint}>
        <div className={styles.cliCommand}>
          <span className="tok-prompt">$</span> argus scan {url || "<url>"}
        </div>
        <button 
          className="btn-ghost" 
          onClick={() => {
            navigator.clipboard.writeText(`argus scan ${url || "<url>"}`);
            alert("CLI command copied (Note: CLI version coming soon!)");
          }}
        >
          [copy]
        </button>
      </div>
    </div>
  );
}
