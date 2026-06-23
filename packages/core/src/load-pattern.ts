/**
 * The aggregator. Composes apg-query + wcag-query + aria-query + the small
 * editorial role-bindings table into a single response.
 *
 * No editorial paraphrase. Every field is either:
 *   - derived from a versioned upstream package (aria-query, apg-query, wcag-query)
 *   - looked up in the small editorial role-bindings table (web/rn primitive metadata)
 *
 * The agent does synthesis (recommendations, pitfalls) by reasoning over the
 * structured inputs — APG keyboard tables + WCAG SCs + Failures + ARIA contract.
 */

import { createRequire } from 'node:module'
import {
  getPattern as getAPG,
  listPatterns as listAPGPatterns,
  APG_SNAPSHOT,
  type APGPattern,
} from 'apg-query'
import {
  getSC,
  getTechnique,
  getFailure,
  WCAG_SNAPSHOT,
  WCAG_VERSION,
  type SuccessCriterion,
  type Technique,
} from 'wcag-query'
import {
  rulesByRole as actRulesByRole,
  ACT_SNAPSHOT,
  type ACTRule,
} from 'act-rules-query'
import { deriveContracts, type AriaContract } from './aria-contract.js'
import { getElementsForRole, type ElementSpec } from './element-roles.js'

const requireFromHere = createRequire(import.meta.url)

interface PrimitiveBindingRN {
  rn_component: string
  rn_doc_url: string
  rn_a11y_doc_url: string
}

interface RoleBinding {
  wcag_sc_ids: string[]
  rn_primitive: PrimitiveBindingRN | null
}

const ROLE_BINDINGS = requireFromHere('./data/role-bindings.json') as Record<string, RoleBinding>

const ALIASES: Record<string, string> = {
  // APG aliases (only for sub-roles or alternate names that don't have their
  // own APG card). 'combobox' and 'alertdialog' are no longer aliases now
  // that we ship dedicated cards for them.
  modal: 'dialog',
  tablist: 'tabs',
  tab: 'tabs',
  tabpanel: 'tabs',
  option: 'listbox',
  treeitem: 'treeview',
  rowheader: 'grid',
  columnheader: 'grid',
  gridcell: 'grid',
  menuitem: 'menu',
  menubar: 'menu',
  'menu-button': 'menubutton',
  // Web primitive aliases
  input: 'textbox',
  'text-input': 'textbox',
  textarea: 'textbox',
  a: 'link',
  anchor: 'link',
  image: 'img',
  picture: 'img',
  radiogroup: 'radio',
  // RN primitive aliases
  textinput: 'textbox',
  pressable: 'button',
  touchableopacity: 'button',
}

export type Platform = 'web' | 'react-native'

export interface SCExpansion extends SuccessCriterion {
  techniques: Technique[]
  failures: Technique[]
}

export interface A11yPattern {
  type: 'apg_pattern' | 'html_native' | 'rn_primitive'
  role: string
  name: string
  platform: Platform
  apg_url?: string
  apg_about?: string
  keyboard_interactions?: { key: string; description: string }[]
  examples?: { name: string; url: string }[]
  aria_roles: string[]
  aria_contract: Record<string, AriaContract>
  wcag_applicable: SCExpansion[]
  /** ACT Rules whose applicability matches the role. The agent can use these
   *  to know which conformance tests apply, plus their WCAG SC mappings. */
  act_rules_applicable: ACTRule[]
  /** HTML elements that natively carry one of `aria_roles` as their implicit
   *  ARIA role. Derived from `aria-query`. Empty for composite-only patterns
   *  (e.g. `tabs` — no native HTML element has implicit role tab/tablist). */
  web_elements: ElementSpec[]
  rn_primitive?: PrimitiveBindingRN | null
  provenance: {
    apg_query: typeof APG_SNAPSHOT | null
    wcag_query: typeof WCAG_SNAPSHOT
    act_rules_query: typeof ACT_SNAPSHOT
    aria_query: 'aria-query npm package'
    generated_at: string
  }
}

function expandWCAG(sc_ids: string[]): SCExpansion[] {
  const out: SCExpansion[] = []
  for (const id of sc_ids) {
    const sc = getSC(id)
    if (!sc) continue
    out.push({
      ...sc,
      techniques: sc.technique_ids
        .map((tid) => getTechnique(tid))
        .filter((t): t is Technique => t !== undefined),
      failures: sc.failure_ids
        .map((fid) => getFailure(fid))
        .filter((f): f is Technique => f !== undefined),
    })
  }
  return out
}

/**
 * Compute applicable WCAG SCs for a role:
 *   - Mechanical: SCs covered by ACT rules whose applicability matches the role
 *     (including any composite aria_roles, e.g. tabs → tablist + tab + tabpanel).
 *   - Editorial supplement: SCs from role-bindings.json — these cover SCs that
 *     ACT doesn't yet have rules for (focus visibility, target size, etc.).
 */
function applicableSCs(
  canonical: string,
  aria_roles: string[],
  binding?: RoleBinding,
): { sc_ids: string[]; act_rules: ACTRule[] } {
  const lookups = Array.from(new Set([canonical, ...aria_roles]))
  const seen = new Map<string, ACTRule>()
  for (const r of lookups) {
    for (const rule of actRulesByRole(r)) {
      seen.set(rule.id, rule)
    }
  }
  const act_rules = Array.from(seen.values()).sort((a, b) => a.id.localeCompare(b.id))
  const fromACT = act_rules.flatMap((r) => r.wcag_sc_ids)
  const fromBinding = binding?.wcag_sc_ids ?? []
  const sc_ids = Array.from(new Set([...fromACT, ...fromBinding])).sort()
  return { sc_ids, act_rules }
}

