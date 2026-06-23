# The a11ycat Ontology

We have not just been building a tool — we've been mapping a knowledge graph.

This document outlines the ontology that emerged from consolidating four W3C documents (WAI-ARIA, APG, WCAG, ACT) plus platform-specific bindings. Once you see it as an ontology, several things become clearer: where authority lives, what relationships matter, where the editorial residue actually sits, and what kinds of new questions the data can answer.

## Node types

Eight distinct classes of entity, each sourced from a specific authority:

| Node type | Source | Example |
|---|---|---|
| **Pattern** | APG (`apg-query`) + role-bindings | `button`, `dialog`, `tabs`, `combobox` |
| **Role** | WAI-ARIA spec (`aria-query`) | `button`, `tablist`, `option`, `dialog` |
| **WCAG SC** | WCAG 2.2 (`wcag-query`) | `2.4.7` Focus Visible (Level AA) |
| **WCAG Technique** | WCAG 2.2 (`wcag-query`) | `G149` Using user interface components highlighted by user agent |
| **WCAG Failure** | WCAG 2.2 (`wcag-query`) | `F78` Failure due to styling element outlines… |
| **ACT Rule** | ACT (`act-rules-query`) | `97a4e1` Button has non-empty accessible name |
| **Primitive** | role-bindings (small editorial) + ARIA in HTML / RN docs | HTML `<input type="text">`, RN `Pressable` |
| **Platform** | enumeration | `web`, `react-native` |

## Edge types

Eight distinct relationships:

| Edge type | From → To | Source | Multiplicity |
|---|---|---|---|
| **uses_role** | Pattern → Role | APG (composite roles per pattern) | many-to-many |
| **applies_sc** | Pattern → SC | role-bindings (floor) ∪ ACT (mechanical) | many-to-many |
| **validated_by** | Pattern → ACT Rule | ACT applicability heuristic | many-to-many |
| **covers_sc** | ACT Rule → SC | ACT front-matter | many-to-many |
| **has_technique** | SC → Technique | WCAG Understanding pages | one-to-many |
| **has_failure** | SC → Failure | WCAG Understanding pages | one-to-many |
| **binds_to** | Pattern → Primitive | role-bindings (per platform) | many-to-many (one per platform) |
| **available_on** | Primitive → Platform | role-bindings | many-to-one |

## Why this matters

The ontology framing surfaces several useful properties:

1. **The editorial residue is one specific edge.** Of all eight relationships, only **`applies_sc`** depends on hand-curated input (the role-bindings supplemental SCs, plus the ACT-rule heuristic mapping). The other seven are derived from authoritative upstream data. That's the entire editorial surface — one edge type out of eight.

2. **Each node type has a single source of authority.** No node sits in two sources. This means refreshing a snapshot updates a well-bounded slice of the graph; no cross-package coordination needed.

3. **Cross-references are computable, not authored.** "Which patterns reference this SC?" is just a graph traversal, not a maintained list. Our website's backlinks are computed from the graph at build time.

4. **New question types become possible.** Once you see the ontology, you can ask:
   - "Show me every SC that no ACT rule covers" (ACT coverage gap analysis)
   - "Show me every primitive that has no APG counterpart" (primitive-only paths)
   - "Show me the longest chain Pattern → SC → Technique (sufficient ways to satisfy a button's WCAG obligations)"
   - "Cluster ACT rules by which SCs they share" (similarity analysis)

   These are just graph queries against the same data the MCP server already serves.

5. **Extensions become principled.** A DS extension is a graph extension: it adds custom Pattern nodes (the DS components), adds new edges (DS rule → SC, DS rule → axe rule), and optionally classifies novel components. The contract isn't "plug code in" — it's "extend this ontology consistently."

## Visualisation

The website's `/ontology.html` page renders this with [Cytoscape.js](https://js.cytoscape.org/). Two views:

- **Schema view** — the eight node types and eight edge types as a small, readable diagram. Useful for "what does the data model look like?"
- **Instance view** — pick a pattern (e.g. `button`) and see its actual neighbourhood (its roles, applicable SCs, ACT rules, primitives). Useful for "what does the data look like for X?"

The full instance graph (~650 nodes, several thousand edges) is too dense for a useful single view, so we default to per-pattern subgraphs.

## In-memory graph engine

`packages/graph/` (`a11y-graph`) materialises the ontology in memory using [graphology](https://graphology.github.io/). It is the engine behind:

- The website's SC and ACT backlinks (computed via `patternsReferencingSC` / `patternsReferencingACT` instead of looping over loaded patterns).
- The ontology page's per-pattern subgraphs (extracted via `patternNeighborhood`).
- The provenance page's coverage block (computed via `coverageSummary`).

The graph is purely additive — every node and edge is derivable from `apg-query`, `wcag-query`, `act-rules-query`, and the `a11y-core` role-bindings. Nothing inside `a11y-graph` is canonical; rebuilding it (`rebuildGraph()`) is always safe.

## What this is not

- Not a formal OWL/RDF ontology. We're not generating triples, running reasoners, or claiming SHACL conformance. The framing is informal.
- Not a single source of truth. Each node still ultimately references its upstream W3C document; we're a navigation layer, not a replacement.
- Not stable in the strict ontology-engineering sense. As ACT publishes more rules, edges shift. As WCAG 3.0 ships, node types may evolve. The ontology is a useful lens *now*, with the data we have *now*.

But the framing is right. We have node types, we have edge types, we have computable relationships, and we have a visualisation to reason about it. That's an ontology — small "o".
