# design.md — RepoScan

Design spec for the **RepoScan landing page** and the **scan report UI**.

**Design brief:** A minimal developer-tools landing page with dark mode, code snippet previews, a feature comparison table, integration logos, a documentation link, and syntax-highlighting colors.

**Cost constraint:** zero. Static HTML/CSS/JS, system + free fonts, hosted on GitHub Pages (or the same free host as the demo).

---

## 1. Design Principles

1. **Minimal.** Black and limegreen only — one accent color, generous whitespace, no stock illustrations, no gradients-for-the-sake-of-gradients.
2. **Code is the hero.** Real terminal output and real JSON/finding snippets do the selling, not marketing copy.
3. **Dark-first.** Developers default to dark; light mode is supported and fully themed.
4. **Show, don't claim.** Every feature is paired with a snippet, a table row, or a screenshot of the actual report.
5. **Fast and accessible.** No frameworks required; < 100 KB of CSS/JS; keyboard-navigable; WCAG AA contrast.

## 2. Page Structure

```
┌──────────────────────────────────────────────────────────────┐
│ NAV   ◈ RepoScan        Features  Compare  Docs  [GitHub] [◐]│
├──────────────────────────────────────────────────────────────┤
│ HERO                                                         │
│   Scan any GitHub repo for vulnerabilities.                  │
│   Code issues, leaked secrets, vulnerable dependencies —     │
│   one report, zero cost.                                     │
│   ┌──────────────────────────────────────┐ ┌──────────────┐  │
│   │ https://github.com/owner/repo        │ │  Scan repo → │  │
│   └──────────────────────────────────────┘ └──────────────┘  │
│   $ reposcan scan <url>   [copy]    Read the docs →          │
│   ┌────────────────────────────────────────────────────────┐ │
│   │ terminal preview (animated typing, syntax colored)     │ │
│   └────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ INTEGRATIONS / POWERED BY (logo strip)                       │
│  Semgrep · Gitleaks · OSV · Trivy · Git · Docker · Python    │
├──────────────────────────────────────────────────────────────┤
│ FEATURES (3 cards)   SAST · Secrets · Dependencies           │
├──────────────────────────────────────────────────────────────┤
│ CODE PREVIEWS (tabs)  CLI │ JSON │ Finding │ Docker          │
├──────────────────────────────────────────────────────────────┤
│ HOW IT WORKS (4 steps, horizontal)                           │
├──────────────────────────────────────────────────────────────┤
│ COMPARISON TABLE                                             │
├──────────────────────────────────────────────────────────────┤
│ REPORT PREVIEW (screenshot / live mini-report)               │
├──────────────────────────────────────────────────────────────┤
│ DOCS CTA  "Everything you need is in the docs"  [Open docs →]│
├──────────────────────────────────────────────────────────────┤
│ FOOTER   GitHub · Docs · License · Disclaimer                │
└──────────────────────────────────────────────────────────────┘
```

## 3. Color System

**Theme: black + limegreen.** Pure-black surfaces with a single limegreen accent (`#32CD32`, the CSS `limegreen` color). Dark is default; a light theme (white + black text, darker lime for text accents) is supported via `prefers-color-scheme` and the manual toggle (`data-theme`).

### 3.1 UI tokens

| Token | Dark (default) | Light | Use |
|-------|------|-------|-----|
| `--bg` | `#000000` | `#ffffff` | Page background |
| `--surface` | `#0a0a0a` | `#f5f5f5` | Cards, code blocks, table header |
| `--surface-2` | `#141414` | `#ebebeb` | Hover, inputs |
| `--border` | `#262626` | `#d4d4d4` | Dividers, card outlines |
| `--text` | `#f2f2f2` | `#0a0a0a` | Primary text |
| `--text-muted` | `#9a9a9a` | `#525252` | Secondary text |
| `--accent` | `#32CD32` | `#32CD32` | Fills: primary button, active tab underline, focus ring, highlights |
| `--accent-hover` | `#5EE05E` | `#2BB82B` | Button hover |
| `--accent-fg` | `#000000` | `#000000` | Text on accent fills (black on limegreen has high contrast) |
| `--accent-text` | `#32CD32` | `#1B7A1B` | Accent-colored **text and links** (light mode uses a darker lime because `#32CD32` on white is too low-contrast) |
| `--glow` | `rgba(50,205,50,.25)` | `rgba(50,205,50,.30)` | Subtle lime glow on hero terminal and focused inputs |

Usage rules:
- Limegreen is the **only** accent. Don't introduce blue/purple UI chrome.
- Use lime sparingly: primary CTA, active states, prompt `$`, key numbers, and the RepoScan column in the comparison table.
- Black-on-lime for filled elements; lime-on-black for text/links in dark mode.

### 3.2 Syntax highlighting palette

Lime-forward, Monokai-style so code feels at home on black.

