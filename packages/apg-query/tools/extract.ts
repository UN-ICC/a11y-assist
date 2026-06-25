/**
 * APG extractor.
 *
 * Fetches each APG pattern's HTML, snapshots it, and extracts structured
 * data into src/data/<role>.json. Run via `npm run extract`.
 *
 * The extractor is the methodology: every claim in the data files is
 * traceable back to a section of the snapshotted HTML.
 *
 * Note: this is a maintainer tool, not part of the published package.
 * Consumers `import` from src/index.ts; the data they get was produced
 * by running this script.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import type { APGPattern, KeyboardInteraction, Example, APGSnapshot } from '../src/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SNAPSHOT_DIR = resolve(ROOT, 'snapshots')
const DATA_DIR = resolve(ROOT, 'src/data')

const APG_BASE = 'https://www.w3.org/WAI/ARIA/apg/patterns'

/**
 * Map role → URL slug. Most patterns are `<role>/`; a few have different slugs
 * (dialog → dialog-modal). All standard APG widget patterns. Landmark patterns
 * are intentionally omitted — they're a different shape (single role each, no
 * keyboard interactions); add later if needed.
 */
const PATTERNS: { role: string; slug: string; name: string }[] = [
  { role: 'accordion',     slug: 'accordion',         name: 'Accordion' },
  { role: 'alert',         slug: 'alert',             name: 'Alert' },
  { role: 'alertdialog',   slug: 'alertdialog',       name: 'Alert Dialog' },
  { role: 'breadcrumb',    slug: 'breadcrumb',        name: 'Breadcrumb' },
  { role: 'button',        slug: 'button',            name: 'Button' },
  { role: 'carousel',      slug: 'carousel',          name: 'Carousel' },
  { role: 'checkbox',      slug: 'checkbox',          name: 'Checkbox' },
  { role: 'combobox',      slug: 'combobox',          name: 'Combobox' },
  { role: 'dialog',        slug: 'dialog-modal',      name: 'Dialog (Modal)' },
  { role: 'disclosure',    slug: 'disclosure',        name: 'Disclosure (Show/Hide)' },
  { role: 'feed',          slug: 'feed',              name: 'Feed' },
  { role: 'grid',          slug: 'grid',              name: 'Grid' },
  { role: 'link',          slug: 'link',              name: 'Link' },
  { role: 'listbox',       slug: 'listbox',           name: 'Listbox' },
  { role: 'menu',          slug: 'menubar',           name: 'Menu / Menubar' },
  { role: 'menubutton',    slug: 'menu-button',       name: 'Menu Button' },
  { role: 'meter',         slug: 'meter',             name: 'Meter' },
  { role: 'radio',         slug: 'radio',             name: 'Radio Group' },
  { role: 'slider',        slug: 'slider',            name: 'Slider' },
  { role: 'slider-multithumb', slug: 'slider-multithumb', name: 'Slider (Multi-Thumb)' },
  { role: 'spinbutton',    slug: 'spinbutton',        name: 'Spinbutton' },
  { role: 'switch',        slug: 'switch',            name: 'Switch' },
  { role: 'table',         slug: 'table',             name: 'Table' },
  { role: 'tabs',          slug: 'tabs',              name: 'Tabs' },
  { role: 'toolbar',       slug: 'toolbar',           name: 'Toolbar' },
  { role: 'tooltip',       slug: 'tooltip',           name: 'Tooltip' },
  { role: 'treeview',      slug: 'treeview',          name: 'Tree View' },
  { role: 'treegrid',      slug: 'treegrid',          name: 'Tree Grid' },
]

