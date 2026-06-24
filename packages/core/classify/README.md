# classify/ — applicability + verification model (work in progress)

Exploratory work toward a deterministic **applicability + verification engine**:
deciding which WCAG Success Criteria apply to a component/instance from boolean
*predicate* conditions, then which *postconditions* must hold to conform.

**Not wired into the build or the published package.** This folder holds
intermediate artifacts for review; nothing here is imported by `src/`.

## Pipeline

Two parallel layers — **applicability** (when an SC applies) and **verification**
(what must hold to conform) — each run through the same three steps:

1. **Extract** (blind, per-SC) — each WCAG SC → a boolean expression of atomic
   string predicates. Applicability captures the *trigger* (not the obligation);
   verification captures the *obligation* (not the trigger). Granular: grouped
   cases are split into separate predicates.
   → `*.raw.json` (per-SC expression + predicates + evidence)
2. **Canonicalize** (global) — merge true synonyms into a controlled vocabulary;
   rewrite every expression against it.
   → `*.canon.json` (`{ predicates: registry, criteria: [...] }`)
3. **Classify** — tag each canonical predicate with a `class`, a `scope`, and a
   one-line `definition`. The class routes how the engine surfaces each:
   guaranteed floor / agent-checked / ask-the-user checklist.
   → `*.classified.json`

A reducibility finding fell out of running both layers: the verification layer is
**not** more compressible than applicability — WCAG obligations are bespoke per
criterion by design. The payoff is per-component routing, not global compression.
(`act-verification.canon.json` holds a parallel V extracted from ACT rule
descriptions, used only for that comparison.)

## Files

| File | Contents |
|---|---|
| `wcag-scs.source.json` | Snapshot of the 86 SCs (id, title, level, normative `short_text`) the extraction ran against. |
| **Applicability** | |
| `wcag-applicability.raw.json` | Raw per-SC extraction (un-merged). 162 distinct predicate strings. |
| `wcag-applicability.canon.json` | Canonical registry (157 predicates) + 86 rewritten expressions. |
| `wcag-predicates.classified.json` | Canonical applicability predicates + `class` / `scope` / `definition`. |
| **Verification** | |
| `wcag-verif.raw.json` | Raw per-SC obligation extraction (un-merged). 159 distinct predicate strings. |
| `wcag-verification.canon.json` | Canonical registry (148 predicates) + 86 rewritten obligation expressions. |
| `wcag-verification.classified.json` | Canonical verification predicates + `class` / `scope` / `definition`. |
| `act-verification.canon.json` | Parallel V from ACT rule descriptions (38 covered SCs) — for the reducibility comparison only. |
| **Tooling** | |
| `gen-docs.mjs` | Regenerates the Classifier docs pages — `docs/classifier/predicates.md` (registries, expressions, reducibility) and `docs/classifier/assessment.md` (the automation assessment) — from the artifacts above. Run from the repo root: `node packages/core/classify/gen-docs.mjs`. |

## Predicate classification

- **Applicability `class`** — can a11y-assist decide the trigger? `auto` (from the
  component's structure — ARIA roles + contract, native elements, keyboard table),
  `instance` (needs the authored markup), `human` (needs judgment).
- **Verification `tier`** — how the postcondition is resolved *after the build*,
  matched against axe-core's actual rule set: `axe` (an axe rule verifies it —
  matched rule ids stored in `axe_rules`), `agent` (no axe rule, but an AI agent
  can confirm it by inspecting the built code), `human` (judgment still required).
  Each criterion's obligation then rolls up to a `residue`: `axe-complete`,
  `agent-closable` (no user needed), or `needs-human`.
- **scope** — `component` | `page` | `process` | `site`.
- **definition** — the yes/no test for the predicate.
