/**
 * Read-side helpers over the materialised graph. These are the operations
 * other packages actually call — they hide the prefix conventions and the
 * graphology API.
 */

import { newDirectedGraph } from './_graphology.js'
import { getGraph } from './build.js'
import type { A11yGraph, EdgeAttributes, NodeAttributes, NodeType } from './types.js'

/** Strip the `<type>:` prefix from a composite node id. */
function unprefix(id: string): string {
  const i = id.indexOf(':')
  return i === -1 ? id : id.slice(i + 1)
}

export function nodesByType(type: NodeType): string[] {
  const g = getGraph()
  return g.filterNodes((_, attrs) => attrs.type === type).sort()
}

export function neighborsOf(
  id: string,
  opts: { direction?: 'in' | 'out' | 'both'; ofType?: NodeType } = {},
): string[] {
  const g = getGraph()
  if (!g.hasNode(id)) return []
  const direction = opts.direction ?? 'both'
  let result: string[]
  if (direction === 'in') result = g.inNeighbors(id)
  else if (direction === 'out') result = g.outNeighbors(id)
  else result = g.neighbors(id)
  if (opts.ofType) {
    result = result.filter((n) => g.getNodeAttribute(n, 'type') === opts.ofType)
  }
  return result.sort()
}

/**
 * BFS subgraph: every node reachable from `id` within `hops` steps, and every
 * edge between any two of those nodes. Direction is ignored so the returned
 * graph reflects the local neighbourhood rather than a directed reachability
 * cone.
 */
export function subgraphAround(id: string, hops: number): A11yGraph {
  const g = getGraph()
  const sub: A11yGraph = newDirectedGraph<NodeAttributes, EdgeAttributes>()
  if (!g.hasNode(id)) return sub
  const visited = new Set<string>([id])
  let frontier: string[] = [id]
  for (let h = 0; h < hops; h++) {
    const next: string[] = []
    for (const node of frontier) {
      for (const nb of g.neighbors(node)) {
        if (!visited.has(nb)) {
          visited.add(nb)
          next.push(nb)
        }
      }
    }
    frontier = next
    if (frontier.length === 0) break
  }
  for (const n of visited) {
    sub.addNode(n, { ...g.getNodeAttributes(n) })
  }
  g.forEachEdge((_e, attrs, source, target) => {
    if (visited.has(source) && visited.has(target) && !sub.hasEdge(source, target)) {
      sub.addEdge(source, target, { ...attrs })
    }
  })
  return sub
}

/**
 * Curated per-pattern subgraph: the pattern + its 1-hop neighbours (roles,
 * SCs, ACT rules, primitives) + the small 2-hop expansions that complete the
 * picture (ACT→SC, primitive→platform). Techniques and failures are
 * intentionally excluded — they explode the visual.
 */
export function patternNeighborhood(role: string): A11yGraph {
  const g = getGraph()
  const sub: A11yGraph = newDirectedGraph<NodeAttributes, EdgeAttributes>()
  const id = `pattern:${role}`
  if (!g.hasNode(id)) return sub

  const include = new Set<string>([id])
  for (const nb of g.outNeighbors(id)) include.add(nb)
  // Two-hop expansion through ACT, element, and primitive nodes — captures
  // ACT→SC, element→role/platform, primitive→platform without exploding the
  // visual.
  for (const nb of g.outNeighbors(id)) {
    const t = g.getNodeAttribute(nb, 'type')
    if (t !== 'act' && t !== 'element' && t !== 'primitive') continue
    for (const n2 of g.outNeighbors(nb)) include.add(n2)
  }

  for (const n of include) sub.addNode(n, { ...g.getNodeAttributes(n) })
  g.forEachEdge((_e, attrs, source, target) => {
    if (include.has(source) && include.has(target) && !sub.hasEdge(source, target)) {
      sub.addEdge(source, target, { ...attrs })
    }
  })
  return sub
}

export function patternsReferencingSC(scId: string): string[] {
  const g = getGraph()
  const sid = `sc:${scId}`
  if (!g.hasNode(sid)) return []
  const out: string[] = []
  for (const n of g.inNeighbors(sid)) {
    if (g.getNodeAttribute(n, 'type') === 'pattern') out.push(unprefix(n))
  }
  return out.sort()
}

export function patternsReferencingACT(ruleId: string): string[] {
  const g = getGraph()
  const aid = `act:${ruleId}`
  if (!g.hasNode(aid)) return []
  const out: string[] = []
  for (const n of g.inNeighbors(aid)) {
    if (g.getNodeAttribute(n, 'type') === 'pattern') out.push(unprefix(n))
  }
  return out.sort()
}
