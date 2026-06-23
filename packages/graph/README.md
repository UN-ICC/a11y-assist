# a11y-graph

In-memory graph projection of the consolidated a11y dataset. Eight node
types, eight edge types, materialised at first call from `apg-query`,
`wcag-query`, `act-rules-query`, and `a11y-core`'s role-bindings.

This package is purely additive. Nothing inside it owns canonical data —
every node and edge is re-derivable from the upstream packages.

## Usage

```ts
import {
  getGraph,
  patternsReferencingSC,
  patternsReferencingACT,
  patternNeighborhood,
  scsWithoutACTCoverage,
  patternsWithoutPlatform,
  coverageSummary,
} from 'a11y-graph'

// Backlinks: which patterns apply to a given SC?
patternsReferencingSC('2.4.7')
// → ['accordion', 'alertdialog', 'breadcrumb', 'button', ...]

// Visual subgraph: pattern + 1-hop neighbours + ACT→SC and primitive→platform.
const sub = patternNeighborhood('button')
sub.forEachNode((id, attrs) => { /* ... */ })

// Coverage gaps.
scsWithoutACTCoverage()              // → SCs with no ACT rule pointing at them
patternsWithoutPlatform('react-native')

// Lightweight summary (used by the provenance page).
coverageSummary()
// → { totalSCs, scsWithoutACT, totalPatterns, patternsWithoutWeb, patternsWithoutRN }

// Full graph for ad-hoc traversals.
const g = getGraph()
g.order            // → ~670 nodes
g.size             // → ~1050 edges
```

## Node IDs

Composite, prefix-typed strings:

| Prefix | Examples |
|---|---|
| `pattern:` | `pattern:button`, `pattern:tabs` |
| `role:` | `role:button`, `role:tablist` |
| `sc:` | `sc:2.4.7`, `sc:1.4.3` |
| `tech:` | `tech:G149`, `tech:ARIA9` |
| `fail:` | `fail:F78` |
| `act:` | `act:97a4e1` |
| `primitive:html:` | `primitive:html:input`, `primitive:html:a` |
| `primitive:rn:` | `primitive:rn:Pressable` |
| `platform:` | `platform:web`, `platform:react-native` |

## Edge labels

`uses_role`, `applies_sc`, `validated_by`, `covers_sc`, `has_technique`,
`has_failure`, `binds_to`, `available_on`. See `ontology.md` at the repo
root for the full schema.

## Smoke test

```sh
npm run smoke -w a11y-graph
```

Prints node-type counts, a sample backlink query, and the `pattern:button`
neighbourhood.
