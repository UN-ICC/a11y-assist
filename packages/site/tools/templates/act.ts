import type { ACTRule } from 'act-rules-query'
import { baseLayout, esc, jsonPretty } from '../render.js'

function actBody(r: ACTRule, rootHref: string): string {
  const parts: string[] = []
  parts.push(`<article class="card act-card">`)
  parts.push(`<header>`)
  parts.push(`<p class="kicker">ACT Rule · ${esc(r.rule_type)}</p>`)
  parts.push(`<h1>${esc(r.name)}</h1>`)
  parts.push(`<p class="role-tag">id: <code>${esc(r.id)}</code></p>`)
  parts.push(`<p><a href="${esc(r.url)}" rel="noreferrer">${esc(r.url)}</a></p>`)
  parts.push(`</header>`)

  parts.push(`<section><h2>Description</h2><p>${esc(r.description).replace(/\n/g, '<br>')}</p></section>`)

  if (r.wcag_sc_ids.length) {
    parts.push(`<section><h2>WCAG Success Criteria covered</h2><ul class="sc-list">`)
    for (const sc of r.wcag_sc_ids) {
      parts.push(`<li><a href="${rootHref}/wcag/${esc(sc)}.html"><code>${esc(sc)}</code></a></li>`)
    }
    parts.push(`</ul></section>`)
  }

  if (r.applicability_text) {
    parts.push(`<section><h2>Applicability <span class="provenance-tag">verbatim from upstream</span></h2>`)
    // Keep verbatim — escape but preserve newlines as <br> for readability
    parts.push(`<div class="applicability">${esc(r.applicability_text).replace(/\n/g, '<br>')}</div>`)
    parts.push(`</section>`)
  }

  parts.push(`<section class="agent-view"><h2>What the agent receives for this rule</h2>`)
  parts.push(`<pre><code>${jsonPretty(r)}</code></pre></section>`)

  parts.push(`</article>`)
  return parts.join('\n')
}

export function renderACTPage(r: ACTRule, rootHref: string): string {
  return baseLayout({
    title: `ACT Rule ${r.id} ${r.name}`,
    description: `ACT Rule ${r.id}: ${r.name}. Covers WCAG ${r.wcag_sc_ids.join(', ')}.`,
    rootHref,
    bodyClass: 'page-act',
    content: actBody(r, rootHref),
  })
}