| Token type | CSS class | Dark | Light |
|-----------|-----------|------|-------|
| Keyword (`def`, `import`, `const`) | `.tok-keyword` | `#ff6b81` | `#cf222e` |
| String | `.tok-string` | `#a6e22e` | `#2f6b00` |
| Function / method name | `.tok-function` | `#d2a8ff` | `#8250df` |
| Number / constant | `.tok-number` | `#79c0ff` | `#0550ae` |
| Variable / parameter | `.tok-variable` | `#ffa657` | `#953800` |
| Type / class / tag | `.tok-type` | `#66d9ef` | `#0b6e8a` |
| Comment | `.tok-comment` | `#7a7a7a` | `#6e6e6e` |
| Operator / punctuation | `.tok-punct` | `#f2f2f2` | `#0a0a0a` |
| JSON key | `.tok-key` | `#32CD32` | `#1B7A1B` |
| Terminal prompt `$` | `.tok-prompt` | `#32CD32` | `#1B7A1B` |

### 3.3 Severity colors (badges and report)

Severity colors stay distinct from the lime brand accent so "good" (brand) is never confused with "bad" (findings).

| Severity | Dark | Light | Badge style |
|----------|------|-------|-------------|
| Critical | `#ff4d4d` | `#cf222e` | Filled |
| High | `#ff8c2e` | `#bc4c00` | Filled |
| Medium | `#ffd22e` | `#9a6700` | Outlined |
| Low | `#4da6ff` | `#0969da` | Outlined |
| Info | `#9a9a9a` | `#525252` | Muted outline |

> Never rely on color alone: every badge carries a text label (CRITICAL, HIGH, …) and optionally an icon.

### 3.4 Grade colors
`A` limegreen `#32CD32` · `B` yellow-lime `#a3e635` · `C` yellow `#ffd22e` · `D` orange `#ff8c2e` · `F` red `#ff4d4d`.

## 4. Typography

| Role | Font | Fallback | Size / weight |
|------|------|----------|---------------|
| Headings, body | **Inter** (Google Fonts, free) | `system-ui, -apple-system, "Segoe UI", sans-serif` | H1 48–56 / 700 · H2 32 / 600 · H3 20 / 600 · body 16 / 400 |
| Code, terminal, numbers | **JetBrains Mono** (free) | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | 14 / 400, line-height 1.6 |

- Tight heading tracking (`letter-spacing: -0.02em`); body line-height 1.6.
- Use `font-display: swap`. To stay fully offline-capable, system stacks alone are acceptable.

## 5. Layout & Spacing

- **Max content width:** 1120 px, centered; hero text max 720 px.
- **Spacing scale (px):** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Section vertical padding: 96 desktop / 64 mobile.
- **Grid:** 12-column desktop; feature cards 3-up → 1-up on mobile.
- **Radius:** 8 px (cards, inputs), 6 px (badges, buttons), 999 px (pills).
- **Borders over shadows:** 1 px `--border`. Use a lime glow only on the hero terminal and focused inputs (`0 0 0 1px var(--glow), 0 8px 32px rgba(50,205,50,.08)` in dark; a soft neutral shadow in light).
- **Breakpoints:** 640 / 768 / 1024 / 1280.

## 6. Components

### 6.1 Navbar
Sticky, `--bg` at 80% opacity with backdrop blur, 1 px bottom border. Left: logo (`◈ RepoScan`, mono font, the ◈ in limegreen). Right: links (Features, Compare, **Docs**), GitHub button, theme toggle. Collapses to a menu button below 768 px.

### 6.2 Hero input
Pill-free rectangular input (`--surface-2`, 1 px border, 48 px tall) + primary button. Placeholder: `https://github.com/owner/repo`. Inline validation (red border + message for non-GitHub URLs). Below it: a copyable CLI one-liner and a ghost link "Read the docs →".

### 6.3 Buttons

| Type | Style |
|------|-------|
| Primary | `--accent` bg, `--accent-fg` (black) text, 600 weight; hover `--accent-hover` |
| Secondary | Transparent, 1 px `--border`, hover `--surface-2` |
| Ghost / link | Text only, `--accent-text`, underline on hover |

All buttons: 40–48 px height, visible `:focus-visible` ring (2 px `--accent`, 2 px offset).

### 6.4 Code block
- Background `--surface`, 1 px border, 8 px radius.
- Header bar: filename or language label on the left (muted), **Copy** button on the right.
- Optional line numbers (muted), line highlight for the key line (`rgba(50,205,50,.12)`).
- Horizontal scroll on overflow; never wrap code.
- Terminal variant: three muted dots in the header, prompt `$` in `.tok-prompt`.

### 6.5 Feature card
Icon (24 px, outline style, accent stroke) → title → 2-line description → mini snippet or "Detects:" list. Hover: border becomes `--accent` at 40% opacity. No lift animations.

