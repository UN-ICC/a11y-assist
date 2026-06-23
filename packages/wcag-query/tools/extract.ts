/**
 * WCAG 2.2 extractor.
 *
 * Fetches each Understanding page (one per Success Criterion), snapshots it,
 * and extracts:
 *   - SC ID, level, title, short_text
 *   - sufficient techniques (G, H, ARIA, C, SCR codes)
 *   - failures (F codes)
 *
 * All technique / failure IDs and titles are kept verbatim and link back to
 * their canonical W3C URLs. Run via `npm run extract`.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import type {
  SuccessCriterion,
  Technique,
  WCAGSnapshot,
} from '../src/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SNAPSHOT_DIR = resolve(ROOT, 'snapshots')
const DATA_DIR = resolve(ROOT, 'src/data')

const UNDERSTANDING_BASE = 'https://www.w3.org/WAI/WCAG22/Understanding'

/**
 * Full WCAG 2.2 A + AA + AAA. SC 4.1.1 (Parsing) is deprecated in 2.2 and
 * intentionally omitted.
 */
const SCS: { id: string; slug: string; level: 'A' | 'AA' | 'AAA' }[] = [
  // ─── Perceivable ─────────────────────────────────────────────────
  { id: '1.1.1',  slug: 'non-text-content',                                level: 'A'   },
  { id: '1.2.1',  slug: 'audio-only-and-video-only-prerecorded',           level: 'A'   },
  { id: '1.2.2',  slug: 'captions-prerecorded',                            level: 'A'   },
  { id: '1.2.3',  slug: 'audio-description-or-media-alternative-prerecorded', level: 'A' },
  { id: '1.2.4',  slug: 'captions-live',                                   level: 'AA'  },
  { id: '1.2.5',  slug: 'audio-description-prerecorded',                   level: 'AA'  },
  { id: '1.2.6',  slug: 'sign-language-prerecorded',                       level: 'AAA' },
  { id: '1.2.7',  slug: 'extended-audio-description-prerecorded',          level: 'AAA' },
  { id: '1.2.8',  slug: 'media-alternative-prerecorded',                   level: 'AAA' },
  { id: '1.2.9',  slug: 'audio-only-live',                                 level: 'AAA' },
  { id: '1.3.1',  slug: 'info-and-relationships',                          level: 'A'   },
  { id: '1.3.2',  slug: 'meaningful-sequence',                             level: 'A'   },
  { id: '1.3.3',  slug: 'sensory-characteristics',                         level: 'A'   },
  { id: '1.3.4',  slug: 'orientation',                                     level: 'AA'  },
  { id: '1.3.5',  slug: 'identify-input-purpose',                          level: 'AA'  },
  { id: '1.3.6',  slug: 'identify-purpose',                                level: 'AAA' },
  { id: '1.4.1',  slug: 'use-of-color',                                    level: 'A'   },
  { id: '1.4.2',  slug: 'audio-control',                                   level: 'A'   },
  { id: '1.4.3',  slug: 'contrast-minimum',                                level: 'AA'  },
  { id: '1.4.4',  slug: 'resize-text',                                     level: 'AA'  },
  { id: '1.4.5',  slug: 'images-of-text',                                  level: 'AA'  },
  { id: '1.4.6',  slug: 'contrast-enhanced',                               level: 'AAA' },
  { id: '1.4.7',  slug: 'low-or-no-background-audio',                      level: 'AAA' },
  { id: '1.4.8',  slug: 'visual-presentation',                             level: 'AAA' },
  { id: '1.4.9',  slug: 'images-of-text-no-exception',                     level: 'AAA' },
  { id: '1.4.10', slug: 'reflow',                                          level: 'AA'  },
  { id: '1.4.11', slug: 'non-text-contrast',                               level: 'AA'  },
  { id: '1.4.12', slug: 'text-spacing',                                    level: 'AA'  },
  { id: '1.4.13', slug: 'content-on-hover-or-focus',                       level: 'AA'  },
  // ─── Operable ────────────────────────────────────────────────────
  { id: '2.1.1',  slug: 'keyboard',                                        level: 'A'   },
  { id: '2.1.2',  slug: 'no-keyboard-trap',                                level: 'A'   },
  { id: '2.1.3',  slug: 'keyboard-no-exception',                           level: 'AAA' },
  { id: '2.1.4',  slug: 'character-key-shortcuts',                         level: 'A'   },
  { id: '2.2.1',  slug: 'timing-adjustable',                               level: 'A'   },
  { id: '2.2.2',  slug: 'pause-stop-hide',                                 level: 'A'   },
  { id: '2.2.3',  slug: 'no-timing',                                       level: 'AAA' },
  { id: '2.2.4',  slug: 'interruptions',                                   level: 'AAA' },
  { id: '2.2.5',  slug: 're-authenticating',                               level: 'AAA' },
  { id: '2.2.6',  slug: 'timeouts',                                        level: 'AAA' },
  { id: '2.3.1',  slug: 'three-flashes-or-below-threshold',                level: 'A'   },
  { id: '2.3.2',  slug: 'three-flashes',                                   level: 'AAA' },
  { id: '2.3.3',  slug: 'animation-from-interactions',                     level: 'AAA' },
  { id: '2.4.1',  slug: 'bypass-blocks',                                   level: 'A'   },
  { id: '2.4.2',  slug: 'page-titled',                                     level: 'A'   },
  { id: '2.4.3',  slug: 'focus-order',                                     level: 'A'   },
  { id: '2.4.4',  slug: 'link-purpose-in-context',                         level: 'A'   },
  { id: '2.4.5',  slug: 'multiple-ways',                                   level: 'AA'  },
  { id: '2.4.6',  slug: 'headings-and-labels',                             level: 'AA'  },
  { id: '2.4.7',  slug: 'focus-visible',                                   level: 'AA'  },
  { id: '2.4.8',  slug: 'location',                                        level: 'AAA' },
  { id: '2.4.9',  slug: 'link-purpose-link-only',                          level: 'AAA' },
  { id: '2.4.10', slug: 'section-headings',                                level: 'AAA' },
  { id: '2.4.11', slug: 'focus-not-obscured-minimum',                      level: 'AA'  },
  { id: '2.4.12', slug: 'focus-not-obscured-enhanced',                     level: 'AAA' },
  { id: '2.4.13', slug: 'focus-appearance',                                level: 'AAA' },
  { id: '2.5.1',  slug: 'pointer-gestures',                                level: 'A'   },
  { id: '2.5.2',  slug: 'pointer-cancellation',                            level: 'A'   },
  { id: '2.5.3',  slug: 'label-in-name',                                   level: 'A'   },
  { id: '2.5.4',  slug: 'motion-actuation',                                level: 'A'   },
  { id: '2.5.5',  slug: 'target-size-enhanced',                            level: 'AAA' },
  { id: '2.5.6',  slug: 'concurrent-input-mechanisms',                     level: 'AAA' },
  { id: '2.5.7',  slug: 'dragging-movements',                              level: 'AA'  },
  { id: '2.5.8',  slug: 'target-size-minimum',                             level: 'AA'  },
  // ─── Understandable ──────────────────────────────────────────────
  { id: '3.1.1',  slug: 'language-of-page',                                level: 'A'   },
  { id: '3.1.2',  slug: 'language-of-parts',                               level: 'AA'  },
  { id: '3.1.3',  slug: 'unusual-words',                                   level: 'AAA' },
  { id: '3.1.4',  slug: 'abbreviations',                                   level: 'AAA' },
  { id: '3.1.5',  slug: 'reading-level',                                   level: 'AAA' },
  { id: '3.1.6',  slug: 'pronunciation',                                   level: 'AAA' },
  { id: '3.2.1',  slug: 'on-focus',                                        level: 'A'   },
  { id: '3.2.2',  slug: 'on-input',                                        level: 'A'   },
  { id: '3.2.3',  slug: 'consistent-navigation',                           level: 'AA'  },
  { id: '3.2.4',  slug: 'consistent-identification',                       level: 'AA'  },
  { id: '3.2.5',  slug: 'change-on-request',                               level: 'AAA' },
  { id: '3.2.6',  slug: 'consistent-help',                                 level: 'A'   },
  { id: '3.3.1',  slug: 'error-identification',                            level: 'A'   },
  { id: '3.3.2',  slug: 'labels-or-instructions',                          level: 'A'   },
  { id: '3.3.3',  slug: 'error-suggestion',                                level: 'AA'  },
  { id: '3.3.4',  slug: 'error-prevention-legal-financial-data',           level: 'AA'  },
  { id: '3.3.5',  slug: 'help',                                            level: 'AAA' },
  { id: '3.3.6',  slug: 'error-prevention-all',                            level: 'AAA' },
  { id: '3.3.7',  slug: 'redundant-entry',                                 level: 'A'   },
  { id: '3.3.8',  slug: 'accessible-authentication-minimum',               level: 'AA'  },
  { id: '3.3.9',  slug: 'accessible-authentication-enhanced',              level: 'AAA' },
  // ─── Robust ──────────────────────────────────────────────────────
  // Note: 4.1.1 Parsing is deprecated in WCAG 2.2 and intentionally omitted.
  { id: '4.1.2',  slug: 'name-role-value',                                 level: 'A'   },
  { id: '4.1.3',  slug: 'status-messages',                                 level: 'AA'  },
]

