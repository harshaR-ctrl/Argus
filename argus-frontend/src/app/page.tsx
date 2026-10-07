"use client";

import { useEffect, useRef } from "react";
import ScanInput from "@/components/ScanInput";
import TerminalPreview from "@/components/TerminalPreview";
import styles from "./page.module.css";

/* SVG icons for feature cards */
const icons = {
  sast: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
      <line x1="14" y1="4" x2="10" y2="20" opacity="0.5"/>
    </svg>
  ),
  secrets: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      <circle cx="12" cy="16" r="1"/>
    </svg>
  ),
  sca: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
};

const stepIcons = {
  paste: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  clone: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  scan: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  report: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
};

function useScrollReveal() {
  const ref = useRef<(Element | null)[]>([]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    ref.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function Home() {
  const revealRefs = useScrollReveal();
  let refIndex = 0;
  const addRef = (el: HTMLElement | null) => {
    if (el) {
      const idx = parseInt(el.dataset.revealIdx || "0");
      revealRefs.current[idx] = el;
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className={`section ${styles.hero}`}>
        {/* Animated grid background */}
        <div className={styles.heroBg}>
          <div className={styles.heroGrid} />
          <div className={styles.heroGlow} />
        </div>

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              Open-source vulnerability scanner
            </div>

            <h1 className={styles.heroTitle}>
              Scan any GitHub repo
              <br />
              for <span className={styles.heroAccent}>vulnerabilities</span>.
            </h1>

            <p className={styles.heroSub}>
              Code flaws, leaked secrets, and vulnerable dependencies &mdash; 
              in one readable report. Free and open-source.
            </p>

            <ScepticScanInput />
            
            <div className={styles.heroTerminal}>
              <TerminalPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Strip */}
      <section className={styles.integrations}>
        <div className="container">
          <p className={styles.integrationsLabel}>
            Powered by open-source tools
          </p>
          <div className={styles.integrationsGrid}>
            {["Semgrep", "Gitleaks", "OSV-Scanner", "Docker", "Python"].map((name) => (
              <div key={name} className={styles.integrationItem}>
                <span className={styles.integrationName}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "var(--space-7)" }}>
            <p className="section-label">Features</p>
            <h2 className="section-title">Three scanners, one report</h2>
            <p className="section-subtitle" style={{ margin: "0 auto" }}>
              Argus combines industry-standard security tools into a unified, 
              easy-to-understand vulnerability report.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {[
              {
                icon: icons.sast,
                label: "SAST",
                title: "Code Vulnerabilities",
                desc: "Static analysis using Semgrep to catch injection, XSS, insecure cryptography, and OWASP Top 10 flaws.",
                snippet: { comment: "# CWE-89 SQL Injection", code: 'execute("SELECT * FROM users WHERE id=" + id)' },
                detects: ["SQL Injection", "XSS", "SSRF", "Hardcoded Crypto"],
              },
              {
                icon: icons.secrets,
                label: "Secrets",
                title: "Leaked Secrets",
                desc: "Deep scan with Gitleaks to find API keys, passwords, and tokens committed to your codebase.",
                snippet: { comment: "# Leaked AWS credential", code: 'AWS_KEY = "AKIA\u2022\u2022\u2022\u2022MPLE"' },
                detects: ["API Keys", "Passwords", "Private Keys", "Tokens"],
              },
              {
                icon: icons.sca,
                label: "SCA",
                title: "Vulnerable Dependencies",
                desc: "Software Composition Analysis via OSV-Scanner covering npm, PyPI, Maven, Go, and Rust ecosystems.",
                snippet: { comment: "// GHSA-xxxx advisory", code: '"express": "4.16.0" \u2192 4.21.0' },
                detects: ["npm", "PyPI", "Maven", "Go Modules"],
              },
            ].map((feat, i) => (
              <div
                key={i}
                className={`card ${styles.featureCard} reveal`}
                data-reveal-idx={refIndex}
                ref={addRef}
                {...(refIndex++, {})}
              >
                <div className={styles.featureIconWrap}>
                  {feat.icon}
                </div>
                <div className={styles.featureLabel}>{feat.label}</div>
                <h3 className={styles.featureTitle}>{feat.title}</h3>
                <p className={styles.featureDesc}>{feat.desc}</p>
                <div className={styles.featureSnippet}>
                  <div className="tok-comment">{feat.snippet.comment}</div>
                  <div>{feat.snippet.code}</div>
                </div>
                <div className={styles.featureTags}>
                  {feat.detects.map((tag) => (
                    <span key={tag} className={styles.featureTag}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className="section"
        style={{ background: "var(--surface)" }}
      >
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "var(--space-7)" }}>
            <p className="section-label">How It Works</p>
            <h2 className="section-title">Four steps to a secure repo</h2>
          </div>

          <div className={styles.stepsGrid}>
            {[
              { step: "01", title: "Paste", desc: "Enter a public GitHub repository URL into the scanner.", icon: stepIcons.paste },
              { step: "02", title: "Clone", desc: "Safe, shallow clone into an isolated, sandboxed environment.", icon: stepIcons.clone },
              { step: "03", title: "Scan", desc: "Parallel execution of Semgrep, Gitleaks, and OSV-Scanner.", icon: stepIcons.scan },
              { step: "04", title: "Report", desc: "Get a prioritized, deduplicated HTML/JSON vulnerability report.", icon: stepIcons.report },
            ].map((item, i) => (
              <div
                key={i}
                className={`${styles.stepCard} reveal`}
                data-reveal-idx={refIndex}
                ref={addRef}
                {...(refIndex++, {})}
              >
                <div className={styles.stepNumber}>{item.step}</div>
                <div className={styles.stepIcon}>{item.icon}</div>
                <h3 className={styles.stepTitle}>{item.title}</h3>
                <p className={styles.stepDesc}>{item.desc}</p>
                {i < 3 && <div className={styles.stepConnector} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="compare" className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "var(--space-7)" }}>
            <p className="section-label">Compare</p>
            <h2 className="section-title">Why Argus?</h2>
            <p className="section-subtitle" style={{ margin: "0 auto" }}>
              See how Argus compares to manual reviews and single-tool approaches.
            </p>
          </div>
          
          <div
            className={`${styles.tableWrap} reveal`}
            data-reveal-idx={refIndex}
            ref={addRef}
            {...(refIndex++, {})}
          >
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Manual Review</th>
                  <th>Single Tool</th>
                  <th className={styles.argusCol}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: -2 }}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Argus
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Code vulnerabilities (SAST)", "\u25D0 Time-consuming", "\u2713 Yes", "\u2713 Yes"],
                  ["Leaked secrets", "\u25D0 Easy to miss", "\u2717 Separate tool", "\u2713 Yes"],
                  ["Vulnerable dependencies", "\u2717 No", "\u2717 Separate tool", "\u2713 Yes"],
                  ["One unified report", "\u2717 No", "\u2717 No", "\u2713 Yes"],
                  ["Severity + risk score", "\u2717 No", "\u25D0 Per tool", "\u2713 Yes"],
                  ["Fix guidance per finding", "\u25D0 Manual", "\u25D0 Varies", "\u2713 Yes"],
                  ["Setup effort", "None", "Per-tool install", "One URL"],
                  ["Cost", "Your time", "Free", "Free"],
                ].map((row, i) => (
                  <tr key={i}>
                    <td className={styles.featureCol}>{row[0]}</td>
                    <td className={styles.statusCol}>
                      <span className={`${styles.statusCell} ${row[1].startsWith("\u2713") ? styles.yes : row[1].startsWith("\u2717") ? styles.no : styles.partial}`}>
                        {row[1]}
                      </span>
                    </td>
                    <td className={styles.statusCol}>
                      <span className={`${styles.statusCell} ${row[2].startsWith("\u2713") ? styles.yes : row[2].startsWith("\u2717") ? styles.no : styles.partial}`}>
                        {row[2]}
                      </span>
                    </td>
                    <td className={`${styles.statusCol} ${styles.argusCol}`}>
                      <span className={`${styles.statusCell} ${styles.argusCell}`}>
                        {row[3]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`section ${styles.ctaSection}`}>
        <div className="container" style={{ textAlign: "center" }}>
          <div className={styles.ctaGlow} />
          <p className="section-label">Get Started</p>
          <h2 className="section-title" style={{ maxWidth: 600, margin: "0 auto var(--space-3)" }}>
            Ready to scan your first repo?
          </h2>
          <p className="section-subtitle" style={{ margin: "0 auto var(--space-6)" }}>
            Paste a GitHub URL above, or try one of these example repositories.
          </p>
          <div className={styles.ctaExamples}>
            {[
              "OWASP/NodeGoat",
              "OWASP/WebGoat",
              "juice-shop/juice-shop",
            ].map((repo) => (
              <a
                key={repo}
                href={`https://github.com/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaExample}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.5, flexShrink: 0 }}>
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                {repo}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                  <line x1="7" y1="17" x2="17" y2="7"/>
                  <polyline points="7 7 17 7 17 17"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
