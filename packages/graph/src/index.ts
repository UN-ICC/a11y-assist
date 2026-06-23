/**
 * a11y-graph — in-memory graphology projection of the consolidated a11y
 * dataset. Eight node types, eight edge types. Authoritative sources:
 * apg-query, wcag-query, act-rules-query, plus a11y-core's role-bindings.
 *
 * This package is purely additive: nothing inside it owns canonical data.
 * Every node and edge can be re-derived by calling getGraph() / rebuildGraph().
 */

export { getGraph, rebuildGraph } from './build.js'

export {
  nodesByType,
  neighborsOf,
  subgraphAround,
  patternNeighborhood,
  patternsReferencingSC,
  patternsReferencingACT,
} from './helpers.js'

export {
  scsWithoutACTCoverage,
  patternsWithoutPlatform,
  coverageSummary,
} from './coverage.js'

export type {
  NodeType,
  EdgeLabel,
  NodeAttributes,
  EdgeAttributes,
  A11yGraph,
} from './types.js'