### 6.6 Integration logo strip
- Row of 6–7 logos, **monochrome** (`filter: grayscale(1) opacity(.7)`), full color + opacity 1 on hover.
- Label above: "Powered by open-source tools".
- Logos: **Semgrep, Gitleaks, OSV, Trivy, Git/GitHub, Docker, Python**.
- Use SVGs from each project's official brand/media kit or a free icon set (e.g., Simple Icons) and follow each license/brand guideline. If a logo isn't available, use a text wordmark in the mono font rather than a redrawn logo.
- Each logo is a link to the project's site; include `alt` text. On mobile: horizontal scroll or 3×3 grid.

### 6.7 Feature comparison table
See §7.3. Styling: sticky first column, zebra-free rows with 1 px dividers, header on `--surface`. RepoScan column gets a subtle accent top border and tinted background (`rgba(50,205,50,.06)`). Cells use ✓ / ✗ / ◐ glyphs **with** text for accessibility (`<span class="sr-only">Yes</span>`). Wrapped in `overflow-x: auto` for mobile.

### 6.8 Severity badge
Uppercase 11–12 px mono text, 6 px radius, padding `2px 8px`. Critical/High filled; Medium/Low outlined.

### 6.9 Tabs (code previews)
Underline-style tabs; active tab has 2 px `--accent` bottom border. Arrow-key navigation, `role="tablist"`.

### 6.10 Theme toggle
Icon button (◐). Persists to `localStorage` (`reposcan-theme`); defaults to the OS preference; applies `data-theme="dark|light"` on `<html>`. Set the theme in an inline `<head>` script to prevent a flash.

## 7. Section Content

### 7.1 Hero
- **H1:** Scan any GitHub repo for vulnerabilities.
- **Sub:** Code flaws, leaked secrets, and vulnerable dependencies — in one readable report. Free and open-source.
- **Terminal preview (animated, ~6 s loop):**

```text
$ reposcan scan https://github.com/OWASP/NodeGoat
✓ Cloned OWASP/NodeGoat @ 3f9c2a1 (2.1s)
✓ Semgrep      28 findings
✓ Gitleaks      3 secrets
✓ OSV-Scanner  41 vulnerable dependencies
Risk score: 82/100  Grade: F
Report → ./reports/OWASP__NodeGoat/report.html
```

*(Example output; replace numbers with a real scan before publishing.)*

### 7.2 Code snippet previews (tabbed)

**Tab 1 — CLI**
```bash
pip install reposcan
reposcan scan https://github.com/owner/repo --out ./reports
reposcan scan https://github.com/owner/repo --only secrets --fail-on high
```

**Tab 2 — JSON output**
```json
{
  "repo": "owner/repo",
  "commit": "3f9c2a1",
  "risk_score": 82,
  "grade": "F",
  "summary": { "critical": 2, "high": 9, "medium": 14, "low": 6 }
}
```

**Tab 3 — Sample finding**
```python
# app/db.py:42   HIGH · CWE-89 · A03:2021 Injection
cursor.execute("SELECT * FROM users WHERE id=" + user_id)   # ← vulnerable

# Suggested fix
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

**Tab 4 — Docker**
```bash
docker run --rm -v "$PWD/reports:/reports" reposcan \
  scan https://github.com/owner/repo --out /reports
