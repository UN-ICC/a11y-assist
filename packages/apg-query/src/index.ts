/**
 * apg-query — programmatic access to the W3C ARIA Authoring Practices Guide.
 *
 * Data lives in src/data/, written by tools/extract.ts. The set of available
 * patterns is enumerated in src/data/_manifest.json so this file doesn't have
 * to hard-code each pattern — adding a new pattern is just adding it to the
 * extractor's PATTERNS list and re-running.
 */

import { createRequire } from 'node:module'
import type { APGPattern, APGSnapshot } from './types.js'

export type { APGPattern, KeyboardInteraction, Example, APGSnapshot } from './types.js'

const requireFromHere = createRequire(import.meta.url)

const manifest = requireFromHere('./data/_manifest.json') as { roles: string[] }
export const APG_SNAPSHOT: APGSnapshot = requireFromHere('./data/_snapshot.json')

const PATTERN_LIST: APGPattern[] = manifest.roles.map(
  (role) => requireFromHere(`./data/${role}.json`) as APGPattern,
)

/** Map of role → APG pattern. The canonical lookup surface. */
export const patterns: ReadonlyMap<string, APGPattern> = new Map(
  PATTERN_LIST.map((p) => [p.role, p]),
)

/** Get a pattern by canonical role name. Returns undefined if unknown. */
export function getPattern(role: string): APGPattern | undefined {
  return patterns.get(role.toLowerCase())
}

/** All canonical role names available in this dataset, sorted. */
export function listPatterns(): string[] {
  return Array.from(patterns.keys()).sort()
}
