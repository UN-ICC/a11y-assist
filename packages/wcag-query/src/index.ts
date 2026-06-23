/**
 * wcag-query — programmatic access to WCAG 2.2 Success Criteria,
 * Sufficient Techniques, and Failures.
 *
 * Data is committed in src/data/ and produced by tools/extract.ts. Consumers
 * `import` from this module; running the extractor is a maintainer concern.
 */

import { createRequire } from 'node:module'
import type {
  SuccessCriterion,
  Technique,
  WCAGSnapshot,
} from './types.js'

export type { SuccessCriterion, Technique, WCAGSnapshot } from './types.js'

const requireFromHere = createRequire(import.meta.url)

const scData = requireFromHere('./data/success-criteria.json') as Record<string, SuccessCriterion>
const techData = requireFromHere('./data/techniques.json') as Record<string, Technique>
const failureData = requireFromHere('./data/failures.json') as Record<string, Technique>

export const WCAG_SNAPSHOT: WCAGSnapshot = requireFromHere('./data/_snapshot.json')
export const WCAG_VERSION = '2.2' as const

/** Map of SC ID → SC. */
export const successCriteria: ReadonlyMap<string, SuccessCriterion> = new Map(
  Object.entries(scData),
)

/** Map of technique ID → technique. */
export const techniques: ReadonlyMap<string, Technique> = new Map(
  Object.entries(techData),
)

/** Map of failure ID → failure (failures are Technique-shaped with kind='failure'). */
export const failures: ReadonlyMap<string, Technique> = new Map(
  Object.entries(failureData),
)

/** Look up a success criterion by ID, e.g. '2.4.7'. */
export function getSC(id: string): SuccessCriterion | undefined {
  return successCriteria.get(id)
}

/** Look up a sufficient or advisory technique by ID, e.g. 'G149'. */
export function getTechnique(id: string): Technique | undefined {
  return techniques.get(id)
}

/** Look up a failure by ID, e.g. 'F78'. */
export function getFailure(id: string): Technique | undefined {
  return failures.get(id)
}

/** All SC IDs available in the dataset, sorted. */
export function listSCs(): string[] {
  return Array.from(successCriteria.keys()).sort()
}

export type WCAGLevel = 'A' | 'AA' | 'AAA'

const LEVEL_ORDER: Record<WCAGLevel, number> = { A: 1, AA: 2, AAA: 3 }

/**
 * Search Success Criteria by case-insensitive substring over id, title, and
 * statement, with an optional cumulative conformance level filter (`AA` keeps
 * A + AA; `AAA` keeps everything). Results are sorted by SC id.
 *
 * Returns `[]` when neither a query nor a level is given. A level alone (empty
 * query) lists every SC at or below that level.
 */
export function search(
  query: string,
  opts: { level?: WCAGLevel } = {},
): SuccessCriterion[] {
  const q = query.trim().toLowerCase()
  if (!q && !opts.level) return []
  const max = opts.level ? LEVEL_ORDER[opts.level] : Infinity
  return Array.from(successCriteria.values())
    .filter(
      (sc) =>
        !q ||
        sc.id.includes(q) ||
        sc.title.toLowerCase().includes(q) ||
        sc.short_text.toLowerCase().includes(q),
    )
    .filter((sc) => LEVEL_ORDER[sc.level] <= max)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
}
