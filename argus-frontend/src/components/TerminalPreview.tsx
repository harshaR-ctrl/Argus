"use client";

import { useEffect, useState } from "react";
import styles from "./TerminalPreview.module.css";

const LINES = [
  { text: "$ argus scan https://github.com/OWASP/NodeGoat", delay: 500, prompt: true },
  { text: "Cloned OWASP/NodeGoat @ 3f9c2a1 (2.1s)", delay: 1500, color: "var(--accent)" },
  { text: "Semgrep      28 findings", delay: 2000, color: "var(--accent)" },
  { text: "Gitleaks      3 secrets", delay: 2500, color: "var(--accent)" },
  { text: "OSV-Scanner  41 vulnerable dependencies", delay: 3000, color: "var(--accent)" },
  { text: "Risk score: 82/100  Grade: F", delay: 3500, color: "var(--sev-critical)" },
  { text: "Report -> ./reports/OWASP__NodeGoat/report.html", delay: 4000, color: "var(--text-muted)" },
];

export default function TerminalPreview() {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [typing, setTyping] = useState("");

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    
    const runAnimation = () => {
      setVisibleLines(0);
      setTyping("");
      
      // Line 1: Typing effect
      const text = LINES[0].text;
      let charIndex = 0;
      
      const typeInterval = setInterval(() => {
        if (charIndex <= text.length) {
          setTyping(text.substring(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typeInterval);
          setVisibleLines(1);
          
          // Schedule rest of lines
          for (let i = 1; i < LINES.length; i++) {
            timeouts.push(
              setTimeout(() => {
                setVisibleLines(i + 1);
              }, LINES[i].delay - LINES[0].delay)
            );
          }
          
          // Loop animation
          timeouts.push(
            setTimeout(runAnimation, 8000)
          );
        }
      }, 30);
      
      timeouts.push(typeInterval as any);
    };

    // Check prefers-reduced-motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisibleLines(LINES.length);
      setTyping(LINES[0].text);
    } else {
      runAnimation();
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className={styles.terminal}>
      <div className={styles.header}>
        <div className={styles.dots}>
          <span className={styles.dot} style={{ background: "#ff5f56" }} />
          <span className={styles.dot} style={{ background: "#ffbd2e" }} />
          <span className={styles.dot} style={{ background: "#27c93f" }} />
        </div>
        <div className={styles.title}>bash</div>
      </div>
      <div className={styles.body}>
        <div className={styles.line}>
          <span className={styles.prompt}></span>
          {visibleLines === 0 ? typing : LINES[0].text}
          {visibleLines === 0 && <span className={styles.cursor}></span>}
        </div>
        
        {LINES.slice(1, visibleLines).map((line, i) => (
          <div key={i} className={styles.line} style={{ color: line.color }}>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
