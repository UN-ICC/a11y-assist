import type { ComposedApgPattern } from 'a11y-core'
import type { ACTRule } from 'act-rules-query'
import { baseLayout, esc, join, joinHtml, jsonPretty } from '../render.js'

export interface PatternView {
  composed: ComposedApgPattern
  /** ACT rules reached from the pattern's suggested queries (build-time hop). */
  related_act: ACTRule[]
}

function patternBody(view: PatternView, rootHref: string): string {
  const { composed: c, related_act } = view
  const apg = c.apg
  const parts: string[] = []

  parts.push(`<article class="card pattern-card">`)
  parts.push(`<header>`)
  parts.push(`<p class="kicker">APG pattern</p>`)
  parts.push(`<h1>${esc(apg.name)}</h1>`)
  parts.push(`<p class="role-tag">role: <code>${esc(c.role)}</code></p>`)
  parts.push(`<p><a href="${esc(apg.apg_url)}" rel="noreferrer">APG: ${esc(apg.apg_url)}</a></p>`)
  parts.push(`</header>`)

  parts.push(`<section><h2>About <span class="provenance-tag">from APG</span></h2><p>${esc(apg.about_this_pattern).replace(/\n/g, '<br>')}</p></section>`)

  if (apg.aria_roles.length) {
    parts.push(`<section><h2>ARIA roles</h2>`)
    parts.push(`<p>Uses ${apg.aria_roles.length === 1 ? 'role' : 'roles'} ${joinHtml(apg.aria_roles.map((r) => `<code>${esc(r)}</code>`))}.</p>`)
    parts.push(`</section>`)
  }

  if (Object.keys(c.aria_contract).length) {
    parts.push(`<section><h2>ARIA contract <span class="provenance-tag">from aria-query</span></h2>`)
    for (const [role, contract] of Object.entries(c.aria_contract)) {
      parts.push(`<details open><summary><code>${esc(role)}</code></summary><dl class="contract">`)
      parts.push(`<dt>Accessible name required</dt><dd>${contract.accessible_name_required ? 'Yes' : 'No'}</dd>`)
      parts.push(`<dt>Name from</dt><dd>${join(contract.name_from || [])}</dd>`)
      if (contract.required_props?.length) {
        parts.push(`<dt>Required properties</dt><dd>${joinHtml(contract.required_props.map((x) => `<code>${esc(x)}</code>`))}</dd>`)
      }
      if (contract.supported_props?.length) {
        parts.push(`<dt>Supported properties</dt><dd>${joinHtml(contract.supported_props.map((x) => `<code>${esc(x)}</code>`))}</dd>`)
      }
      parts.push(`<dt>Spec</dt><dd><a href="${esc(contract.spec_url)}" rel="noreferrer">${esc(contract.spec_url)}</a></dd>`)
      parts.push(`</dl></details>`)
    }
    parts.push(`</section>`)
  }

  if (apg.keyboard_interactions.length) {
    parts.push(`<section><h2>Keyboard interactions <span class="provenance-tag">from APG</span></h2>`)
    parts.push(`<table class="kbd-table"><thead><tr><th>Key</th><th>Action</th></tr></thead><tbody>`)
    for (const k of apg.keyboard_interactions) {
      parts.push(`<tr><td><code>${esc(k.key)}</code></td><td>${esc(k.description)}</td></tr>`)
    }
    parts.push(`</tbody></table></section>`)
  }

  if (c.native_elements.length) {
    parts.push(`<section><h2>Native HTML elements <span class="provenance-tag">from aria-query</span></h2>`)
    parts.push(`<p>Elements that natively carry one of this pattern's ARIA roles — using them gives you the role for free.</p><ul class="element-list">`)
    for (const el of c.native_elements) {
      const note = el.constraints.length ? ` · <span class="hint">${joinHtml(el.constraints.map((x) => esc(x)))}</span>` : ''
      parts.push(`<li><code>&lt;${esc(el.canonical_id)}&gt;</code> · implicit role <code>${esc(el.implicit_role)}</code>${note}</li>`)
    }
    parts.push(`</ul></section>`)
  }

  parts.push(`<section><h2>Drill down to conformance tests</h2>`)
  parts.push(`<p class="hint">Run these <code>search_act</code> queries to reach the applicable ACT rules and their WCAG SCs:</p>`)
  parts.push(`<p>${joinHtml(c.suggested_queries.map((q) => `<code>search_act("${esc(q.query)}")</code>`), ' ')}</p>`)
  if (related_act.length) {
    parts.push(`<h3>Related ACT rules <span class="provenance-tag">via search</span></h3><ul class="act-list">`)
    for (const r of related_act) {
      parts.push(`<li><a href="${rootHref}/act/${esc(r.id)}.html"><code>${esc(r.id)}</code> ${esc(r.name)}</a>`)
      if (r.wcag_sc_ids.length) {
        parts.push(` · ${joinHtml(r.wcag_sc_ids.map((sc) => `<a class="level" href="${rootHref}/wcag/${esc(sc)}.html">${esc(sc)}</a>`))}`)
      }
      parts.push(`</li>`)
    }
    parts.push(`</ul>`)
  }
  parts.push(`</section>`)

  parts.push(`<section class="agent-view"><h2>What the agent receives</h2>`)
  parts.push(`<p class="hint">Calling <code>get_apg_pattern("${esc(c.role)}", "AA")</code> over MCP returns this:</p>`)
  parts.push(`<pre id="agent-json"><code>${jsonPretty(c)}</code></pre></section>`)

  parts.push(`</article>`)
  return parts.join('\n')
}

export function renderPatternPage(view: PatternView, rootHref: string): string {
  return baseLayout({
    title: view.composed.apg.name,
    description: `Accessibility pattern for ${view.composed.role} — APG recipe, ARIA contract, native elements, and ACT/WCAG drill-down.`,
    rootHref,
    bodyClass: 'page-pattern',
    content: patternBody(view, rootHref),
  })
}
