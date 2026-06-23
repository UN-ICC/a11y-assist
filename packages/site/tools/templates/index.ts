import type { APGSnapshot } from 'apg-query'
import type { WCAGSnapshot } from 'wcag-query'
import type { ACTSnapshot } from 'act-rules-query'
import { baseLayout, esc } from '../render.js'

export interface IndexData {
  patterns: { role: string; name: string; type: 'apg_pattern' | 'html_native' | 'rn_primitive' }[]
  scs: { id: string; level: 'A' | 'AA' | 'AAA'; title: string }[]
  acts: { id: string; name: string; wcag_sc_ids: string[] }[]
  apg_snapshot: APGSnapshot
  wcag_snapshot: WCAGSnapshot
  act_snapshot: ACTSnapshot
}

function indexBody(data: IndexData): string {
  const parts: string[] = []

  parts.push(`<section class="hero">`)
  parts.push(`<p class="hero-tagline">accessibility for the prowler</p>`)
  parts.push(`<p class="hero-blurb">Humans browse, agents query — same data, every claim sourced. ` +
    `<a href="provenance.html">See provenance</a>.</p>`)
  parts.push(`<input type="search" id="filter" placeholder="Filter patterns, SCs, rules…" aria-label="Filter">`)
  parts.push(`</section>`)

  parts.push(`<section class="counts">`)
  parts.push(`<a class="count-card" href="#patterns"><h2>${data.patterns.length}</h2><p>Patterns</p></a>`)
  parts.push(`<a class="count-card" href="#wcag"><h2>${data.scs.length}</h2><p>WCAG SCs</p></a>`)
  parts.push(`<a class="count-card" href="#act"><h2>${data.acts.length}</h2><p>ACT rules</p></a>`)
  parts.push(`</section>`)

  parts.push(`<section id="patterns"><h2>Patterns</h2><ul class="pattern-list">`)
  for (const p of data.patterns) {
    const platform = p.type === 'rn_primitive' ? 'react-native' : 'web'
    parts.push(`<li data-search="${esc(p.role)} ${esc(p.name)}"><a href="pattern/${esc(p.role)}-${platform}.html"><code>${esc(p.role)}</code> ${esc(p.name)}</a> <span class="badge">${esc(p.type.replace('_', ' '))}</span></li>`)
  }
  parts.push(`</ul></section>`)

  parts.push(`<section id="wcag"><h2>WCAG 2.2 Success Criteria</h2><ul class="sc-list">`)
  for (const sc of data.scs) {
    parts.push(`<li data-search="${esc(sc.id)} ${esc(sc.title)}"><a href="wcag/${esc(sc.id)}.html"><code>${esc(sc.id)}</code> ${esc(sc.title)}</a> <span class="level">${esc(sc.level)}</span></li>`)
  }
  parts.push(`</ul></section>`)

  parts.push(`<section id="act"><h2>ACT Rules</h2><ul class="act-list">`)
  for (const r of data.acts) {
    parts.push(`<li data-search="${esc(r.id)} ${esc(r.name)}"><a href="act/${esc(r.id)}.html"><code>${esc(r.id)}</code> ${esc(r.name)}</a>`)
    if (r.wcag_sc_ids.length) parts.push(` <span class="level">SCs ${r.wcag_sc_ids.map(esc).join(', ')}</span>`)
    parts.push(`</li>`)
  }
  parts.push(`</ul></section>`)

  parts.push(`<script>
    (function () {
      var input = document.getElementById('filter')
      if (!input) return
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase()
        document.querySelectorAll('[data-search]').forEach(function (el) {
          var hit = !q || el.getAttribute('data-search').toLowerCase().indexOf(q) >= 0
          el.style.display = hit ? '' : 'none'
        })
      })
    })()
  </script>`)

  return parts.join('\n')
}

export function renderIndexPage(data: IndexData): string {
  return baseLayout({
    title: 'Index',
    description: 'a11ycat — browse W3C accessibility patterns, WCAG criteria, and ACT rules. Same dataset the MCP server serves to AI agents.',
    rootHref: '.',
    bodyClass: 'page-index',
    content: indexBody(data),
  })
}
