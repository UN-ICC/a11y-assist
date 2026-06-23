/**
 * Browser-side "Audit this page" handler.
 *
 * Uses the SAME `wrapAuditResponse` function from a11y-core that the MCP
 * server's `audit_html` tool uses. The only divergence between MCP and
 * website is how axe gets invoked (Playwright in Node vs in-browser here);
 * the response shape is identical because both call wrapAuditResponse.
 *
 * Bundled via esbuild → docs/assets/audit-button.js
 */

import axe from 'axe-core'
// Import directly from the audit-response module to avoid pulling load-pattern.ts
// (which uses createRequire/node:module) into the browser bundle.
import { wrapAuditResponse, type EnrichedViolation } from 'a11y-core/dist/audit-response.js'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

function escapeHtml(s: unknown): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function impactBadge(impact: string | null): string {
  if (!impact) return `<span class="badge">unknown</span>`
  return `<span class="badge impact-${escapeHtml(impact)}">${escapeHtml(impact)}</span>`
}

function renderViolation(v: EnrichedViolation): string {
  return `
    <article class="violation">
      <header>
        <h3><code>${escapeHtml(v.axe_id)}</code> ${impactBadge(v.impact)}</h3>
      </header>
      <p>${escapeHtml(v.description)}</p>
      <p>
        <strong>Affects:</strong> ${escapeHtml(v.nodes_affected)} node${v.nodes_affected === 1 ? '' : 's'}.
        ${v.help_url ? `<a href="${escapeHtml(v.help_url)}" rel="noreferrer">Learn more</a>.` : ''}
      </p>
    </article>
  `
}

async function auditCurrentPage(): Promise<void> {
  const output = document.getElementById('audit-output')
  if (!output) return

  output.innerHTML = '<p>Running axe-core against this page…</p>'

  const results = await axe.run(document.body, {
    runOnly: { type: 'tag', values: AXE_TAGS },
  })

  // Same wrapping function the MCP audit_html uses → same JSON shape
  const response = wrapAuditResponse(results.violations as unknown[])

  const summary = response.passed
    ? `<p class="audit-summary pass"><strong>Passed</strong> — no automated violations on this page.</p>`
    : `<p class="audit-summary fail"><strong>Failed</strong> — ${response.violations.length} violation${response.violations.length === 1 ? '' : 's'} found.</p>`

  const list = response.violations.length === 0
    ? ''
    : `<div class="violations-list">${response.violations.map(renderViolation).join('')}</div>`

  const caveats = `
    <details class="audit-caveats">
      <summary>Caveats</summary>
      <ul>${response.caveats.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
    </details>
  `

  const agentView = `
    <details class="audit-agent-view">
      <summary>What the agent receives (JSON)</summary>
      <pre><code>${escapeHtml(JSON.stringify(response, null, 2))}</code></pre>
    </details>
  `

  output.innerHTML = summary + list + caveats + agentView
  output.focus()
}

function init(): void {
  const button = document.getElementById('audit-button') as HTMLButtonElement | null
  const panel = document.getElementById('audit-panel') as HTMLElement | null
  if (!button || !panel) return

  button.addEventListener('click', async () => {
    const willOpen = panel.hasAttribute('hidden')
    if (willOpen) {
      panel.removeAttribute('hidden')
      button.setAttribute('aria-expanded', 'true')
    } else {
      panel.setAttribute('hidden', '')
      button.setAttribute('aria-expanded', 'false')
      return
    }

    button.disabled = true
    try {
      await auditCurrentPage()
    } catch (err) {
      const output = document.getElementById('audit-output')
      if (output) {
        output.innerHTML = `<p class="audit-error">Audit failed: ${escapeHtml(err instanceof Error ? err.message : String(err))}</p>`
      }
    } finally {
      button.disabled = false
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
