import type { SuccessCriterion, Technique } from 'wcag-query'
import { baseLayout, esc, join, jsonPretty } from '../render.js'

export interface SCExpansion extends SuccessCriterion {
  techniques: Technique[]
  failures: Technique[]
  /** ACT rules that cover this SC (mechanical, from ACT front-matter). */
  act_rules_covering: { id: string; name: string }[]
}

function scBody(sc: SCExpansion, rootHref: string): string {
  const parts: string[] = []
  parts.push(`<article class="card sc-card">`)
  parts.push(`<header><p class="kicker">WCAG 2.2 · Level ${esc(sc.level)}</p>`)
  parts.push(`<h1><code>${esc(sc.id)}</code> ${esc(sc.title)}</h1></header>`)

  parts.push(`<section><h2>Success Criterion</h2><blockquote>${esc(sc.short_text)}</blockquote>`)
  parts.push(`<p><a href="${esc(sc.understanding_url)}" rel="noreferrer">Understanding ${esc(sc.id)} on W3C</a></p></section>`)

  if (sc.techniques.length) {
    parts.push(`<section><h2>Sufficient techniques</h2><ul class="techniques">`)
    for (const t of sc.techniques) {
      parts.push(`<li><a href="${esc(t.url)}" rel="noreferrer"><code>${esc(t.id)}</code> ${esc(t.title)}</a></li>`)
    }
    parts.push(`</ul></section>`)
  }

  if (sc.failures.length) {
    parts.push(`<section><h2>Documented failures <span class="provenance-tag">anti-patterns</span></h2><ul class="failures">`)
    for (const f of sc.failures) {
      parts.push(`<li><a href="${esc(f.url)}" rel="noreferrer"><code>${esc(f.id)}</code> ${esc(f.title)}</a></li>`)
    }
    parts.push(`</ul></section>`)
  }

  if (sc.act_rules_covering.length) {
    parts.push(`<section><h2>ACT rules covering this SC <span class="provenance-tag">mechanical</span></h2><ul class="act-list">`)
    for (const r of sc.act_rules_covering) {
      parts.push(`<li><a href="${rootHref}/act/${esc(r.id)}.html"><code>${esc(r.id)}</code> ${esc(r.name)}</a></li>`)
    }
    parts.push(`</ul></section>`)
  }

  parts.push(`<section class="agent-view"><h2>What the agent receives for this SC</h2>`)
  parts.push(`<pre><code>${jsonPretty(sc)}</code></pre></section>`)

  parts.push(`</article>`)
  return parts.join('\n')
}

export function renderSCPage(sc: SCExpansion, rootHref: string): string {
  return baseLayout({
    title: `WCAG ${sc.id} ${sc.title}`,
    description: `WCAG 2.2 Success Criterion ${sc.id}: ${sc.title} (Level ${sc.level}).`,
    rootHref,
    bodyClass: 'page-sc',
    content: scBody(sc, rootHref),
  })
}