```

### 7.3 Comparison table

Compare *approaches*, not named competitors, to keep claims accurate and non-misleading.

| | Manual review | Running one scanner | **RepoScan** |
|---|:---:|:---:|:---:|
| Code vulnerabilities (SAST) | ◐ Time-consuming | ✓ | ✓ |
| Leaked secrets | ◐ Easy to miss | ✗ Separate tool | ✓ |
| Vulnerable dependencies | ✗ | ✗ Separate tool | ✓ |
| One unified report | ✗ | ✗ | ✓ |
| Severity + risk score | ✗ | ◐ Per tool | ✓ |
| Fix guidance per finding | ◐ | ◐ | ✓ |
| Setup effort | None | Per-tool install | One command / one URL |
| Cost | Your time | Free | **Free** |

### 7.4 How it works (4 steps)
1. **Paste** a public GitHub URL
2. **Clone** safely (shallow, sandboxed, nothing executed)
3. **Scan** with Semgrep, Gitleaks, OSV-Scanner
4. **Read** a prioritized HTML/JSON report

### 7.5 Documentation link
- Persistent: navbar "Docs" link, hero ghost link, dedicated CTA section, footer.
- CTA section: heading "Everything you need is in the docs", three quick links (*Quickstart · CLI reference · Report schema*), primary button **Open documentation →**.
- Docs can live in the repo's `/docs` folder rendered by GitHub Pages (free) or as the README.

### 7.6 Footer disclaimer
"RepoScan is an automated scanner. Results may include false positives and do not guarantee a repository is free of vulnerabilities."

## 8. Scan Report UI (HTML report)

Same tokens and components as the landing page; self-contained file.

| Region | Design |
|--------|--------|
| **Header** | Repo name, branch, commit SHA (mono, copyable), scan date, duration |
| **Score card** | Large grade letter in grade color + score `82/100` + severity count chips |
| **Charts** | Severity bar (inline SVG) + category donut; labeled with numbers, not color alone |
| **Filter bar** | Severity chips, category dropdown, file search, sort |
| **Findings table** | Columns: Severity · Title · File:line · CWE · Tool. Row expands to snippet (syntax-highlighted), explanation, remediation, references |
| **Dependencies tab** | Package · Version → Fixed in · Advisory IDs · Severity |
| **Secrets tab** | Masked values (`AKIA••••MPLE`) and a "rotate this credential" note |
| **Metadata** | Tools + versions, skipped paths, scanner errors, disclaimer |

Highlighting for snippets in the report: embed pre-rendered spans using the §3.2 classes (e.g., generate with Pygments server-side, then map to the token classes), so the report stays offline and dependency-free.

## 9. Motion

- Minimal and purposeful: terminal typing effect (hero), 150 ms color/border transitions, tab underline slide.
- No parallax, no scroll-jacking.
- Respect `prefers-reduced-motion: reduce` → show final terminal state instantly, disable transitions.

## 10. Accessibility Checklist

- [ ] Text contrast ≥ 4.5:1 (verify `--text-muted` and syntax colors against `--surface` with a contrast checker)
- [ ] Visible focus states on all interactive elements
- [ ] Semantic landmarks: `header`, `nav`, `main`, `section` with headings in order, `footer`
- [ ] Tabs, theme toggle, and copy buttons have ARIA labels; copy confirms via `aria-live`
- [ ] Table uses `<th scope>`; symbols paired with text
- [ ] Logo images have alt text; decorative icons `aria-hidden`
- [ ] Fully usable at 200% zoom and 320 px width

## 11. Implementation Notes

- **Stack:** plain HTML + CSS variables + ~60 lines of vanilla JS (theme toggle, tabs, copy button, terminal animation). Optional: Tailwind via CDN for speed, but plain CSS keeps it lighter.
- **Syntax highlighting on the landing page:** write snippets pre-highlighted with the `.tok-*` classes (no runtime library), or use **Prism.js / highlight.js** with a custom theme mapped to §3.2.
- **Hosting:** GitHub Pages (free). The "Scan repo" form either links to the Streamlit/HF Space demo with `?url=` prefilled or, if no hosted demo exists yet, shows the CLI command.
- **Performance targets:** Lighthouse ≥ 95 on Performance/Accessibility/Best Practices; no layout shift from theme load.

### Starter CSS tokens

```css
:root {
  --bg:#000000; --surface:#0a0a0a; --surface-2:#141414; --border:#262626;
  --text:#f2f2f2; --text-muted:#9a9a9a;
  --accent:#32CD32; --accent-hover:#5EE05E; --accent-fg:#000000; --accent-text:#32CD32;
  --glow:rgba(50,205,50,.25);
  --tok-keyword:#ff6b81; --tok-string:#a6e22e; --tok-function:#d2a8ff; --tok-number:#79c0ff;
  --tok-variable:#ffa657; --tok-type:#66d9ef; --tok-comment:#7a7a7a; --tok-key:#32CD32;
  --sev-critical:#ff4d4d; --sev-high:#ff8c2e; --sev-medium:#ffd22e; --sev-low:#4da6ff; --sev-info:#9a9a9a;
}
:root[data-theme="light"] {
  --bg:#ffffff; --surface:#f5f5f5; --surface-2:#ebebeb; --border:#d4d4d4;
  --text:#0a0a0a; --text-muted:#525252;
  --accent:#32CD32; --accent-hover:#2BB82B; --accent-fg:#000000; --accent-text:#1B7A1B;
  --glow:rgba(50,205,50,.30);
  --tok-keyword:#cf222e; --tok-string:#2f6b00; --tok-function:#8250df; --tok-number:#0550ae;
  --tok-variable:#953800; --tok-type:#0b6e8a; --tok-comment:#6e6e6e; --tok-key:#1B7A1B;
  --sev-critical:#cf222e; --sev-high:#bc4c00; --sev-medium:#9a6700; --sev-low:#0969da; --sev-info:#525252;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) { /* same values as the light block above */ }
}
```

## 12. Build Order

1. Tokens + typography + navbar + hero (static)
2. Code block component + syntax classes
3. Features, integrations strip, tabs
4. Comparison table + docs CTA
5. Theme toggle + responsive pass + accessibility pass
6. Terminal animation + report preview section
7. Apply the same tokens to the HTML report template (`report.html.j2`)
