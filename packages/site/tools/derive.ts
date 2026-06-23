/**
 * Build-time derivations for the website — all mechanical, no editorial.
 *
 * - relatedActRules: the ACT rules reached from a pattern's deterministic
 *   suggested_queries (deduped), the same hop the agent makes via search_act.
 * - coverageSummary: dataset stats, including the honest ACT blind spot
 *   (SCs no ACT rule covers).
 */

import { searchAct, type SuggestedQuery, type WCAGLevel } from 'a11y-core'
import { successCriteria } from 'wcag-query'
import { rules as actRules, rulesByWCAG, type ACTRule } from 'act-rules-query'

/** Dedupe `search_act` across a pattern's suggested-query seeds. */
export function relatedActRules(seeds: SuggestedQuery[], level: WCAGLevel): ACTRule[] {
  const out = new Map<string, ACTRule>()
  for (const seed of seeds) {
    for (const rule of searchAct(seed.query, level)) {
      if (!out.has(rule.id)) out.set(rule.id, rule)
    }
  }
  return Array.from(out.values()).sort((a, b) => a.id.localeCompare(b.id))
}

export interface CoverageSummary {
  totalSCs: number
  scsWithoutACT: number
  totalActRules: number
}

/** Where the dataset is thin — SCs that no ACT rule covers (the ACT blind spot). */
export function coverageSummary(): CoverageSummary {
  let scsWithoutACT = 0
  for (const [id] of successCriteria) {
    if (rulesByWCAG(id).length === 0) scsWithoutACT++
  }
  return {
    totalSCs: Array.from(successCriteria).length,
    scsWithoutACT,
    totalActRules: Array.from(actRules).length,
  }
}
