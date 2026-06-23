/**
 * Tiny adapter around graphology's package exports.
 *
 * Under Node ESM + node16 module resolution, named imports of graphology's
 * sub-classes (e.g. DirectedGraph) fail at runtime because graphology's CJS
 * endpoint sets `module.exports = Graph` with the others attached as static
 * properties. Even the default import has interop quirks under TypeScript's
 * node16 mode. The cleanest workaround is to load via `createRequire`, which
 * yields the CJS value directly, and pass `type: 'directed'` to the default
 * Graph constructor.
 */

import { createRequire } from 'node:module'
import type { AbstractGraph, Attributes } from 'graphology-types'

const requireFromHere = createRequire(import.meta.url)

interface GraphConstructor {
  new <N extends Attributes, E extends Attributes>(options?: {
    type?: 'directed' | 'undirected' | 'mixed'
    multi?: boolean
    allowSelfLoops?: boolean
  }): AbstractGraph<N, E>
}

const Graph = requireFromHere('graphology') as GraphConstructor

export function newDirectedGraph<
  N extends Attributes = Attributes,
  E extends Attributes = Attributes,
>(): AbstractGraph<N, E> {
  return new Graph<N, E>({
    type: 'directed',
    multi: false,
    allowSelfLoops: false,
  })
}
