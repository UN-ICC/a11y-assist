/**
 * Build-time derivations the website needs beyond a single `loadPattern`
 * lookup: reverse backlinks (which patterns reference a given WCAG SC or ACT
 * rule) and dataset coverage stats.
 *
 * These are derived directly from `a11y-core` + the query packages — the exact
 * same sources the MCP server reads. The website is a human view over the same
 * data the agent sees; it computes these by iterating the canonical pattern set
 * once and indexing, rather than maintaining a separate graph structure.
 */

import { loadPattern, roleBindings, type A11yPattern } from 'a11y-core'
import { listPatterns as listAPGPatterns } from 'apg-query'
import { successCriteria } from 'wcag-query'
import { rules as actRules } from 'act-rules-query'

/**
 * The canonical pattern set: APG patterns ∪ role-bindings keys, loading the web
 * variant (falling back to react-native for RN-only patterns). This mirrors how
 * `loadPattern` views the dataset, so backlinks and coverage line up with the
 * pattern pages the site renders.
 */
function canonicalPatterns(): A11yPattern[] {
  const roles = new Set<string>([...listAPGPatterns(), ...Object.keys(roleBindings)])
  const out: A11yPattern[] = []
  for (const role of roles) {
    const pattern = loadPattern(role, 'web') ?? loadPattern(role, 'react-native')
    if (pattern) out.push(pattern)
  }
  return out
}

let scToPatterns: Map<string, Set<string>> | null = null
let actToPatterns: Map<string, Set<string>> | null = null

function buildIndexes(): void {
  if (scToPatterns) return
  scToPatterns = new Map()
  actToPatterns = new Map()
  const add = (m: Map<string, Set<string>>, key: string, role: string) => {
    let set = m.get(key)
    if (!set) {
      set = new Set()
      m.set(key, set)
    }
    set.add(role)
  }
  for (const pattern of canonicalPatterns()) {
    for (const sc of pattern.wcag_applicable) add(scToPatterns, sc.id, pattern.role)
    for (const rule of pattern.act_rules_applicable) add(actToPatterns, rule.id, pattern.role)
  }
}

/** Roles of every pattern whose applicable WCAG SCs include `scId`. */
export function patternsReferencingSC(scId: string): string[] {
  buildIndexes()
  return Array.from(scToPatterns!.get(scId) ?? []).sort()
}

/** Roles of every pattern whose applicable ACT rules include `ruleId`. */
export function patternsReferencingACT(ruleId: string): string[] {
  buildIndexes()
  return Array.from(actToPatterns!.get(ruleId) ?? []).sort()
}

export interface CoverageSummary {
  totalSCs: number
  scsWithoutACT: number
  totalPatterns: number
  patternsWithoutWeb: number
  patternsWithoutRN: number
}

/** Where the dataset is thin — SCs no ACT rule covers, patterns missing a
 *  native HTML element or a React Native primitive. */
export function coverageSummary(): CoverageSummary {
  const patterns = canonicalPatterns()

  const coveredByACT = new Set<string>()
  for (const [, rule] of actRules) {
    for (const scId of rule.wcag_sc_ids) coveredByACT.add(scId)
  }

  let totalSCs = 0
  let scsWithoutACT = 0
  for (const [id] of successCriteria) {
    totalSCs++
    if (!coveredByACT.has(id)) scsWithoutACT++
  }

  return {
    totalSCs,
    scsWithoutACT,
    totalPatterns: patterns.length,
    patternsWithoutWeb: patterns.filter((p) => p.web_elements.length === 0).length,
    patternsWithoutRN: patterns.filter((p) => !p.rn_primitive).length,
  }
}
