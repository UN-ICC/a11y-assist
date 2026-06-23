/**
 * act-rules-query — programmatic access to W3C ACT Rules.
 *
 * Data lives in src/data/, written by tools/load-yaml.ts. Each rule's
 * structured fields (front-matter + applicability text) are loaded from
 * snapshotted YAML/Markdown source files in snapshots/_rules/.
 */

import { createRequire } from 'node:module'
import type { ACTRule, ACTSnapshot } from './types.js'

export type { ACTRule, ACTSnapshot } from './types.js'

const requireFromHere = createRequire(import.meta.url)

const manifest = requireFromHere('./data/_manifest.json') as { ids: string[] }
export const ACT_SNAPSHOT: ACTSnapshot = requireFromHere('./data/_snapshot.json')

const RULE_LIST: ACTRule[] = manifest.ids.map(
  (id) => requireFromHere(`./data/${id}.json`) as ACTRule,
)

/** Map of rule ID → rule. */
export const rules: ReadonlyMap<string, ACTRule> = new Map(
  RULE_LIST.map((r) => [r.id, r]),
)

/** Get a rule by ID. */
export function getRule(id: string): ACTRule | undefined {
  return rules.get(id)
}

/** All rule IDs, sorted. */
export function listRules(): string[] {
  return Array.from(rules.keys()).sort()
}

/** Rules whose primary WCAG mapping includes the given SC ID. */
export function rulesByWCAG(scId: string): ACTRule[] {
  return RULE_LIST.filter((r) => r.wcag_sc_ids.includes(scId))
}

/**
 * Heuristic role/element matcher: rules whose `applicability_text` mentions
 * the role or its associated HTML elements. Word-boundary-aware to avoid
 * substring false positives ('button' should not match 'spinbutton'-only
 * applicability text).
 *
 * The mapping role → search terms includes both the ARIA role name and
 * common HTML element synonyms so we catch rules whose applicability is
 * phrased element-first.
 */
const ROLE_SEARCH_TERMS: Record<string, string[]> = {
  button: ['button', 'role=button'],
  textbox: ['textbox', 'input element', 'textarea'],
  link: ['link', 'role=link', '<a> element', '<a href>', '<a> elements'],
  img: ['img', 'image element', '<img>'],
  checkbox: ['checkbox', 'type="checkbox"', "type='checkbox'"],
  radio: ['radio', 'type="radio"', "type='radio'"],
  dialog: ['dialog', 'role=dialog', 'modal'],
  alertdialog: ['alertdialog', 'role=alertdialog'],
  alert: ['alert', 'role=alert'],
  tabs: ['tab', 'tablist', 'tabpanel'],
  listbox: ['listbox', 'role=listbox', 'option'],
  combobox: ['combobox', 'role=combobox'],
  menu: ['menu', 'menuitem', 'menubar'],
  menubutton: ['menu button', 'menubutton', 'aria-haspopup'],
  switch: ['switch', 'role=switch'],
  slider: ['slider', 'role=slider'],
  spinbutton: ['spinbutton', 'type="number"', 'role=spinbutton'],
  meter: ['meter', 'role=meter'],
  progressbar: ['progressbar', 'role=progressbar'],
  tree: ['tree', 'treeitem'],
  treeview: ['tree', 'treeitem'],
  treegrid: ['treegrid'],
  grid: ['grid', 'gridcell', 'role=grid'],
  table: ['table', '<table>', 'tablerow'],
  toolbar: ['toolbar', 'role=toolbar'],
  tooltip: ['tooltip', 'role=tooltip'],
  accordion: ['accordion', 'aria-expanded'],
  disclosure: ['aria-expanded', 'disclosure'],
  breadcrumb: ['breadcrumb', 'aria-current'],
  carousel: ['carousel'],
  feed: ['feed', 'role=feed'],
}

export function rulesByRole(role: string): ACTRule[] {
  const terms = ROLE_SEARCH_TERMS[role.toLowerCase()] ?? [role.toLowerCase()]
  // Compile each term to a word-boundary regex so 'button' doesn't match
  // 'spinbutton', 'summary button', etc.
  const patterns = terms.map(
    (t) => new RegExp(`(?<![\\w-])${escapeRegex(t)}(?![\\w-])`, 'i'),
  )
  return RULE_LIST.filter((r) => {
    // Restrict the search to the leading applicability sentence(s) — the
    // canonical "This rule applies to X" portion. Anything beyond ~400 chars
    // is typically clarifications, exclusions, or incidental mentions.
    const lead = r.applicability_text.slice(0, 400)
    return patterns.some((p) => p.test(lead))
  })
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
