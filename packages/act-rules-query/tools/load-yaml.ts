/**
 * ACT rules loader.
 *
 * Walks snapshots/_rules/*.md, parses YAML front-matter via gray-matter,
 * extracts the structured fields we expose (id, name, WCAG mapping,
 * applicability text), and writes per-rule JSON to src/data/.
 *
 * No HTML scraping. No network. Operates on committed .md files.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import matter from 'gray-matter'
import type { ACTRule, ACTSnapshot } from '../src/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SNAPSHOT_DIR = resolve(ROOT, 'snapshots/_rules')
const DATA_DIR = resolve(ROOT, 'src/data')

const ACT_BASE_URL = 'https://act-rules.github.io/rules'
const UPSTREAM_REMOTE_DEFAULT = 'https://github.com/act-rules/act-rules.github.io'

interface AccessibilityReqValue {
  forConformance?: boolean
  secondary?: string
  failed?: string
  passed?: string
  inapplicable?: string
}

interface FrontMatter {
  id?: string
  name?: string
  rule_type?: 'atomic' | 'composite'
  description?: string
  accessibility_requirements?: Record<string, AccessibilityReqValue | undefined>
  input_aspects?: string[]
}

/**
 * Filter accessibility_requirements to WCAG SC IDs and split by primary vs
 * secondary. Keys look like 'wcag20:4.1.2', 'wcag21:2.4.7', or
 * 'wcag-technique:ARIA5'. We accept wcagXX: prefixes only and strip them.
 */
function extractWCAGRefs(req?: Record<string, AccessibilityReqValue | undefined>): {
  primary: string[]
  secondary: string[]
} {
  const primary: string[] = []
  const secondary: string[] = []
  if (!req) return { primary, secondary }

  for (const [key, value] of Object.entries(req)) {
    const m = key.match(/^wcag\d{2}:(\d+\.\d+\.\d+)$/)
    if (!m) continue
    const scId = m[1]
    if (value?.forConformance === true) {
      primary.push(scId)
    } else if (value?.secondary) {
      secondary.push(scId)
    }
  }
  return {
    primary: Array.from(new Set(primary)).sort(),
    secondary: Array.from(new Set(secondary)).sort(),
  }
}

/** Extract the verbatim text under '## Applicability' until the next H2. */
function extractApplicability(body: string): string {
  // Match from "## Applicability" through to the next "## " heading or end.
  const m = body.match(/^##\s+Applicability\b\s*\n([\s\S]*?)(?=^##\s|\Z)/m)
  if (!m) return ''
  return m[1].trim()
}

function loadRule(filePath: string): ACTRule | null {
  const raw = readFileSync(filePath, 'utf8')
  const parsed = matter(raw)
  const fm = parsed.data as FrontMatter

  if (!fm.id || !fm.name) {
    console.error(`[act-rules-query] WARN: ${basename(filePath)} missing id/name; skipping`)
    return null
  }

  const wcag = extractWCAGRefs(fm.accessibility_requirements)
  const applicability_text = extractApplicability(parsed.content)

  return {
    id: fm.id,
    name: fm.name,
    rule_type: fm.rule_type ?? 'atomic',
    description: (fm.description ?? '').trim(),
    wcag_sc_ids: wcag.primary,
    wcag_sc_ids_secondary: wcag.secondary,
    input_aspects: fm.input_aspects ?? [],
    applicability_text,
    url: `${ACT_BASE_URL}/${fm.id}`,
  }
}

function captureUpstreamCommit(): string {
  // Best-effort: if the repo cloned to /tmp/act-rules is still present, read its HEAD.
  // Otherwise fall back to "unknown" — the maintainer can backfill via _snapshot.json.
  try {
    return execSync('git -C /tmp/act-rules rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

async function main() {
  if (!existsSync(SNAPSHOT_DIR)) {
    throw new Error(`Snapshot dir missing: ${SNAPSHOT_DIR}. Run sync-upstream first.`)
  }
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

  const files = readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith('.md'))
  const rules: ACTRule[] = []

  for (const f of files) {
    const r = loadRule(resolve(SNAPSHOT_DIR, f))
    if (r) rules.push(r)
  }

  // Write per-rule JSON files keyed by id (not filename, since filenames are
  // <slug>-<id>.md and we want id-based lookup).
  for (const r of rules) {
    writeFileSync(
      resolve(DATA_DIR, `${r.id}.json`),
      JSON.stringify(r, null, 2) + '\n',
    )
  }

  // Manifest of rule IDs for the package's index.ts to consume.
  const manifest = { ids: rules.map((r) => r.id).sort() }
  writeFileSync(
    resolve(DATA_DIR, '_manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )

  // Snapshot metadata.
  const snapshot: ACTSnapshot = {
    date: new Date().toISOString().slice(0, 10),
    upstream_commit: captureUpstreamCommit(),
    rule_count: rules.length,
  }
  writeFileSync(
    resolve(DATA_DIR, '_snapshot.json'),
    JSON.stringify(snapshot, null, 2) + '\n',
  )

  // Light validation summary.
  const withWCAG = rules.filter((r) => r.wcag_sc_ids.length > 0).length
  const noWCAG = rules.length - withWCAG
  console.error(
    `[act-rules-query] loaded ${rules.length} rules ` +
    `(${withWCAG} with primary WCAG mapping, ${noWCAG} without — typically ARIA-spec-only)`,
  )
}

main().catch((err) => {
  console.error('[act-rules-query] load failed:', err)
  process.exit(1)
})
