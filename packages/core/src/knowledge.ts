/**
 * Knowledge-base query surface — coherent access over the WCAG and ACT corpora,
 * so consumers (the MCP server, the web app) query everything through
 * a11y-assist-core rather than reaching into the individual query packages.
 */
import {
  getSC,
  getTechnique,
  getFailure,
  search as wcagSearch,
  successCriteria,
  type SuccessCriterion,
  type Technique,
  type WCAGLevel,
} from 'wcag-query'
import { getRule, rulesByWCAG, listRules, type ACTRule } from 'act-rules-query'

export type { SuccessCriterion, Technique, WCAGLevel } from 'wcag-query'
export type { ACTRule } from 'act-rules-query'

/** A Success Criterion expanded with its sufficient techniques and failures. */
export interface ExpandedSc extends SuccessCriterion {
  techniques: Technique[]
  failures: Technique[]
}

/** Full Success Criterion by id, with techniques and documented failures. */
export function getWcagSc(id: string): ExpandedSc | null {
  const sc = getSC(id)
  if (!sc) return null
  return {
    ...sc,
    techniques: sc.technique_ids.map((t) => getTechnique(t)).filter((t): t is Technique => Boolean(t)),
    failures: sc.failure_ids.map((f) => getFailure(f)).filter((f): f is Technique => Boolean(f)),
  }
}

/** Keyword search over Success Criteria (id / title / statement), level-gated. */
export function searchWcag(query: string, level: WCAGLevel = 'AA'): SuccessCriterion[] {
  return wcagSearch(query, { level })
}

/** All Success Criteria, optionally filtered to a cumulative level. */
export function listWcagScs(level?: WCAGLevel): SuccessCriterion[] {
  if (level) return wcagSearch('', { level })
  return Array.from(successCriteria.values()).sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  )
}

export function getWcagTechnique(id: string): Technique | null {
  return getTechnique(id) ?? null
}

export function getWcagFailure(id: string): Technique | null {
  return getFailure(id) ?? null
}

/** Full ACT rule by id. */
export function getActRule(id: string): ACTRule | null {
  return getRule(id) ?? null
}

/** ACT rules that cover a given Success Criterion (mechanical, from front-matter). */
export function actRulesForSc(scId: string): ACTRule[] {
  return rulesByWCAG(scId)
}

/** All ACT rule ids, sorted. */
export function listActRules(): string[] {
  return listRules()
}
