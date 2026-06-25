/**
 * Builds the prototype into ONE self-contained file: packages/web/dist/index.html.
 * Inlines the dataset (composed from a11y-assist-core + the query packages), the app
 * JS, the CSS, and axe-core — so the file works offline by double-click.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

import { composeApgPattern, composeAriaRole, listApgPatterns, applicability } from 'a11y-assist-core'
import { successCriteria, getTechnique, getFailure } from 'wcag-query'
import { rules as actRules } from 'act-rules-query'
import { roles as ariaRoles } from 'aria-query'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const APP = resolve(ROOT, 'app')

// --- dataset (all mechanical, composed once) ---
const apg = listApgPatterns()
  .map((n) => composeApgPattern(n))
  .filter((c): c is NonNullable<typeof c> => Boolean(c))

// Primitives = ARIA roles that have at least one native HTML element.
const seenRole = new Set<string>()
const primitives: NonNullable<ReturnType<typeof composeAriaRole>>[] = []
for (const role of ariaRoles.keys()) {
  const c = composeAriaRole(String(role))
  if (c && c.native_elements.length > 0 && !seenRole.has(c.role)) {
    seenRole.add(c.role)
    primitives.push(c)
  }
}
primitives.sort((a, b) => a.role.localeCompare(b.role))

const scs: Record<string, unknown> = {}
for (const [id, sc] of successCriteria) {
  scs[id] = {
    ...sc,
    techniques: sc.technique_ids.map((t) => getTechnique(t)).filter(Boolean),
    failures: sc.failure_ids.map((f) => getFailure(f)).filter(Boolean),
  }
}

const act = [...actRules.values()].map((r) => ({
  id: r.id,
  name: r.name,
  wcag_sc_ids: r.wcag_sc_ids,
  url: r.url,
  applicability_text: r.applicability_text,
}))

// --- applicability engine (experimental): precompute each component's `auto`
// predicate truth here (server-side, via core), inline the facet tree +
// expressions + definitions; the browser runs only a tiny evaluator. ---
const LEVELS = ['A', 'AA', 'AAA'] as const
for (const c of [...apg, ...primitives]) {
  const facts = applicability.factsFromComposition(c)
  const auto = applicability.deriveAuto(facts)
  const rec = c as unknown as Record<string, unknown>
  rec.auto_applicability = Object.keys(auto).filter((k) => auto[k as keyof typeof auto]) // for the walkthrough
  const guidance: Record<string, unknown> = {}
  for (const lv of LEVELS) {
    const g = applicability.structuralGuidance(facts, lv)
    guidance[lv] = {
      floor: g.floor,
      contentDependent: g.contentDependent.length,
      checklist: { axe: g.checklist.axe, agent: g.checklist.agent, human: g.checklist.human },
    }
  }
  rec.guidance = guidance // precomputed structural guidance per level (input-free)
}

const applData = {
  facets: applicability.FACETS,
  exprs: applicability.APPL_EXPR,
  def: Object.fromEntries(
    Object.entries(applicability.APPL_META).map(([k, v]) => [k, v.definition]),
  ),
  verifExprs: applicability.VERIF_EXPR,
  verifMeta: Object.fromEntries(
    Object.entries(applicability.VERIF_META).map(([k, v]) => [k, { tier: v.tier, definition: v.definition, axeRules: v.axeRules }]),
  ),
}

const DATA = { apg, primitives, scs, act, applicability: applData }

// --- assemble single file ---
const axeMin = readFileSync(resolve(dirname(require.resolve('axe-core')), 'axe.min.js'), 'utf8')
const css = readFileSync(resolve(APP, 'styles.css'), 'utf8')
const appJs = readFileSync(resolve(APP, 'app.js'), 'utf8')
// Escape '<' so no string in the data can break out of the <script> tag.
const dataJson = JSON.stringify(DATA).replace(/</g, '\\u003c')

let html = readFileSync(resolve(APP, 'template.html'), 'utf8')
html = html
  .replace('/*__CSS__*/', () => css)
  .replace('__DATA__', () => dataJson)
  .replace('/*__AXE__*/', () => axeMin)
  .replace('/*__APP__*/', () => appJs)

mkdirSync(resolve(ROOT, 'dist'), { recursive: true })
writeFileSync(resolve(ROOT, 'dist', 'index.html'), html)
console.error(
  `[web] wrote dist/index.html — ${(html.length / 1024 / 1024).toFixed(2)} MB ` +
  `(${apg.length} APG, ${primitives.length} primitives, ${Object.keys(scs).length} SCs, ${act.length} ACT rules)`,
)
