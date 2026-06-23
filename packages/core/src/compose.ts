/**
 * The composition layer. Given an entry (an APG pattern or an ARIA role) it
 * assembles a small, fully-mechanical response: verbatim recipe content +
 * the ARIA contract for the involved roles (aria-query) + the native HTML
 * elements that carry those roles (aria-query) + a deterministic list of
 * drill-down queries the agent can run next.
 *
 * It asserts nothing about "which WCAG SCs apply." Associations are reached by
 * the agent running the suggested ACT searches; the only mechanical cross-corpus
 * link is ACT-rule → WCAG-SC (ACT front-matter), surfaced by `searchAct`.
 */

import {
  getPattern as getAPG,
  listPatterns as listAPG,
  type APGPattern,
} from 'apg-query'
import { search as actSearch, type ACTRule } from 'act-rules-query'
import { getSC, type WCAGLevel } from 'wcag-query'
import { deriveAriaContract, deriveContracts, type AriaContract } from './aria-contract.js'
import { getElementsForRole, type ElementSpec } from './element-roles.js'

export type { WCAGLevel } from 'wcag-query'

/**
 * Navigation aliases — alternate / sub-role names mapped to a canonical entry.
 * Wayfinding only (not a claim about accessibility): `modal` → `dialog`,
 * `input` → `textbox`, `a` → `link`, etc.
 */
const ALIASES: Record<string, string> = {
  modal: 'dialog',
  tablist: 'tabs',
  tab: 'tabs',
  tabpanel: 'tabs',
  option: 'listbox',
  treeitem: 'treeview',
  menuitem: 'menu',
  menubar: 'menu',
  'menu-button': 'menubutton',
  input: 'textbox',
  'text-input': 'textbox',
  textarea: 'textbox',
  a: 'link',
  anchor: 'link',
  image: 'img',
}

const LEVEL_ORDER: Record<WCAGLevel, number> = { A: 1, AA: 2, AAA: 3 }

export interface SuggestedQuery {
  tool: 'search_act'
  query: string
  /** The structural field this seed was derived from (traceability). */
  why: string
  level: WCAGLevel
}

export interface ComposedAriaRole {
  role: string
  aria_contract: Record<string, AriaContract>
  native_elements: ElementSpec[]
  suggested_queries: SuggestedQuery[]
}

export interface ComposedApgPattern extends ComposedAriaRole {
  /** The verbatim APG card. */
  apg: APGPattern
}

function canonical(name: string): string {
  const key = name.toLowerCase()
  return ALIASES[key] ?? key
}

/** Union of native HTML elements across the given roles (deduped, sorted). */
function collectWebElements(roles: string[]): ElementSpec[] {
  const seen = new Map<string, ElementSpec>()
  for (const r of roles) {
    for (const el of getElementsForRole(r)) {
      const k = `${el.canonical_id}|${el.implicit_role}`
      if (!seen.has(k)) seen.set(k, el)
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    const r = a.implicit_role.localeCompare(b.implicit_role)
    return r !== 0 ? r : a.canonical_id.localeCompare(b.canonical_id)
  })
}

/**
 * Deterministic drill-down seeds for the ACT corpus, derived only from
 * structured fields: role names, their required ARIA properties, and the native
 * element tags that carry them — plus a `focus`/`keyboard` seed when the entry
 * has a keyboard-interaction table. Deduped by query; unranked, uncapped.
 */
function actSeeds(roles: string[], hasKeyboard: boolean, level: WCAGLevel): SuggestedQuery[] {
  const out = new Map<string, SuggestedQuery>()
  const add = (query: string, why: string) => {
    const q = query.toLowerCase()
    if (q && !out.has(q)) out.set(q, { tool: 'search_act', query: q, why, level })
  }
  for (const role of roles) {
    add(role, `ARIA role "${role}"`)
    const contract = deriveAriaContract(role)
    for (const prop of contract?.required_props ?? []) add(prop, `required ARIA property of "${role}"`)
    for (const el of getElementsForRole(role)) add(el.tag, `native element for "${role}"`)
  }
  if (hasKeyboard) {
    add('focus', 'pattern defines keyboard interactions')
    add('keyboard', 'pattern defines keyboard interactions')
  }
  return Array.from(out.values())
}

/** All APG pattern names (canonical), sorted. */
export function listApgPatterns(): string[] {
  return listAPG()
}

/**
 * APG entry (scenario 1): verbatim APG card + ARIA contract + native elements +
 * suggested ACT queries. Returns null if no APG card exists for `name`.
 */
export function composeApgPattern(name: string, level: WCAGLevel = 'AA'): ComposedApgPattern | null {
  const apg = getAPG(canonical(name))
  if (!apg) return null
  const roles = apg.aria_roles
  return {
    apg,
    role: apg.role,
    aria_contract: deriveContracts(roles),
    native_elements: collectWebElements(roles),
    suggested_queries: actSeeds(roles, apg.keyboard_interactions.length > 0, level),
  }
}

/**
 * ARIA entry (scenario 2): ARIA contract + native elements + suggested ACT
 * queries for a single role. Returns null if the role is unknown to aria-query.
 */
export function composeAriaRole(role: string, level: WCAGLevel = 'AA'): ComposedAriaRole | null {
  const key = canonical(role)
  if (!deriveAriaContract(key)) return null
  const roles = [key]
  return {
    role: key,
    aria_contract: deriveContracts(roles),
    native_elements: collectWebElements(roles),
    suggested_queries: actSeeds(roles, false, level),
  }
}

function withinLevel(scId: string, level: WCAGLevel): boolean {
  const sc = getSC(scId)
  return sc ? LEVEL_ORDER[sc.level] <= LEVEL_ORDER[level] : false
}

/**
 * Level-gated ACT search (the drill-down hub). Runs the plain ACT search, then
 * keeps only rules that cover at least one WCAG SC at or below `level`, with
 * each rule's `wcag_sc_ids` trimmed to those in-scope SCs. The ACT→SC→level
 * join lives here because act-rules-query has no dependency on wcag-query.
 */
export function searchAct(query: string, level: WCAGLevel = 'AA'): ACTRule[] {
  return actSearch(query)
    .map((r) => ({ ...r, wcag_sc_ids: r.wcag_sc_ids.filter((id) => withinLevel(id, level)) }))
    .filter((r) => r.wcag_sc_ids.length > 0)
}
