"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./TerminalPreview.module.css";

const LINES = [
  { text: "$ argus scan https://github.com/OWASP/NodeGoat", delay: 0, type: "command" as const },
  { text: "✓ Cloned OWASP/NodeGoat @ 3f9c2a1", meta: "2.1s", delay: 1800, type: "success" as const },
  { text: "✓ Semgrep", meta: "28 findings", delay: 2500, type: "success" as const },
  { text: "✓ Gitleaks", meta: "3 secrets", delay: 3200, type: "success" as const },
  { text: "✓ OSV-Scanner", meta: "41 vulnerable deps", delay: 3900, type: "success" as const },
  { text: "Risk score: 82/100  Grade: F", delay: 4600, type: "danger" as const },
  { text: "Report → ./reports/OWASP__NodeGoat/report.html", delay: 5200, type: "muted" as const },
];

export default function TerminalPreview() {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [typing, setTyping] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    
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
            setTimeout(runAnimation, 9000)
          );
        }
      }, 25);
      
      intervals.push(typeInterval);
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
      intervals.forEach(clearInterval);
    };
  }, []);

  return (
    <div className={styles.terminal} ref={containerRef}>
      <div className={styles.header}>
        <div className={styles.dots}>
          <span className={styles.dot} data-color="red" />
          <span className={styles.dot} data-color="yellow" />
          <span className={styles.dot} data-color="green" />
        </div>
        <div className={styles.title}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          bash — argus
        </div>
        <div style={{ width: 52 }} />
      </div>
      <div className={styles.body}>
        {/* Command line with typing */}
        <div className={`${styles.line} ${styles.commandLine}`}>
          <span className={styles.prompt}>$</span>
          <span>{visibleLines === 0 ? typing.replace(/^\$ /, '') : LINES[0].text.replace(/^\$ /, '')}</span>
          {visibleLines === 0 && <span className={styles.cursor}>▌</span>}
        </div>
        
        {/* Output lines */}
        {LINES.slice(1, visibleLines).map((line, i) => (
          <div 
            key={i} 
            className={`${styles.line} ${styles[line.type]} ${styles.outputLine}`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {line.type === "success" && (
              <span className={styles.checkmark}>✓</span>
            )}
            <span className={styles.lineText}>{line.text.replace(/^✓ /, '')}</span>
            {line.meta && (
              <span className={styles.lineMeta}>{line.meta}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
