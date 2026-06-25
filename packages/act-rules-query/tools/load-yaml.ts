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
import type { ACTRule, ACTExample, ACTSnapshot } from '../src/types.js'

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

/** Text under the first '##'/'###' heading matching `pattern`, until the next heading of any level. */
function extractSection(body: string, pattern: string): string {
  const re = new RegExp(`^#{2,3}\\s+${pattern}\\b[^\\n]*\\n`, 'm')
  const m = re.exec(body)
  if (!m) return ''
  const rest = body.slice(m.index + m[0].length)
  const next = rest.search(/^#{2,3}\s/m)
  return (next === -1 ? rest : rest.slice(0, next)).trim()
}

/** Every '## Expectation[ N]' section's text. */
function extractExpectations(body: string): string[] {
  const out: string[] = []
  const re = /^##\s+Expectation\b[^\n]*\n/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    const rest = body.slice(m.index + m[0].length)
    const next = rest.search(/^#{2,3}\s/m)
    const text = (next === -1 ? rest : rest.slice(0, next)).trim()
    if (text) out.push(text)
  }
  return out
}

/** Parse the '## Examples' section into worked examples grouped by outcome. */
function extractExamples(body: string): ACTExample[] {
  const head = /^##\s+Examples\b[^\n]*\n/m.exec(body)
  if (!head) return []
  let block = body.slice(head.index + head[0].length)
  const nextH2 = block.search(/^##\s/m)
  if (nextH2 !== -1) block = block.slice(0, nextH2)

  const out: ACTExample[] = []
  let category: ACTExample['category'] | '' = ''
  let cur: { name: string; lines: string[] } | null = null
  const flush = () => {
    if (!cur || !category) { cur = null; return }
    const text = cur.lines.join('\n')
    const code = text.match(/```[a-z]*\n([\s\S]*?)```/)
    out.push({
      category,
      name: cur.name,
      description: (code ? text.slice(0, text.indexOf(code[0])) : text).replace(/\s+/g, ' ').trim(),
      code: code ? code[1].trim() : '',
    })
    cur = null
  }
  for (const line of block.split('\n')) {
    const h3 = line.match(/^###\s+(Passed|Failed|Inapplicable)\b/)
    if (h3) { flush(); category = h3[1].toLowerCase() as ACTExample['category']; continue }
    const h4 = line.match(/^####\s+(.*)$/)
    if (h4) { flush(); cur = { name: h4[1].trim(), lines: [] }; continue }
    if (cur) cur.lines.push(line)
  }
  flush()
  return out
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
  const body = parsed.content

  return {
    id: fm.id,
    name: fm.name,
    rule_type: fm.rule_type ?? 'atomic',
    description: (fm.description ?? '').trim(),
    wcag_sc_ids: wcag.primary,
    wcag_sc_ids_secondary: wcag.secondary,
    input_aspects: fm.input_aspects ?? [],
    applicability_text: extractApplicability(body),
    expectations: extractExpectations(body),
    examples: extractExamples(body),
    background: extractSection(body, 'Background'),
    assumptions: extractSection(body, 'Assumptions'),
    accessibility_support: extractSection(body, 'Accessibility Support'),
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

  // Snapshot metadata. The date + commit identify the *snapshot* (set when the
  // .md files were synced), so a pure re-parse must preserve them — only a fresh
  // capture (git available) updates the commit. Always refresh rule_count.
  let prev: Partial<ACTSnapshot> = {}
  try { prev = JSON.parse(readFileSync(resolve(DATA_DIR, '_snapshot.json'), 'utf8')) } catch { /* none yet */ }
  const captured = captureUpstreamCommit()
  const snapshot: ACTSnapshot = {
    date: prev.date ?? new Date().toISOString().slice(0, 10),
    upstream_commit: captured !== 'unknown' ? captured : (prev.upstream_commit ?? 'unknown'),
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
