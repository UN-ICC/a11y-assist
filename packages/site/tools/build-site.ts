/**
 * Build script for a11y-assist — turns the consolidated a11y dataset into a
 * static GitHub Pages site. Same data, and the same compose functions, the MCP
 * server serves to agents.
 *
 * Pipeline:
 *   1. For each APG pattern: composeApgPattern → render pattern.html, with the
 *      related ACT rules reached from its suggested queries (build-time hop).
 *   2. For each WCAG SC: expand techniques + failures + the ACT rules covering
 *      it (mechanical, front-matter) → render sc.html.
 *   3. For each ACT rule: render act.html.
 *   4. Render landing index + provenance pages.
 *   5. Copy assets.
 *
 * No editorial assertions: pattern pages render exactly what composeApgPattern
 * returns; the only cross-corpus link is ACT rule → WCAG SC.
 */

import { copyFileSync, mkdirSync, readdirSync, writeFileSync, statSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { composeApgPattern, listApgPatterns, type WCAGLevel } from 'a11y-core'
import { APG_SNAPSHOT } from 'apg-query'
import { successCriteria, getTechnique, getFailure, WCAG_SNAPSHOT } from 'wcag-query'
import { rules as actRules, rulesByWCAG, ACT_SNAPSHOT } from 'act-rules-query'

import { renderPatternPage } from './templates/pattern.js'
import { renderSCPage, type SCExpansion } from './templates/sc.js'
import { renderACTPage } from './templates/act.js'
import { renderIndexPage, type IndexData } from './templates/index.js'
import { renderProvenancePage } from './templates/provenance.js'
import { relatedActRules, coverageSummary } from './derive.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SITE_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(SITE_ROOT, '../..')
const DOCS = resolve(REPO_ROOT, 'docs')
const ASSETS_SRC = resolve(SITE_ROOT, 'assets')
const ASSETS_DST = resolve(DOCS, 'assets')

const LEVEL: WCAGLevel = 'AA'

function write(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function copyDir(src: string, dst: string) {
  if (!existsSync(src)) return
  mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src)) {
    const s = resolve(src, entry)
    const d = resolve(dst, entry)
    if (statSync(s).isDirectory()) copyDir(s, d)
    else copyFileSync(s, d)
  }
}

async function main() {
  if (existsSync(DOCS)) rmSync(DOCS, { recursive: true, force: true })
  mkdirSync(DOCS, { recursive: true })

  // APG pattern pages
  const indexPatterns: IndexData['patterns'] = []
  for (const name of listApgPatterns()) {
    const composed = composeApgPattern(name, LEVEL)
    if (!composed) continue
    const related_act = relatedActRules(composed.suggested_queries, LEVEL)
    write(resolve(DOCS, 'pattern', `${composed.role}.html`), renderPatternPage({ composed, related_act }, '..'))
    indexPatterns.push({ role: composed.role, name: composed.apg.name })
  }
  console.error(`[a11y-assist] wrote ${indexPatterns.length} pattern pages`)

  // WCAG SC pages
  const indexSCs: IndexData['scs'] = []
  for (const [id, sc] of successCriteria) {
    const expansion: SCExpansion = {
      ...sc,
      techniques: sc.technique_ids.map((tid) => getTechnique(tid)).filter((t): t is NonNullable<typeof t> => Boolean(t)),
      failures: sc.failure_ids.map((fid) => getFailure(fid)).filter((f): f is NonNullable<typeof f> => Boolean(f)),
      act_rules_covering: rulesByWCAG(id).map((r) => ({ id: r.id, name: r.name })),
    }
    write(resolve(DOCS, 'wcag', `${id}.html`), renderSCPage(expansion, '..'))
    indexSCs.push({ id: sc.id, level: sc.level, title: sc.title })
  }
  console.error(`[a11y-assist] wrote ${indexSCs.length} WCAG SC pages`)

  // ACT rule pages
  const indexACTs: IndexData['acts'] = []
  for (const [, rule] of actRules) {
    write(resolve(DOCS, 'act', `${rule.id}.html`), renderACTPage(rule, '..'))
    indexACTs.push({ id: rule.id, name: rule.name, wcag_sc_ids: rule.wcag_sc_ids })
  }
  console.error(`[a11y-assist] wrote ${indexACTs.length} ACT rule pages`)

  // Index + provenance
  const indexData: IndexData = {
    patterns: indexPatterns.sort((a, b) => a.role.localeCompare(b.role)),
    scs: indexSCs.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
    acts: indexACTs.sort((a, b) => a.id.localeCompare(b.id)),
    apg_snapshot: APG_SNAPSHOT,
    wcag_snapshot: WCAG_SNAPSHOT,
    act_snapshot: ACT_SNAPSHOT,
  }
  write(resolve(DOCS, 'index.html'), renderIndexPage(indexData))
  write(resolve(DOCS, 'provenance.html'), renderProvenancePage({
    apg: APG_SNAPSHOT,
    wcag: WCAG_SNAPSHOT,
    act: ACT_SNAPSHOT,
    coverage: coverageSummary(),
  }))

  write(resolve(DOCS, 'data.json'), JSON.stringify(indexData, null, 2))

  copyDir(ASSETS_SRC, ASSETS_DST)

  console.error(`[a11y-assist] build complete → ${relative(REPO_ROOT, DOCS)}/`)
}

main().catch((err) => {
  console.error('[a11y-assist] build failed:', err)
  process.exit(1)
})
