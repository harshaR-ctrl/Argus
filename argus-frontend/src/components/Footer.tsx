import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.logoRow}>
              <svg className={styles.logoIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className={styles.logoText}>Argus</span>
            </div>
            <p className={styles.tagline}>
              Open-source GitHub vulnerability scanner.
              <br />
              Free, fast, and transparent.
            </p>
          </div>

          <div className={styles.linksGroup}>
            <div className={styles.linksCol}>
              <h4 className={styles.linksTitle}>Product</h4>
              <a href="/#features">Features</a>
              <a href="/#compare">Compare</a>
              <a href="/history">History</a>
            </div>
            <div className={styles.linksCol}>
              <h4 className={styles.linksTitle}>Resources</h4>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="#docs">Documentation</a>
              <a href="#license">License (MIT)</a>
            </div>
          </div>
        </div>
        
        <div className={styles.bottom}>
          <p className={styles.disclaimer}>
            Argus is an automated scanner. Results may include false positives and do not guarantee a repository is free of vulnerabilities.
          </p>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Argus. Built with ♥ and open-source tools.
          </p>
        </div>
      </div>
    </footer>
  );
}