async function fetchSnapshot(slug: string): Promise<string> {
  const url = `${APG_BASE}/${slug}/`
  const snapshotPath = resolve(SNAPSHOT_DIR, `${slug}.html`)

  // If snapshot exists and --refresh is not passed, reuse it.
  if (existsSync(snapshotPath) && !process.argv.includes('--refresh')) {
    return readFileSync(snapshotPath, 'utf8')
  }

  console.error(`[apg-query] fetching ${url}`)
  const res = await fetch(url, {
    headers: { 'user-agent': 'apg-query/0.1 (extractor)' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  const html = await res.text()
  if (!existsSync(SNAPSHOT_DIR)) mkdirSync(SNAPSHOT_DIR, { recursive: true })
  writeFileSync(snapshotPath, html)
  return html
}

/**
 * Extract the "About This Pattern" verbatim text. APG uses <section id="about">
 * for this content. The first paragraphs (skipping the heading) are the
 * canonical description.
 */
function extractAboutThisPattern($: cheerio.CheerioAPI): string {
  // APG canonical id is "about" (verified across button, tabs, dialog-modal, etc.)
  let section = $('section#about').first()
  if (section.length === 0) {
    // Fallback: any section whose heading text begins with "About"
    section = $('section').filter((_, el) => {
      const heading = $(el).find('h2, h3').first().text().trim().toLowerCase()
      return heading.startsWith('about')
    }).first()
  }
  if (section.length === 0) return ''

  // Collect paragraph text only — skip headings, lists, code blocks.
  const paragraphs: string[] = []
  section.find('> p').each((_, p) => {
    const text = $(p).text().trim().replace(/\s+/g, ' ')
    if (text) paragraphs.push(text)
  })
  return paragraphs.join('\n\n')
}

/**
 * Extract keyboard interactions from the APG keyboard-interaction section.
 * APG uses <ul>/<li> with <kbd> markers, not tables. Each top-level <li>
 * contains either:
 *   - <li><kbd>Key</kbd>: description text</li>           (flat form)
 *   - <li>Context note: <ul> nested key items </ul></li>  (grouped form)
 *
 * We flatten both forms into a single { key, description } list. For grouped
 * items, the parent context note prefixes each child's description so the
 * surrounding meaning is preserved.
 */
function extractKeyboardInteractions($: cheerio.CheerioAPI): KeyboardInteraction[] {
  const out: KeyboardInteraction[] = []

  const root = $('section#keyboard_interaction, section[id^="keyboard_interaction"]')
  if (root.length === 0) return out

  // Walk every container — the root section and any nested <section>s within it
  // (radio uses nested sub-sections like "For Radio Groups Not Contained in a Toolbar").
  // Use the heading text of the nested section as context.
  walkKeyboardScope($, root, '', out)

  return out
}

function walkKeyboardScope(
  $: cheerio.CheerioAPI,
  scope: cheerio.Cheerio<any>,
  context: string,
  out: KeyboardInteraction[],
): void {
  // 1) Recurse into nested <section>s, using their heading as added context.
  scope.find('> section').each((_, sub) => {
    const $sub = $(sub)
    const subHeading = $sub.find('> h2, > h3, > h4').first().text().trim().replace(/\s+/g, ' ')
    const newContext = context && subHeading ? `${context} — ${subHeading}`
      : subHeading || context
    walkKeyboardScope($, $sub, newContext, out)
  })

  // 2) <p> elements that contain <kbd> markers (e.g. checkbox: "<p>When the checkbox has focus, <kbd>Space</kbd> changes...</p>")
  scope.find('> p').each((_, p) => {
    const $p = $(p)
    const kbds = $p.find('kbd')
    if (kbds.length === 0) return
    const interaction = parseKbdContainer($, $p, context)
    if (interaction) out.push(interaction)
  })

  // 3) <ul> children — the standard list form. Each top-level <li> is either a
  //    flat key item or a grouped-context item with a nested <ul>.
  scope.find('> ul > li').each((_, li) => {
    walkKeyboardListItem($, $(li), context, out)
  })
}

function walkKeyboardListItem(
  $: cheerio.CheerioAPI,
  $li: cheerio.Cheerio<any>,
  context: string,
  out: KeyboardInteraction[],
): void {
  const liHtml = ($li.html() ?? '').trim()
  const startsWithKbd = /^<(kbd|strong)\b/i.test(liHtml)
  const hasNestedList = $li.children('ul').length > 0

  if (startsWithKbd && hasNestedList) {
    // Form: "<kbd>Key</kbd>: <ul> sub-points </ul>"
    // The leading kbd is a key whose effects are detailed in the sublist.
    // Emit one entry per sub-bullet with the parent's key and the sub-bullet's text as description.
    const $kbds = $li.children('kbd')
    const parentKey = $kbds.toArray().map((k) => $(k).text().trim()).join(' + ')

    $li.children('ul').children('li').each((_, sub) => {
      const $sub = $(sub)
      // If the sub-bullet itself starts with kbd, treat it as a flat entry
      // (some APG patterns nest sub-keys under a context bullet).
      const subHtml = ($sub.html() ?? '').trim()
      if (/^<(kbd|strong)\b/i.test(subHtml)) {
        walkKeyboardListItem($, $sub, context, out)
      } else {
        const subClone = $sub.clone()
        subClone.find('> ul, > ol').remove()
        const description = subClone.text().trim().replace(/\s+/g, ' ')
        if (parentKey && description) {
          const finalDesc = context ? `${context} — ${description}` : description
          out.push({ key: parentKey, description: finalDesc })
        }
        // Recurse if the sub-sub-bullet has its own nested list
        $sub.children('ul').children('li').each((_, ssub) => {
          walkKeyboardListItem($, $(ssub), context, out)
        })
      }
    })
  } else if (startsWithKbd) {
    // Pure flat form: "<kbd>Key</kbd>: description"
    const interaction = parseKbdContainer($, $li, context)
    if (interaction) out.push(interaction)
  } else if (hasNestedList) {
    // Grouped form: "<li>Context text<ul>...</ul></li>"
    const clone = $li.clone()
    clone.find('> ul').remove()
    const newContext = clone.text().trim().replace(/\s+/g, ' ').replace(/[:.]\s*$/, '')
    const combinedContext = context && newContext ? `${context} — ${newContext}` : newContext
    $li.children('ul').children('li').each((_, sub) => {
      walkKeyboardListItem($, $(sub), combinedContext, out)
    })
  } else {
    // Plain <li> with kbd somewhere inside but not at the start — treat as flat.
    const interaction = parseKbdContainer($, $li, context)
    if (interaction) out.push(interaction)
  }
}

/**
 * Given an element containing <kbd> markers and surrounding description text,
 * extract a { key, description } pair.
 *
 * Strategy: keep things verbatim. The "key" is whatever leading text precedes
 * the first ":" or "—" separator (preserving "and", "+", "/", etc. between
 * <kbd> markers). The "description" is whatever follows. If no separator is
 * found, the kbd contents become the key and the whole element text is the
 * description (e.g. "When the checkbox has focus, Space toggles it").
 */
function parseKbdContainer(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<any>,
  context: string,
): KeyboardInteraction | null {
  const $kbds = $el.find('kbd')
  if ($kbds.length === 0) return null

  // Get full text minus any nested lists/notes.
  const clone = $el.clone()
  clone.find('> ul, > ol, > div.note').remove()
  const fullText = clone.text().trim().replace(/\s+/g, ' ')
  if (!fullText) return null

  // Try to find a separator that splits "key portion" from "description".
  // APG conventionally uses ":" — also accept " — " (em dash w/ spaces).
  const sepMatch = fullText.match(/^(.+?)(?::\s+|\s+—\s+)(.+)$/)

  let key: string
  let description: string

  if (sepMatch) {
    key = sepMatch[1].trim()
    description = sepMatch[2].trim()
  } else {
    // No separator — kbd is mid-sentence. Use kbd contents as the key,
    // full sentence as the description verbatim.
    const keyParts: string[] = []
    $kbds.each((_, k) => keyParts.push($(k).text().trim()))
    key = keyParts.join(' / ')
    description = fullText
  }

  if (context) description = `${context} — ${description}`

  return { key, description }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extract example implementation links. APG's examples section typically lists
 * each example with a heading (or link) pointing at the example page.
 */
function extractExamples($: cheerio.CheerioAPI, baseUrl: string): Example[] {
  const out: Example[] = []
  const seen = new Set<string>()

  const sections = $('section').filter((_, el) => {
    const id = $(el).attr('id') ?? ''
    return /^examples?$/i.test(id) || /^examples?[-_]/i.test(id) || /examples?-of-/i.test(id)
  })

  sections.find('a[href]').each((_, a) => {
    const href = $(a).attr('href') ?? ''
    if (!href || href.startsWith('#')) return
    // Example implementations live under the pattern's `examples/` path; the
    // link text is the example's name (it does NOT contain the word "example").
    if (!href.includes('examples/')) return
    const url = new URL(href, baseUrl).toString()
    const name = $(a).text().trim().replace(/\s+/g, ' ')
    if (!name || seen.has(url)) return
    seen.add(url)
    out.push({ name, url })
  })

  return out
}

/**
 * Extract the ARIA roles used by the pattern. APG marks role mentions with
 * <a class="role-reference" href="...#<role>"> in the "WAI-ARIA Roles, States,
 * and Properties" section. We harvest the fragment from each role-reference
 * link — that's the canonical signal.
 */
function extractAriaRoles(
  $: cheerio.CheerioAPI,
  fallback: string[],
): string[] {
  const roles = new Set<string>()

  const sections = $('section#roles_states_properties, section[id^="roles_states_properties"]')

  sections.find('a.role-reference').each((_, a) => {
    const href = $(a).attr('href') ?? ''
    const m = href.match(/#([a-z]+)$/)
    if (m) roles.add(m[1])
    else {
      // Fallback: use the link's text content if the href doesn't have the fragment.
      const text = $(a).text().trim().toLowerCase()
      if (text) roles.add(text)
    }
  })

  if (roles.size === 0) return fallback
  return Array.from(roles).sort()
}

async function extractPattern(
  pattern: typeof PATTERNS[number],
): Promise<APGPattern> {
  const html = await fetchSnapshot(pattern.slug)
  const $ = cheerio.load(html)
  const apg_url = `${APG_BASE}/${pattern.slug}/`

  const about_this_pattern = extractAboutThisPattern($)
  const keyboard_interactions = extractKeyboardInteractions($)
  const examples = extractExamples($, apg_url)
  const aria_roles = extractAriaRoles($, [pattern.role])

  // Soft validation: warn if a section came up empty. The downstream
  // validator (or a CI step) can decide whether to fail.
  if (!about_this_pattern) {
    console.error(`[apg-query] WARN: ${pattern.role} has empty about_this_pattern`)
  }
  if (keyboard_interactions.length === 0) {
    console.error(`[apg-query] WARN: ${pattern.role} has no keyboard_interactions`)
  }

  return {
    role: pattern.role,
    name: pattern.name,
    apg_url,
    about_this_pattern,
    aria_roles,
    keyboard_interactions,
    examples,
  }
}

async function main() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

  for (const p of PATTERNS) {
    const data = await extractPattern(p)
    const out = resolve(DATA_DIR, `${p.role}.json`)
    writeFileSync(out, JSON.stringify(data, null, 2) + '\n')
    console.error(`[apg-query] wrote ${out}`)
  }

  // Snapshot manifest. The date identifies the snapshot; only a fresh fetch
  // (--refresh) updates it. A pure re-extract preserves the existing date.
  let prevDate: string | undefined
  try { prevDate = JSON.parse(readFileSync(resolve(DATA_DIR, '_snapshot.json'), 'utf8')).date } catch { /* none yet */ }
  const snapshot: APGSnapshot = {
    date: (!process.argv.includes('--refresh') && prevDate) ? prevDate : new Date().toISOString().slice(0, 10),
    apg_base: APG_BASE,
    pattern_count: PATTERNS.length,
  }
  writeFileSync(
    resolve(DATA_DIR, '_snapshot.json'),
    JSON.stringify(snapshot, null, 2) + '\n',
  )

  // Manifest of pattern role names — consumed by the package's index.ts
  // so it doesn't have to hard-code every pattern as adding new ones is
  // a matter of updating PATTERNS above and re-running.
  const manifest = { roles: PATTERNS.map((p) => p.role).sort() }
  writeFileSync(
    resolve(DATA_DIR, '_manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )

  console.error(`[apg-query] extraction complete — ${PATTERNS.length} patterns`)
}

main().catch((err) => {
  console.error('[apg-query] extraction failed:', err)
  process.exit(1)
})
