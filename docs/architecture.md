---
title: Architecture
nav_order: 3
permalink: /architecture/
---

# Architecture

How a11y-assist is put together: the accessibility model it encodes, the sources it draws from, and the discipline that keeps every claim traceable. For setup, see [For agents]({{ '/agents/' | relative_url }}); for the tools, the [a11y-assist-mcp package]({{ '/packages/a11y-assist-mcp/' | relative_url }}).

## The principle

**Aggregation, not authorship.** Every claim the system makes is derivable from a versioned upstream source. There is no LLM-paraphrased "best practice" content, and **no editorial role→SC or role→rule mapping** that could silently drift from the spec.

Where W3C documents the content — APG patterns, WCAG Success Criteria, Techniques, Failures, ACT rules, the WAI-ARIA spec — a11y-assist extracts it verbatim into query packages. The system composes these sources at request time and hands the agent verbatim data plus *queries to run next*; the LLM agent does the synthesis (recommendations, code, fixes) by reasoning over the structured inputs. The one mechanical cross-corpus link is **ACT rule → WCAG SC**, taken straight from ACT front-matter.

## The accessibility model

Web accessibility is a layered system. Each layer has a clear authority and scope.

```
WCAG 2.2          requirements — what must be true for users (normative)
   │
   ├── APG        recipes for custom / composite components (combobox, tabs, tree, dialog…)
   └── HTML+ARIA  recipes for native primitives (input, a, img, button, select…)
   │
WAI-ARIA          vocabulary — roles, states, properties (normative)
   │
Browsers + AT     the user's actual experience (NVDA, VoiceOver, JAWS, TalkBack)
```

Each layer enables the one above: HTML + ARIA give you the words; APG shows how to compose them into working components; WCAG is the standard that says whether the result is acceptable; assistive technology is what users actually experience. The whole stack exists to serve that last layer.

