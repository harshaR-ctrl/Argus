import ScanInput from "@/components/ScanInput";
import TerminalPreview from "@/components/TerminalPreview";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="section" style={{ paddingTop: "var(--space-9)" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h1 
            style={{ 
              fontSize: "clamp(36px, 5vw, 56px)", 
              fontWeight: 700, 
              letterSpacing: "-0.02em",
              maxWidth: "var(--max-width-hero)",
              margin: "0 auto var(--space-4)"
            }}
          >
            Scan any GitHub repo for vulnerabilities.
          </h1>
          <p 
            style={{ 
              fontSize: "18px", 
              color: "var(--text-muted)", 
              maxWidth: "600px", 
              margin: "0 auto var(--space-6)" 
            }}
          >
            Code flaws, leaked secrets, and vulnerable dependencies — 
            in one readable report. Free and open-source.
          </p>

          <ScanInput />
          
          <div style={{ marginTop: "var(--space-7)" }}>
            <TerminalPreview />
          </div>
        </div>
      </section>

      {/* Integrations Strip */}
      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "var(--space-4) 0", background: "var(--surface)" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-4)" }}>
            Powered by open-source tools
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-6)", flexWrap: "wrap", opacity: 0.6 }}>
            {/* Minimal text representations since we don't have SVGs yet */}
            <span style={{ fontWeight: 600, fontSize: "18px" }}>Semgrep</span>
            <span style={{ fontWeight: 600, fontSize: "18px" }}>Gitleaks</span>
            <span style={{ fontWeight: 600, fontSize: "18px" }}>OSV-Scanner</span>
            <span style={{ fontWeight: 600, fontSize: "18px" }}>Docker</span>
            <span style={{ fontWeight: 600, fontSize: "18px" }}>Python</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-5)" }}>
            
            <div className="card">
              <div style={{ fontSize: "24px", color: "var(--accent)", marginBottom: "var(--space-3)" }}>🔍</div>
              <h3 style={{ fontSize: "18px", marginBottom: "var(--space-2)" }}>Code Vulnerabilities</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "var(--space-3)" }}>
                Static analysis (SAST) using Semgrep to catch injection, XSS, insecure cryptography, and OWASP Top 10 flaws.
              </p>
              <div className="code-block" style={{ fontSize: "12px", padding: "8px" }}>
                <span className="tok-comment"># CWE-89 SQL Injection</span><br/>
                <span className="tok-function">execute</span>(<span className="tok-string">"SELECT * FROM users WHERE id="</span> + <span className="tok-variable">id</span>)
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: "24px", color: "var(--accent)", marginBottom: "var(--space-3)" }}>🔑</div>
              <h3 style={{ fontSize: "18px", marginBottom: "var(--space-2)" }}>Leaked Secrets</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "var(--space-3)" }}>
                Deep scan with Gitleaks to find API keys, passwords, and tokens. Secrets are automatically masked in the report.
              </p>
              <div className="code-block" style={{ fontSize: "12px", padding: "8px" }}>
                <span className="tok-keyword">const</span> <span className="tok-variable">AWS_KEY</span> = <span className="tok-string">"AKIA••••MPLE"</span>;
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: "24px", color: "var(--accent)", marginBottom: "var(--space-3)" }}>📦</div>
              <h3 style={{ fontSize: "18px", marginBottom: "var(--space-2)" }}>Vulnerable Dependencies</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "var(--space-3)" }}>
                Software Composition Analysis (SCA) via OSV-Scanner covering npm, PyPI, Maven, Go, and Rust ecosystems.
              </p>
              <div className="code-block" style={{ fontSize: "12px", padding: "8px" }}>
                <span className="tok-string">"express"</span>: <span className="tok-string">"4.16.0"</span> <span className="tok-comment">// GHSA-x...</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="compare" className="section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <h2 style={{ fontSize: "28px", textAlign: "center", marginBottom: "var(--space-6)" }}>Why Argus?</h2>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "600px" }}>
              <thead>
                <tr>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>Feature</th>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>Manual Review</th>
                  <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>Single Tool</th>
                  <th style={{ padding: "16px", borderBottom: "2px solid var(--accent)", background: "rgba(50,205,50,0.05)", textAlign: "center", color: "var(--accent)" }}>Argus</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Code vulnerabilities (SAST)", "◐ Time-consuming", "✓", "✓"],
                  ["Leaked secrets", "◐ Easy to miss", "✗ Separate tool", "✓"],
                  ["Vulnerable dependencies", "✗", "✗ Separate tool", "✓"],
                  ["One unified report", "✗", "✗", "✓"],
                  ["Severity + risk score", "✗", "◐ Per tool", "✓"],
                  ["Setup effort", "None", "Per-tool install", "One URL"],
                  ["Cost", "Your time", "Free", "Free"]
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px", fontWeight: 500 }}>{row[0]}</td>
                    <td style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)" }}>{row[1]}</td>
                    <td style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)" }}>{row[2]}</td>
                    <td style={{ padding: "16px", textAlign: "center", background: "rgba(50,205,50,0.05)", fontWeight: 600 }}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="container">
          <h2 style={{ fontSize: "28px", textAlign: "center", marginBottom: "var(--space-6)" }}>How it works</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-5)", textAlign: "center" }}>
            {[
              { step: "1", title: "Paste", desc: "Submit a public GitHub repository URL." },
              { step: "2", title: "Clone", desc: "Safe, shallow clone into an isolated sandbox." },
              { step: "3", title: "Scan", desc: "Parallel execution of industry-standard security tools." },
              { step: "4", title: "Report", desc: "Get a prioritized, deduplicated HTML report." }
            ].map((item, i) => (
              <div key={i}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 600, margin: "0 auto var(--space-3)" }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: "18px", marginBottom: "var(--space-2)" }}>{item.title}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
