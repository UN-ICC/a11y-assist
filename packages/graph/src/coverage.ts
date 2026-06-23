/**
 * Coverage / gap-analysis queries. These reveal where the dataset is thin —
 * SCs without ACT rule coverage, patterns missing primitives on a platform,
 * etc. Useful for the provenance page and as input for future tooling.
 */

import { getGraph } from './build.js'

/** SCs that have no incoming `covers_sc` edge from any ACT rule. */
export function scsWithoutACTCoverage(): string[] {
  const g = getGraph()
  const out: string[] = []
  g.forEachNode((id, attrs) => {
    if (attrs.type !== 'sc') return
    let hasACT = false
    g.forEachInNeighbor(id, (nb) => {
      if (g.getNodeAttribute(nb, 'type') === 'act') hasACT = true
    })
    if (!hasACT) out.push(id.replace(/^sc:/, ''))
  })
  return out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

/**
 * Patterns that have no element or primitive `available_on` the requested
 * platform. Web-side: walks Pattern → Element → platform:web (derived).
 * RN-side: walks Pattern → Primitive → platform:react-native (editorial).
 */
export function patternsWithoutPlatform(platform: 'web' | 'react-native'): string[] {
  const g = getGraph()
  const platformId = `platform:${platform}`
  const targetTypes: ReadonlyArray<string> =
    platform === 'web' ? ['element', 'primitive'] : ['primitive']
  const out: string[] = []
  g.forEachNode((id, attrs) => {
    if (attrs.type !== 'pattern') return
    let connected = false
    g.forEachOutNeighbor(id, (nb) => {
      if (!targetTypes.includes(g.getNodeAttribute(nb, 'type'))) return
      g.forEachOutNeighbor(nb, (pl) => {
        if (pl === platformId) connected = true
      })
    })
    if (!connected) out.push(id.replace(/^pattern:/, ''))
  })
  return out.sort()
}

/** Lightweight summary used by the provenance page. */
export function coverageSummary(): {
  totalSCs: number
  scsWithoutACT: number
  totalPatterns: number
  patternsWithoutWeb: number
  patternsWithoutRN: number
} {
  const g = getGraph()
  const totalSCs = g.filterNodes((_, a) => a.type === 'sc').length
  const totalPatterns = g.filterNodes((_, a) => a.type === 'pattern').length
  return {
    totalSCs,
    scsWithoutACT: scsWithoutACTCoverage().length,
    totalPatterns,
    patternsWithoutWeb: patternsWithoutPlatform('web').length,
    patternsWithoutRN: patternsWithoutPlatform('react-native').length,
  }
}
