/**
 * Build script for a11ycat — turns the consolidated a11y dataset into a
 * static GitHub Pages site. Same data the MCP server serves to agents.
 *
 * Pipeline:
 *   1. Discover roles via aggregator's role-bindings (and apg-query patterns).
 *   2. For each role × platform: loadPattern → render pattern.html.
 *   3. For each WCAG SC: expand techniques + failures + backlinks → render sc.html.
 *   4. For each ACT rule: expand backlinks → render act.html.
 *   5. Render landing index + provenance pages.
 *   6. Copy assets.
 *
 * No drift: the pattern pages render the exact JSON returned by `loadPattern`.
 * The audit-button bundle imports `wrapAuditResponse` from a11y-core — the
 * same function the MCP audit_html tool uses.
 */

import { copyFileSync, mkdirSync, readdirSync, writeFileSync, statSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadPattern, listPatterns, type A11yPattern } from 'a11y-core'
import { listPatterns as listAPGPatterns } from 'apg-query'
import { successCriteria, getTechnique, getFailure, WCAG_SNAPSHOT } from 'wcag-query'
import { rules as actRules, ACT_SNAPSHOT } from 'act-rules-query'
import { APG_SNAPSHOT } from 'apg-query'
import { patternsReferencingSC, patternsReferencingACT, coverageSummary } from './derive.js'

import { renderPatternPage } from './templates/pattern.js'
import { renderSCPage, type SCExpansion } from './templates/sc.js'
import { renderACTPage, type ACTExpansion } from './templates/act.js'
import { renderIndexPage, type IndexData } from './templates/index.js'
import { renderProvenancePage } from './templates/provenance.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SITE_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(SITE_ROOT, '../..')
const DOCS = resolve(REPO_ROOT, 'docs')
const ASSETS_SRC = resolve(SITE_ROOT, 'assets')
const ASSETS_DST = resolve(DOCS, 'assets')

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

/** Enumerate all roles to render. Union of APG patterns + role-bindings keys. */
function allRoles(): string[] {
  const fromAPG = listAPGPatterns()
  // listPatterns from a11y-core returns { apg_patterns, primitives } per platform
  const webBindings = listPatterns('web')
  const rnBindings = listPatterns('react-native')
  const all = new Set([
    ...fromAPG,
    ...webBindings.apg_patterns,
    ...webBindings.primitives,
    ...rnBindings.primitives,
  ])
  return Array.from(all).sort()
}

async function main() {
  // Clean previous build
  if (existsSync(DOCS)) rmSync(DOCS, { recursive: true, force: true })
  mkdirSync(DOCS, { recursive: true })

  // Load every pattern × platform combination
  const allLoadedPatterns: A11yPattern[] = []
  const indexPatterns: IndexData['patterns'] = []

  for (const role of allRoles()) {
    for (const platform of ['web', 'react-native'] as const) {
      const pattern = loadPattern(role, platform)
      if (!pattern) continue
      const filename = `${role}-${platform}.html`
      write(resolve(DOCS, 'pattern', filename), renderPatternPage(pattern, '..'))
      allLoadedPatterns.push(pattern)
      // Index entry — only add the canonical (web) variant to avoid duplicates
      if (platform === 'web' || pattern.type === 'rn_primitive') {
        indexPatterns.push({
          role: pattern.role,
          name: pattern.name,
          type: pattern.type,
        })
      }
    }
  }
  console.error(`[a11ycat] wrote ${allLoadedPatterns.length} pattern pages`)

  // WCAG SC pages
  const indexSCs: IndexData['scs'] = []
  for (const [id, sc] of successCriteria) {
    const expansion: SCExpansion = {
      ...sc,
      techniques: sc.technique_ids.map((tid) => getTechnique(tid)).filter((t): t is NonNullable<typeof t> => Boolean(t)),
      failures: sc.failure_ids.map((fid) => getFailure(fid)).filter((f): f is NonNullable<typeof f> => Boolean(f)),
      patterns_referencing: patternsReferencingSC(id),
    }
    write(resolve(DOCS, 'wcag', `${id}.html`), renderSCPage(expansion, '..'))
    indexSCs.push({ id: sc.id, level: sc.level, title: sc.title })
  }
  console.error(`[a11ycat] wrote ${indexSCs.length} WCAG SC pages`)

  // ACT rule pages
  const indexACTs: IndexData['acts'] = []
  for (const [id, rule] of actRules) {
    const expansion: ACTExpansion = {
      ...rule,
      patterns_referencing: patternsReferencingACT(id),
    }
    write(resolve(DOCS, 'act', `${id}.html`), renderACTPage(expansion, '..'))
    indexACTs.push({ id: rule.id, name: rule.name, wcag_sc_ids: rule.wcag_sc_ids })
  }
  console.error(`[a11ycat] wrote ${indexACTs.length} ACT rule pages`)

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

  // A consolidated data.json for any client-side tooling
  write(resolve(DOCS, 'data.json'), JSON.stringify(indexData, null, 2))

  // Copy assets
  copyDir(ASSETS_SRC, ASSETS_DST)

  console.error(`[a11ycat] build complete → ${relative(REPO_ROOT, DOCS)}/`)
}

main().catch((err) => {
  console.error('[a11ycat] build failed:', err)
  process.exit(1)
})
