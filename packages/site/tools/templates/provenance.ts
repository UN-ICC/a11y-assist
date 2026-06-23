import type { APGSnapshot } from 'apg-query'
import type { WCAGSnapshot } from 'wcag-query'
import type { ACTSnapshot } from 'act-rules-query'
import type { CoverageSummary } from '../derive.js'
import { baseLayout, esc } from '../render.js'

export interface ProvenanceData {
  apg: APGSnapshot
  wcag: WCAGSnapshot
  act: ACTSnapshot
  coverage: CoverageSummary
}

function body(p: ProvenanceData): string {
  return `
<article class="card">
  <header><h1>Provenance</h1>
  <p class="kicker">every claim, traceable</p></header>

  <section><h2>Data sources</h2>
  <p>Each piece of data on a11y-assist is extracted from a versioned upstream source. No editorial paraphrase. The MCP server consumes the same packages.</p>
  <dl class="contract">
    <dt><code>apg-query</code></dt>
    <dd>${esc(p.apg.pattern_count)} patterns extracted from W3C APG · snapshot ${esc(p.apg.date)} · base URL <a href="${esc(p.apg.apg_base)}" rel="noreferrer">${esc(p.apg.apg_base)}</a></dd>

    <dt><code>wcag-query</code></dt>
    <dd>WCAG ${esc(p.wcag.version)} · ${esc(p.wcag.sc_count)} SCs · ${esc(p.wcag.technique_count)} sufficient techniques · ${esc(p.wcag.failure_count)} documented failures · snapshot ${esc(p.wcag.date)}</dd>

    <dt><code>act-rules-query</code></dt>
    <dd>${esc(p.act.rule_count)} ACT rules · upstream commit <code>${esc(p.act.upstream_commit.slice(0, 7))}</code> · snapshot ${esc(p.act.date)}</dd>

    <dt><code>aria-query</code></dt>
    <dd>npm package; pinned via package.json. Provides WAI-ARIA spec data: roles, properties, element-role mappings.</dd>

    <dt><code>axe-core</code></dt>
    <dd>npm package; pinned via package.json. Runs the actual checks during MCP audits and the website's Audit-this-page button.</dd>
  </dl>
  </section>

  <section><h2>No editorial residue</h2>
  <p>Nothing on a11y-assist is hand-asserted. Every pattern page is the verbatim APG card plus its ARIA contract and native elements (from <code>aria-query</code>); the only cross-corpus link is <strong>ACT rule → WCAG SC</strong>, taken straight from ACT front-matter. There is no editorial role→SC table and no role→rule heuristic — drill-down is plain search over the verbatim corpora.</p>
  </section>

  <section><h2>Coverage</h2>
  <p>Computed at build time directly from the query packages — the same data the MCP server serves.</p>
  <ul>
    <li>${esc(p.coverage.scsWithoutACT)} of ${esc(p.coverage.totalSCs)} WCAG SCs have <strong>no ACT rule</strong> coverage. These are typically visual or behavioural SCs (contrast, focus appearance, target size, motion) ACT hasn't specified — they are caught by <strong>axe at verification</strong> and by manual review, not asserted per pattern.</li>
    <li>${esc(p.coverage.totalActRules)} ACT rules in the dataset bridge patterns to their WCAG Success Criteria.</li>
  </ul>
  </section>

  <section><h2>Methodology</h2>
  <p>Every snapshot is committed alongside its extracted JSON. Re-running the extractor against committed snapshots produces byte-identical output. Updating snapshots is a deliberate, reviewed action.</p>
  <p>See the project's <a href="https://github.com/" rel="noreferrer">methodology document</a> for the full pipeline description.</p>
  </section>

  <section><h2>Licensing</h2>
  <p>Code is MIT. Extracted W3C content is redistributed under the W3C Document License (CC-BY-style with attribution). Each query package's NOTICE file lists the upstream source.</p>
  </section>
</article>
`
}

export function renderProvenancePage(data: ProvenanceData): string {
  return baseLayout({
    title: 'Provenance',
    description: 'a11y-assist data sources, editorial residue, and methodology.',
    rootHref: '.',
    bodyClass: 'page-provenance',
    content: body(data),
  })
}
