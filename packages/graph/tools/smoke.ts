/**
 * Smoke test: prints summary counts and a sample subgraph so a maintainer can
 * eyeball whether the build is sane. Not a unit test — meant to be run by
 * hand: `npm run smoke -w a11y-graph`.
 */

import {
  getGraph,
  nodesByType,
  patternsReferencingSC,
  patternNeighborhood,
  coverageSummary,
} from '../src/index.js'

const g = getGraph()

const counts = {
  pattern: nodesByType('pattern').length,
  role: nodesByType('role').length,
  sc: nodesByType('sc').length,
  technique: nodesByType('technique').length,
  failure: nodesByType('failure').length,
  act: nodesByType('act').length,
  element: nodesByType('element').length,
  primitive: nodesByType('primitive').length,
  platform: nodesByType('platform').length,
}

console.log('node counts:', counts)
console.log('total nodes:', g.order)
console.log('total edges:', g.size)
console.log()
console.log("patterns referencing SC '2.4.7':", patternsReferencingSC('2.4.7'))
console.log()
console.log('pattern:button neighborhood:')
const sub = patternNeighborhood('button')
console.log(`  nodes (${sub.order}):`, sub.nodes())
console.log(`  edges (${sub.size}):`)
sub.forEachEdge((_, attrs, source, target) => {
  console.log(`    ${source} --${attrs.label}--> ${target}`)
})
console.log()
console.log('coverage summary:', coverageSummary())
