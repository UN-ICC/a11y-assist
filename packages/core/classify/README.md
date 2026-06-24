# classify/ — applicability model (work in progress)

Exploratory work toward a deterministic **applicability engine**: deciding which
WCAG Success Criteria apply to a component/instance from a set of boolean
*predicate* conditions, with the same method later applied to ACT rules
(applicability + conformance expectations).

**Not wired into the build or the published package.** This folder holds
intermediate artifacts for review; nothing here is imported by `src/`.

## Pipeline

1. **Extract** (blind, per-SC) — each WCAG SC → a boolean expression of atomic
   string predicates capturing its *applicability trigger* (when the SC's
   requirement comes into play), not its obligation. Granular: grouped
   exceptions are split into separate predicates.
   → `wcag-applicability.raw.json` (per-SC expression + predicates + evidence)
2. **Canonicalize** (global) — merge true synonyms into a controlled vocabulary;
   rewrite every expression against it.
   → `wcag-applicability.canon.json` (`{ predicates: registry, criteria: [...] }`)
3. **Classify** (this step) — tag each canonical predicate with a detectability
   class, a scope, and a one-line definition. The class drives how the engine
   surfaces each: guaranteed floor / agent-checked / ask-the-user checklist.
   → `wcag-predicates.classified.json`

## Files

| File | Contents |
|---|---|
| `wcag-scs.source.json` | Snapshot of the 86 SCs (id, title, level, normative `short_text`) the extraction ran against. |
| `wcag-applicability.raw.json` | Raw per-SC extraction (un-merged). 162 distinct predicate strings. |
| `wcag-applicability.canon.json` | Canonical registry (157 predicates) + 86 rewritten expressions. |
| `wcag-predicates.classified.json` | Canonical predicates + `class` / `scope` / `definition`. |
| `gen-docs.mjs` | Regenerates the [Classifier (WIP)](../../../docs/classifier.md) docs page (motivation, pipeline, reducibility charts, registry, per-SC table) from the artifacts above. Run from the repo root: `node packages/core/classify/gen-docs.mjs`. |

## Predicate classification

- **class** — can a11y-assist decide the predicate's truth?
  - `auto` — from the component's structural definition alone (ARIA roles +
    contract, native elements, keyboard table). The guaranteed floor.
  - `instance` — needs the authored markup/content (does it contain an image, a
    time limit, media…). The agent inspects the code.
  - `human` — needs judgment/semantics (is this "essential"? is link purpose
    "ambiguous to users in general"?). The ask-the-user checklist.
- **scope** — `component` | `page` | `process` | `site`.
- **definition** — the yes/no test that makes the predicate true.