function provenance() {
  return {
    apg_query: APG_SNAPSHOT,
    wcag_query: WCAG_SNAPSHOT,
    act_rules_query: ACT_SNAPSHOT,
    aria_query: 'aria-query npm package' as const,
    generated_at: new Date().toISOString(),
  }
}

/**
 * Look up a pattern by role on the requested platform.
 *
 * Resolution order:
 *   1. If a primitive exists for the role on the requested platform, return
 *      a primitive-shaped response (the more common path).
 *   2. Otherwise, if APG has a pattern for the role, return an APG-shaped
 *      response.
 *   3. Otherwise, return null (caller surfaces an error with available list).
 */
export function loadPattern(role: string, platform: Platform = 'web'): A11yPattern | null {
  const key = role.toLowerCase()
  const canonical = ALIASES[key] ?? key
  const binding = ROLE_BINDINGS[canonical]
  const apg = getAPG(canonical)

  if (!binding && !apg) return null

  // Determine ARIA roles for contract derivation. Prefer APG (composite roles
  // like tabs → tablist + tab + tabpanel); fall back to the canonical role
  // for primitives without an APG pattern.
  const aria_roles = apg?.aria_roles ?? [canonical]
  const aria_contract = deriveContracts(aria_roles)

  // WCAG SCs come from two sources:
  //  - Mechanical: ACT rules whose applicability matches the role (or any of
  //    its composite aria_roles). Each rule lists the SCs it covers.
  //  - Editorial supplement: role-bindings.json, used for SCs that no ACT rule
  //    yet covers (focus visibility, target size, etc.).
  // Expand each SC via wcag-query into full SC + techniques + failures.
  const { sc_ids, act_rules } = applicableSCs(canonical, aria_roles, binding)
  const wcag_applicable = expandWCAG(sc_ids)

  // Native HTML elements per role (web), derived from aria-query. Composite
  // patterns whose roles have no implicit-role HTML element get an empty array.
  const web_elements = collectWebElements(aria_roles)

  // Resolve RN-specific primitive (still editorial — no W3C source for RN).
  const rn_primitive = binding?.rn_primitive ?? null

  // Decide the response type:
  //  - on web: html_native if any aria_role has a native HTML element; else apg.
  //  - on react-native: rn_primitive if a binding exists; else apg.
  //  - else null.
  const hasPlatformBinding =
    platform === 'web' ? web_elements.length > 0 : rn_primitive !== null

  const base = {
    role: canonical,
    platform,
    aria_roles,
    aria_contract,
    wcag_applicable,
    act_rules_applicable: act_rules,
    web_elements,
    rn_primitive,
    provenance: provenance(),
  }

  if (hasPlatformBinding) {
    return {
      ...base,
      type: platform === 'web' ? 'html_native' : 'rn_primitive',
      name: prettyName(canonical, platform, web_elements, rn_primitive),
    }
  }

  if (apg) {
    return {
      ...base,
      type: 'apg_pattern',
      name: apg.name,
      apg_url: apg.apg_url,
      apg_about: apg.about_this_pattern,
      keyboard_interactions: apg.keyboard_interactions,
      examples: apg.examples,
    }
  }

  return null
}

/**
 * Union of native HTML elements across all aria_roles. Each element carries
 * its `implicit_role` so composite patterns (checkbox includes 'group',
 * tabs includes 'tab' + 'tablist' + 'tabpanel') stay self-explaining.
 * Deduped by `(canonical_id, implicit_role)` — the same element can carry
 * different roles in different contexts (rare but possible).
 */
function collectWebElements(aria_roles: string[]): ElementSpec[] {
  const seen = new Map<string, ElementSpec>()
  for (const r of aria_roles) {
    for (const el of getElementsForRole(r)) {
      const key = `${el.canonical_id}|${el.implicit_role}`
      if (!seen.has(key)) seen.set(key, el)
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    const r = a.implicit_role.localeCompare(b.implicit_role)
    return r !== 0 ? r : a.canonical_id.localeCompare(b.canonical_id)
  })
}

/** Best-effort display name when no APG card exists. */
function prettyName(
  role: string,
  platform: Platform,
  web_elements: ElementSpec[],
  rn_primitive: PrimitiveBindingRN | null,
): string {
  if (platform === 'web' && web_elements.length > 0) {
    // Prefer an element bound to the canonical role; among those, prefer one
    // with no attribute filter (cleanest display name).
    const forRole = web_elements.filter((e) => e.implicit_role === role)
    const candidates = forRole.length > 0 ? forRole : web_elements
    const showcase = candidates.find((e) => e.attributes.length === 0) ?? candidates[0]
    return `${capitalize(role)} (HTML <${showcase.tag}>)`
  }
  if (platform === 'react-native' && rn_primitive) {
    return `${capitalize(role)} (RN ${rn_primitive.rn_component})`
  }
  return capitalize(role)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** List patterns and primitives available on the requested platform. */
export function listPatterns(platform: Platform = 'web'): {
  apg_patterns: string[]
  primitives: string[]
} {
  const primitives: string[] = []
  for (const [role, binding] of Object.entries(ROLE_BINDINGS)) {
    const has =
      platform === 'web'
        ? getElementsForRole(role).length > 0
        : binding.rn_primitive !== null
    if (has) primitives.push(role)
  }
  return {
    apg_patterns: listAPGPatterns(),
    primitives: primitives.sort(),
  }
}
