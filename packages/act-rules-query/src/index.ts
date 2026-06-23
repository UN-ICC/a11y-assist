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
 * Full-text search over rule name and applicability text (case-insensitive
 * substring). Returns all matches, sorted by id — ranking and selection are
 * the caller's job.
 *
 * This replaces the old editorial role→term heuristic. The caller (e.g. an
 * agent that has a role name or ARIA attribute in hand) supplies the query
 * term; the package makes no judgement about which rules "apply" to a role.
 */
export function search(query: string): ACTRule[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return RULE_LIST
    .filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.applicability_text.toLowerCase().includes(q),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
}
