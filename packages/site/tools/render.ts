/** HTML escape for untrusted content. */
export function esc(s: unknown): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Pretty-print a JSON value for embedding in a <pre> block. */
export function jsonPretty(value: unknown): string {
  return esc(JSON.stringify(value, null, 2))
}

/** Join an array of strings with a separator, escaping each. */
export function join(items: string[], sep = ', '): string {
  return items.map(esc).join(sep)
}

/** Join an array of pre-formatted HTML strings — caller is responsible for escaping. */
export function joinHtml(items: string[], sep = ', '): string {
  return items.join(sep)
}

export interface BaseLayoutOpts {
  title: string
  description?: string
  bodyClass?: string
  /** Relative path to root, e.g. '..' for `pattern/x.html`, '.' for `index.html`. */
  rootHref: string
  content: string
}

/**
 * Shared HTML shell. Header + footer + audit-button script. Every page on the
 * site uses this layout — guarantees a consistent surface for the audit button
 * and the provenance footer.
 */
export function baseLayout(opts: BaseLayoutOpts): string {
  const { title, description, bodyClass, rootHref, content } = opts
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} — a11ycat</title>
  ${description ? `<meta name="description" content="${esc(description)}">` : ''}
  <link rel="stylesheet" href="${rootHref}/assets/a11ycat.css">
</head>
<body${bodyClass ? ` class="${esc(bodyClass)}"` : ''}>
  <header class="site-header">
    <a href="${rootHref}/index.html" class="brand">
      <span aria-hidden="true">🐈</span>
      <span class="brand-name">a11ycat</span>
    </a>
    <nav class="site-nav" aria-label="Main">
      <a href="${rootHref}/index.html#patterns">Patterns</a>
      <a href="${rootHref}/index.html#wcag">WCAG</a>
      <a href="${rootHref}/index.html#act">ACT</a>
      <a href="${rootHref}/ontology.html">Ontology</a>
      <a href="${rootHref}/provenance.html">Provenance</a>
    </nav>
    <button type="button" id="audit-button" aria-controls="audit-panel" aria-expanded="false">
      Audit this page
    </button>
  </header>
  <section id="audit-panel" hidden aria-live="polite">
    <h2>Audit results</h2>
    <div id="audit-output" tabindex="-1"></div>
  </section>
  <main>
${content}
  </main>
  <footer class="site-footer">
    <p>
      <strong>a11ycat</strong> — accessibility for the prowler.
      <span>Humans browse, agents query — same data, every claim sourced.</span>
    </p>
    <p>
      Sourced from W3C WAI-ARIA, APG, WCAG 2.2, and ACT Rules.
      <a href="${rootHref}/provenance.html">See provenance</a>.
    </p>
  </footer>
  <script src="${rootHref}/assets/audit-button.js" defer></script>
</body>
</html>
`
}
