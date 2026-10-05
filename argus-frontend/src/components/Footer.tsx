import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.inner}>
          <div className={styles.brand}>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>Argus</span>
          </div>
          
          <div className={styles.links}>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="#docs">Docs</a>
            <a href="#license">License</a>
          </div>
        </div>
        
        <div className={styles.disclaimer}>
          Argus is an automated scanner. Results may include false positives and do not guarantee a repository is free of vulnerabilities.
        </div>
      </div>
    </footer>
  );
}