The recipe layer (APG / HTML primitives) splits in two because APG only covers *custom or composite* components. For native primitives — text inputs, links, images — there is no APG pattern; the answer is "use the right HTML element," governed by the HTML spec and [ARIA in HTML](https://www.w3.org/TR/html-aria/). A real product uses both halves.

### The W3C sources, and how each is used

| Source | Authority | Role | Access |
|---|---|---|---|
| **WCAG 2.2** | Normative | The requirements: Success Criteria + Sufficient Techniques + documented Failures | [`wcag-query`](/a11y-assist/packages/wcag-query/) |
| **WAI-ARIA** | Normative | The vocabulary: roles, states, properties | [`aria-query`](https://www.npmjs.com/package/aria-query) (npm) |
| **APG** | Informative | Recipes for custom / composite components | [`apg-query`](/a11y-assist/packages/apg-query/) |
| **ARIA in HTML** | Normative | Maps native HTML elements to implicit ARIA roles | via `aria-query`'s element/role maps |
| **ACT Rules** | Informative | Conformance tests; each maps to the WCAG SCs it covers | [`act-rules-query`](/a11y-assist/packages/act-rules-query/) |

APG and ARIA-in-HTML sit at the same conceptual altitude — APG for custom components, HTML primitives for native ones. The decision tree: is there a native element? Use it. Augmenting one? Apply the matching APG pattern. Building from scratch? Use the APG pattern plus ARIA roles and keyboard handling. Nothing fits? It's novel — combine primitives and apply WCAG general principles, and expect heavier manual testing.

> **Platform scope.** Today a11y-assist is **web only**. React Native is a reserved future recipe surface (a peer to APG, sourced from RN docs) — see [For agents](/a11y-assist/agents/). It is not implemented; nothing in the current system asserts RN guidance.

## The pipeline

```
Upstream                  Extractor / Loader               Query package           Compose (a11y-assist-core)
─────────────────────────────────────────────────────────────────────────────────────────────────────
W3C APG HTML        →  apg-query/tools/extract.ts      →  apg-query/src/data/*   ┐
W3C WCAG HTML       →  wcag-query/tools/extract.ts     →  wcag-query/src/data/*  ├→  composeApgPattern
ACT Rules YAML/MD   →  act-rules-query/tools/load-yaml →  act-rules-query/data   ┤   composeAriaRole
WAI-ARIA (npm)      →  [no extraction — aria-query]    →  aria-query             ┘   searchAct (ACT→SC)
                                                                                          ▼
                                                                              response to consumer
```

Each query package owns exactly one upstream source. `a11y-assist-core` knows nothing about scraping HTML or parsing YAML — it imports `getPattern`, `getSC`, `search`, etc. and composes them, with **no data of its own**.

The composition does not assert "which SCs apply." Instead:

1. **Entry** — `composeApgPattern(name, level)` (composite components) or `composeAriaRole(role, level)` (native primitives). Each returns the verbatim recipe + the ARIA contract for its roles + the native HTML elements that carry them (all mechanical) + `suggested_queries`.
2. **`suggested_queries`** are `search_act` calls derived deterministically from the entry's structured fields (role names, required ARIA props, native element tags, and a focus/keyboard seed when a keyboard table exists), stamped with the conformance `level`.
3. **Drill-down** — the agent runs a suggested query: `searchAct(query, level)` returns ACT rules whose covered WCAG SCs are gated to the level (the one mechanical ACT→SC bridge); then `getSC(id)` expands a criterion into techniques + failures.

The level gate (`A`/`AA`/`AAA`, cumulative) is the only place `a11y-assist-core` joins ACT to WCAG levels, because the extractor packages stay single-source. See [For agents](/a11y-assist/agents/) for the full tool surface and workflow.

## Snapshot discipline

Each query package commits its raw upstream HTML/YAML to `snapshots/`. Re-running the extractor against a committed snapshot produces byte-identical output to what's in `src/data/`. This gives:

- **Reproducibility** — anyone with the snapshot can re-derive the data.
- **Auditability** — a reviewer can diff snapshot against extracted JSON to verify the extractor introduces no errors.
- **Versioning** — the snapshot date is part of the package's identity and is surfaced in every response's `provenance`.

Refreshing against current upstream re-fetches the page, overwrites the snapshot, and re-runs extraction; the result is a reviewable git diff. **Updating snapshots is a deliberate, reviewed action — never automatic.**

```sh
npm run extract --workspace=apg-query -- --refresh
npm run extract --workspace=wcag-query -- --refresh
```

## No editorial residue

There is no hand-maintained applicability data. `a11y-assist-core` ships **no data of its own**: every field is verbatim from a query package or `aria-query`, mechanically derived from one (the ARIA contract, native elements), or a `search_act` query the agent runs itself. The role→SC question that used to require an editorial table is now answered by the agent drilling down through `search_act` → the mechanical ACT→SC bridge.

The cost of this honesty is a known blind spot: ACT publishes no rules for several visual/perceptual SCs (contrast `1.4.3`, target size `2.5.5`/`2.5.8`, focus appearance `2.4.7`, focus order `2.4.3`), so `search_act` won't surface them. They are caught by **axe at verification** (contrast, target size) and by manual review — never asserted per-pattern.

## Honest scope

Automated tooling catches roughly **half** of WCAG. Treat a passing audit as *"no automated violations found,"* not *"accessible."* Out of scope, by design:

- **Manual screen reader review** — NVDA, JAWS, VoiceOver, TalkBack interpret the same code differently.
- **Manual keyboard review** — every interaction reachable, focus order matches visual order, focus always visible, no traps.
- **Cognitive review** — clear language, predictable behaviour, error recovery, no reliance on colour or shape alone.
- **ACT's blind spot** (contrast, target size, focus appearance/order) — caught by axe at verification, not asserted per pattern.
- **React Native** — not implemented (web only).

## Contributing data

**Add an APG pattern:** add an entry to `apg-query/tools/extract.ts`'s pattern list → `npm run extract --workspace=apg-query` (fetches, snapshots, writes data) → commit snapshot + data. No bindings to maintain — the compose layer derives the ARIA contract, native elements, and drill-down seeds mechanically.

**Add a WCAG SC:** add an entry to `wcag-query/tools/extract.ts`'s SC list → `npm run extract --workspace=wcag-query` → commit snapshot + data.

**Refresh ACT rules:** copy the upstream `_rules/*.md` into `act-rules-query/snapshots/_rules/` → `npm run load --workspace=act-rules-query` (records the upstream commit hash) → diff-review and commit.

When upstream HTML structure shifts, the extractor may need updating; the `WARN: <pattern> has empty <field>` messages are the early signal. Pull a fresh snapshot, diff the output, fix the extractor, re-run until the diff is clean.
