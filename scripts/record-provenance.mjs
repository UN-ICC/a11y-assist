#!/usr/bin/env node
/**
 * Records a "data versions" provenance row in each scraper package's README:
 * the published version ↔ the upstream scrape it shipped with (read from the
 * package's own src/data/_snapshot.json — the single source of truth).
 *
 * Idempotent: it adds a row only if the current version isn't already recorded,
 * and creates the table block (between markers) if it doesn't exist yet. Run it
 * at release time (and seeding is just running it once).
 *
 *   node scripts/record-provenance.mjs            # all scraper packages
 *   node scripts/record-provenance.mjs apg-query  # one package
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const START = '<!-- provenance:start -->'
const END = '<!-- provenance:end -->'

// Per-package table shape, driven by that package's snapshot fields.
const PACKAGES = {
  'apg-query': {
    header: ['Version', 'Scraped', 'Patterns'],
    row: (v, s) => [v, s.date, String(s.pattern_count)],
  },
  'wcag-query': {
    header: ['Version', 'Scraped', 'WCAG'],
    row: (v, s) => [v, s.date, s.version],
  },
  'act-rules-query': {
    header: ['Version', 'Scraped', 'Upstream commit'],
    row: (v, s) => [v, s.date, '`' + String(s.upstream_commit).slice(0, 7) + '`'],
  },
}

const tableRow = (cells) => `| ${cells.join(' | ')} |`

function buildBlock(cfg, rows) {
  return [
    START,
    '',
    tableRow(cfg.header),
    tableRow(cfg.header.map(() => '---')),
    ...rows.map(tableRow),
    '',
    END,
  ].join('\n')
}

function record(pkg) {
  const cfg = PACKAGES[pkg]
  if (!cfg) throw new Error(`Unknown scraper package: ${pkg}`)

  const base = resolve('packages', pkg)
  const version = JSON.parse(readFileSync(resolve(base, 'package.json'), 'utf8')).version
  const snapshot = JSON.parse(readFileSync(resolve(base, 'src/data/_snapshot.json'), 'utf8'))
  const readmePath = resolve(base, 'README.md')
  let readme = readFileSync(readmePath, 'utf8')

  const newRow = cfg.row(version, snapshot)

  if (readme.includes(START) && readme.includes(END)) {
    const block = readme.slice(readme.indexOf(START), readme.indexOf(END) + END.length)
    // Already recorded this version? (match "| <version> |")
    if (new RegExp(`\\|\\s*${version.replace(/\./g, '\\.')}\\s*\\|`).test(block)) {
      console.log(`${pkg}: v${version} already recorded — no change`)
      return
    }
    // Insert newest row right after the header separator line.
    const lines = block.split('\n')
    const sepIdx = lines.findIndex((l) => /^\|\s*---/.test(l))
    lines.splice(sepIdx + 1, 0, tableRow(newRow))
    readme = readme.replace(block, lines.join('\n'))
  } else {
    // Create the section at the end of the README.
    const section = `\n## Data versions\n\nEach published version ↔ the upstream snapshot it was built from.\n\n${buildBlock(cfg, [newRow])}\n`
    readme = readme.replace(/\s*$/, '\n') + section
  }

  writeFileSync(readmePath, readme)
  console.log(`${pkg}: recorded v${version} → scraped ${snapshot.date}`)
}

const args = process.argv.slice(2)
const targets = args.length ? args : Object.keys(PACKAGES)
for (const pkg of targets) {
  if (!existsSync(resolve('packages', pkg))) {
    console.error(`skip ${pkg}: not found`)
    continue
  }
  record(pkg)
}