async function fetchSnapshot(slug: string): Promise<string> {
  const url = `${UNDERSTANDING_BASE}/${slug}`
  const snapshotPath = resolve(SNAPSHOT_DIR, `${slug}.html`)

  if (existsSync(snapshotPath) && !process.argv.includes('--refresh')) {
    return readFileSync(snapshotPath, 'utf8')
  }

  console.error(`[wcag-query] fetching ${url}`)
  const res = await fetch(url, {
    headers: { 'user-agent': 'wcag-query/0.1 (extractor)' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  const html = await res.text()
  if (!existsSync(SNAPSHOT_DIR)) mkdirSync(SNAPSHOT_DIR, { recursive: true })
  writeFileSync(snapshotPath, html)
  return html
}

interface TechniqueRef {
  id: string
  title: string
  url: string
}

function extractShortText($: cheerio.CheerioAPI): string {
  // The verbatim SC text lives in <section id="success-criterion"> (a "box").
  const section = $('section#success-criterion').first()
  if (section.length === 0) return ''
  // Inside .box-i we typically have a <p> with the criterion text.
  const text = section.find('.box-i p, .box-i').first().text().trim().replace(/\s+/g, ' ')
  return text
}

function extractTitle($: cheerio.CheerioAPI): string {
  // The page <h1> is something like:
  //   "SC 2.4.7\nFocus Visible (Level AA)"
  //   "Success Criterion 2.4.7: Focus Visible (Level AA)"
  //   "Understanding SC 2.4.7 Focus Visible"
  // We want just the human title — strip the SC code, "Understanding" prefix,
  // and the "(Level X)" suffix.
  const h1 = $('h1').first().text().trim().replace(/\s+/g, ' ')
  let title = h1
    .replace(/^Understanding\s+/i, '')
    .replace(/^(?:Success\s+Criterion|SC)\s+\d+\.\d+\.\d+\s*[:.]?\s*/i, '')
    .replace(/\s*\(Level\s+(?:A|AA|AAA)\)\s*$/i, '')
    .trim()
  return title
}

/**
 * Parse a list of technique refs from a section. Each ref is an <a> whose href
 * matches /Techniques/<category>/<id>; the link text starts with "<id>: title".
 */
function extractTechniqueLinks(
  $: cheerio.CheerioAPI,
  sectionSelector: string,
): TechniqueRef[] {
  const out: TechniqueRef[] = []
  const seen = new Set<string>()

  $(sectionSelector).find('a[href*="/Techniques/"]').each((_, a) => {
    const href = $(a).attr('href') ?? ''
    const text = $(a).text().trim().replace(/\s+/g, ' ')
    // Match text like "G149: Using user interface components..."
    const m = text.match(/^([A-Z]+\d+)\s*[:.]?\s*(.+)$/)
    if (!m) return
    const id = m[1]
    if (seen.has(id)) return
    seen.add(id)
    out.push({
      id,
      title: m[2].trim(),
      url: href.startsWith('http') ? href : `https://www.w3.org${href}`,
    })
  })

  return out
}

async function extractSC(
  sc: typeof SCS[number],
): Promise<{ criterion: SuccessCriterion; techniques: Technique[]; failures: Technique[] }> {
  const html = await fetchSnapshot(sc.slug)
  const $ = cheerio.load(html)

  const title = extractTitle($)
  const short_text = extractShortText($)
  const understanding_url = `${UNDERSTANDING_BASE}/${sc.slug}`

  const sufficientRefs = extractTechniqueLinks($, 'section#sufficient')
  const failureRefs = extractTechniqueLinks($, 'section#failure')

  if (!short_text) {
    console.error(`[wcag-query] WARN: SC ${sc.id} (${sc.slug}) has empty short_text`)
  }

  const criterion: SuccessCriterion = {
    id: sc.id,
    level: sc.level,
    title,
    short_text,
    understanding_url,
    technique_ids: sufficientRefs.map((r) => r.id),
    failure_ids: failureRefs.map((r) => r.id),
  }

  const techniques: Technique[] = sufficientRefs.map((r) => ({
    id: r.id,
    kind: 'sufficient' as const,
    title: r.title,
    applicable_sc_ids: [sc.id],
    url: r.url,
  }))
  const failures: Technique[] = failureRefs.map((r) => ({
    id: r.id,
    kind: 'failure' as const,
    title: r.title,
    applicable_sc_ids: [sc.id],
    url: r.url,
  }))

  return { criterion, techniques, failures }
}

async function main() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

  const allSCs: Record<string, SuccessCriterion> = {}
  const allTechniques: Record<string, Technique> = {}
  const allFailures: Record<string, Technique> = {}

  for (const sc of SCS) {
    const { criterion, techniques, failures } = await extractSC(sc)
    allSCs[criterion.id] = criterion

    // Merge: techniques and failures may apply to multiple SCs. If we've already
    // seen the technique, append the SC ID to applicable_sc_ids.
    for (const t of techniques) {
      const existing = allTechniques[t.id]
      if (existing) {
        if (!existing.applicable_sc_ids.includes(sc.id)) {
          existing.applicable_sc_ids.push(sc.id)
        }
      } else {
        allTechniques[t.id] = t
      }
    }
    for (const f of failures) {
      const existing = allFailures[f.id]
      if (existing) {
        if (!existing.applicable_sc_ids.includes(sc.id)) {
          existing.applicable_sc_ids.push(sc.id)
        }
      } else {
        allFailures[f.id] = f
      }
    }
  }

  writeFileSync(
    resolve(DATA_DIR, 'success-criteria.json'),
    JSON.stringify(allSCs, null, 2) + '\n',
  )
  writeFileSync(
    resolve(DATA_DIR, 'techniques.json'),
    JSON.stringify(allTechniques, null, 2) + '\n',
  )
  writeFileSync(
    resolve(DATA_DIR, 'failures.json'),
    JSON.stringify(allFailures, null, 2) + '\n',
  )

  const snapshot: WCAGSnapshot = {
    date: new Date().toISOString().slice(0, 10),
    version: '2.2',
    sc_count: Object.keys(allSCs).length,
    technique_count: Object.keys(allTechniques).length,
    failure_count: Object.keys(allFailures).length,
  }
  writeFileSync(
    resolve(DATA_DIR, '_snapshot.json'),
    JSON.stringify(snapshot, null, 2) + '\n',
  )

  console.error(
    `[wcag-query] extraction complete — ${snapshot.sc_count} SCs, ${snapshot.technique_count} techniques, ${snapshot.failure_count} failures`,
  )
}

main().catch((err) => {
  console.error('[wcag-query] extraction failed:', err)
  process.exit(1)
})
