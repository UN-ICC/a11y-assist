import type { A11yPattern } from 'a11y-core'
import { baseLayout, esc, join, joinHtml, jsonPretty } from '../render.js'

function patternBody(p: A11yPattern, rootHref: string): string {
  const parts: string[] = []

  parts.push(`<article class="card pattern-card">`)
  parts.push(`<header>`)
  parts.push(`<p class="kicker">${esc(p.type === 'apg_pattern' ? 'APG pattern' : p.type === 'html_native' ? 'HTML native' : 'RN primitive')} · ${esc(p.platform)}</p>`)
  parts.push(`<h1>${esc(p.name)}</h1>`)
  parts.push(`<p class="role-tag">role: <code>${esc(p.role)}</code></p>`)
  if (p.apg_url) {
    parts.push(`<p><a href="${esc(p.apg_url)}" rel="noreferrer">APG: ${esc(p.apg_url)}</a></p>`)
  }
  parts.push(`</header>`)

  if (p.apg_about) {
    parts.push(`<section><h2>About</h2><p>${esc(p.apg_about).replace(/\n/g, '<br>')}</p></section>`)
  }

  if (p.aria_roles?.length) {
    parts.push(`<section><h2>ARIA roles</h2>`)
    parts.push(`<p>This pattern uses ${p.aria_roles.length === 1 ? 'role' : 'roles'} ${joinHtml(p.aria_roles.map((r) => `<code>${esc(r)}</code>`))}.</p>`)
    parts.push(`</section>`)
  }

  if (p.aria_contract && Object.keys(p.aria_contract).length > 0) {
    parts.push(`<section><h2>ARIA contract <span class="provenance-tag">from aria-query</span></h2>`)
    for (const [role, c] of Object.entries(p.aria_contract)) {
      parts.push(`<details open><summary><code>${esc(role)}</code></summary>`)
      parts.push(`<dl class="contract">`)
      parts.push(`<dt>Accessible name required</dt><dd>${c.accessible_name_required ? 'Yes' : 'No'}</dd>`)
      parts.push(`<dt>Name from</dt><dd>${join(c.name_from || [])}</dd>`)
      if (c.required_props?.length) {
        parts.push(`<dt>Required properties</dt><dd>${joinHtml(c.required_props.map((x) => `<code>${esc(x)}</code>`))}</dd>`)
      }
      if (c.supported_props?.length) {
        parts.push(`<dt>Supported properties</dt><dd>${joinHtml(c.supported_props.map((x) => `<code>${esc(x)}</code>`))}</dd>`)
      }
      parts.push(`<dt>Spec</dt><dd><a href="${esc(c.spec_url)}" rel="noreferrer">${esc(c.spec_url)}</a></dd>`)
      parts.push(`</dl></details>`)
    }
    parts.push(`</section>`)
  }

  if (p.keyboard_interactions?.length) {
    parts.push(`<section><h2>Keyboard interactions <span class="provenance-tag">from APG</span></h2>`)
    parts.push(`<table class="kbd-table"><thead><tr><th>Key</th><th>Action</th></tr></thead><tbody>`)
    for (const k of p.keyboard_interactions) {
      parts.push(`<tr><td><code>${esc(k.key)}</code></td><td>${esc(k.description)}</td></tr>`)
    }
    parts.push(`</tbody></table></section>`)
  }

  if (p.wcag_applicable?.length) {
    parts.push(`<section><h2>Applicable WCAG Success Criteria</h2><ul class="sc-list">`)
    for (const sc of p.wcag_applicable) {
      parts.push(`<li><a href="${rootHref}/wcag/${esc(sc.id)}.html"><code>${esc(sc.id)}</code> ${esc(sc.title)}</a> · <span class="level">${esc(sc.level)}</span></li>`)
    }
    parts.push(`</ul></section>`)
  }

  if (p.act_rules_applicable?.length) {
    parts.push(`<section><h2>Applicable ACT rules</h2><ul class="act-list">`)
    for (const r of p.act_rules_applicable) {
      parts.push(`<li><a href="${rootHref}/act/${esc(r.id)}.html"><code>${esc(r.id)}</code> ${esc(r.name)}</a>`)
      if (r.wcag_sc_ids?.length) parts.push(` <span class="level">SCs ${join(r.wcag_sc_ids)}</span>`)
      parts.push(`</li>`)
    }
    parts.push(`</ul></section>`)
  }

  if (p.web_elements?.length || p.rn_primitive) {
    parts.push(`<section><h2>Platform binding</h2>`)
    if (p.web_elements?.length) {
      parts.push(`<h3>Native HTML elements <span class="provenance-tag">from aria-query</span></h3>`)
      parts.push(`<p>Elements that natively carry one of this pattern's ARIA roles. Using these gives you the role for free — no <code>role="…"</code> attribute needed.</p>`)
      parts.push(`<ul class="element-list">`)
      for (const el of p.web_elements) {
        const constraintsNote = el.constraints.length
          ? ` · <span class="hint">${joinHtml(el.constraints.map((c) => esc(c)))}</span>`
          : ''
        parts.push(
          `<li><code>&lt;${esc(el.canonical_id)}&gt;</code> · implicit role <code>${esc(el.implicit_role)}</code>${constraintsNote}</li>`,
        )
      }
      parts.push(`</ul>`)
    }
    if (p.rn_primitive) {
      parts.push(`<h3>React Native primitive</h3><dl class="contract">`)
      parts.push(`<dt>RN component</dt><dd><code>&lt;${esc(p.rn_primitive.rn_component)}&gt;</code></dd>`)
      parts.push(`<dt>RN docs</dt><dd><a href="${esc(p.rn_primitive.rn_doc_url)}" rel="noreferrer">${esc(p.rn_primitive.rn_doc_url)}</a></dd>`)
      parts.push(`</dl>`)
    }
    parts.push(`</section>`)
  }

  // Agent-view JSON
  parts.push(`<section class="agent-view"><h2>What the agent receives</h2>`)
  parts.push(`<p class="hint">Calling <code>get_a11y_pattern("${esc(p.role)}", "${esc(p.platform)}")</code> over MCP returns this exact JSON:</p>`)
  parts.push(`<pre id="agent-json"><code>${jsonPretty(p)}</code></pre>`)
  parts.push(`</section>`)

  parts.push(`<footer class="card-footer"><dl class="provenance">`)
  parts.push(`<dt>apg-query</dt><dd>${esc(p.provenance.apg_query?.date ?? 'n/a')}</dd>`)
  parts.push(`<dt>wcag-query</dt><dd>WCAG ${esc(p.provenance.wcag_query.version)} @ ${esc(p.provenance.wcag_query.date)}</dd>`)
  parts.push(`<dt>act-rules-query</dt><dd>${esc(p.provenance.act_rules_query.upstream_commit.slice(0, 7))} @ ${esc(p.provenance.act_rules_query.date)}</dd>`)
  parts.push(`</dl></footer>`)

  parts.push(`</article>`)
  return parts.join('\n')
}

export function renderPatternPage(p: A11yPattern, rootHref: string): string {
  return baseLayout({
    title: `${p.name} (${p.platform})`,
    description: `Accessibility pattern for ${p.role} on ${p.platform} — sourced from APG, WCAG, ACT, and aria-query.`,
    rootHref,
    bodyClass: 'page-pattern',
    content: patternBody(p, rootHref),
  })
}
