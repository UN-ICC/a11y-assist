# Target Architecture — redesign proposal

Status: **accepted — implementing.** Supersedes the aggregation model in `ARCHITECTURE.md`.

## Why

The current core tries to be a single polymorphic authority ("given a role, here are the SCs that apply, the native element, the RN component"). That forces an unverifiable editorial role→SC table, an RN mapping with no W3C source, a noisy role→ACT heuristic, and a lossy `html_native | apg_pattern | rn_primitive` resolution that hides APG guidance for native-backed roles. The redesign removes the authority claim and replaces it with **scoped entry points + mechanical, staged drill-down**.

## Principles

1. **Scoped entry points, never mixed.** Each agent scenario has its own tool with its own scope.
2. **Every field is verbatim, mechanically derived, or a runnable query — never an editorial assertion.** We hand the agent *queries to run*, not *claims about what applies*.
3. **Staged drill-down.** Each tool returns a small payload plus *suggested next queries*. The agent chooses depth. Nothing is pre-fetched across stages, so nothing bloats.
4. **One mechanical cross-corpus link: ACT rule → WCAG SC** (ACT front-matter). All other associations are *searched*, not stored.
5. **Conformance level (A / AA / AAA) is first-class**, set at the entry call and threaded through every drill-down. Cumulative: `AA` ⇒ A∪AA; `AAA` ⇒ all. Default `AA`.

## Layers

```
RECIPE SURFACES (entry points, platform-specific — "how do I build X")
  • APG            web composite components     (apg-query)        [now]
  • ARIA-in-HTML   web native primitives        (aria-query)       [now]
  • RN recipes     react-native components      (rn-query)         [reserved, not built]

SHARED CORPORA (drill-down targets, platform-agnostic — "the requirements & tests")
  • WCAG SCs / techniques / failures            (wcag-query)
  • ACT rules                                   (act-rules-query)

VERIFICATION (orthogonal)
  • axe over HTML / URL
```

Recipe surfaces are independent and never reference each other. All of them drill down into the same two corpora. RN slots in later as a peer recipe surface without touching anything else.

## The canonical workflow

Both entry points produce the same handful of fields and then **converge on one shared drill-down** (ACT → WCAG → verify). The entry differs; the drill-down does not.

**Flow A — building a composite component (APG entry, scenario 1)**

```
get_apg_pattern("dialog", level=AA)
   → verbatim APG card + ARIA contract + native elements
   → suggested_queries: [ search_act("dialog", AA), search_act("focus", AA) ]   ← ACT queries only
```

**Flow B — working on a native primitive (ARIA entry, scenario 2)**

APG has no card for primitives (text input, link, image), so the agent enters through the ARIA layer. Two directions, depending on what it knows:

```
# It knows the role:
get_aria_role("textbox", level=AA)
   → aria_contract (required/supported props, name_from, accessible_name_required)
   → native_elements: [ <input type=text>, <textarea> ]                          (aria-query, verbatim)
   → suggested_queries: [ search_act("textbox", AA), search_act("input", AA) ]    ← ACT queries only

# It only has the markup — resolve element → role first, then as above:
get_element_roles({ tag: "input", attrs: { type: "email" } })
   → ["textbox"]                                                                  (aria-query, verbatim)
   → then: get_aria_role("textbox", AA)
```

`get_aria_role`'s `suggested_queries` are seeded the same deterministic way as APG's — from the role name, its required ARIA props, and its native element tags.

**Shared drill-down (both flows converge here)**

```
agent runs →  search_act("dialog", AA)            # or search_act("textbox", AA) from Flow B
   → matching ACT rules, each with: name, applicability snippet, url,
     wcag_sc_ids (gated to ≤AA)            ← the mechanical ACT→SC bridge
   → suggested_queries: [ get_wcag_sc("4.1.2"), … ]

agent runs →  get_wcag_sc("4.1.2")
   → verbatim SC + sufficient techniques + documented failures

verify →  audit_html(snippet)  →  axe (covers contrast, target size, etc.)
```

Each step is one tool call with a small response. The agent decides how far to drill — and whichever entry point it started from, the conformance drill-down and verification are identical.

## Tool surface (MCP)

**Scenario 1 — APG entry (composite components)**
- `list_apg_patterns()` → canonical names.
- `get_apg_pattern(name, level=AA)` → `{ pattern (verbatim apg card), aria_contract, native_elements, suggested_queries }`. `suggested_queries` are `search_act` calls only, pre-stamped with `level`.

**Scenario 2 — ARIA entry (native primitives)**
- `get_aria_role(role, level=AA)` → `{ aria_contract, native_elements, suggested_queries }` (same shape, minus the APG card).
- `get_element_roles(html)` → roles an HTML element/attribute combo carries (element→role direction).

**Scenario 3 — React Native (reserved, not implemented)**
- Future `get_rn_pattern(name, level)` backed by a future `rn-query` package. Documented as a peer recipe surface so the abstraction holds; no code now.

**Drill-down (shared corpora)**
- `search_act(query, level=AA)` → ACT rules matching `query`, each with `wcag_sc_ids` filtered to ≤`level`; emits suggested `get_wcag_sc` calls.
- `get_act_rule(id)` → full verbatim rule.
- `search_wcag(query, level=AA)` → SCs matching `query`, gated by level.
- `get_wcag_sc(id)` → verbatim SC + techniques + failures. (Explicit by-id fetch is **not** level-gated — the agent asked for it.)

**Scenario 4 — verification**
- `audit_html(html, …)` / `audit_url(url, …)` → axe results. This is where contrast / target-size / focus-appearance are checked — mechanically, at the right moment.

## `suggested_queries` — deterministic seed derivation

Seeds come only from the entry's **structured fields** (no prose parsing, no curation):

| Seed source | Produces | Rank |
|---|---|---|
| `aria_roles` (role names) | `search_act(role)` | high |
| required ARIA props | `search_act(prop)` | high |
| native element tags | `search_act(tag)` | low |
| `keyboard_interactions` non-empty | `search_act("focus")`, `search_act("keyboard")` | medium |

Rank role-name and required-prop seeds above native-element seeds, and **cap** the list (≈5–7) so composite roles (e.g. `combobox`, which associates many native elements) don't dump 50 queries. Each suggested query carries a `why` naming its structural source, so it's traceable. Every suggested query is stamped with the entry's `level`.

## Level gating

- `level` is a parameter on entry tools and all drill-down tools; default `AA`; cumulative.
- Gating applies to **discovery** (`search_act`, `search_wcag`, and the `wcag_sc_ids` a rule reports) — not to explicit `get_*_by_id`.
- Filtering ACT by level requires joining ACT rule → its SCs → their levels. `act-rules-query` has no dependency on `wcag-query` (single-source by design), so **the join lives in the composition layer (`core`)**, not in the extractor.
- ACT rules with empty `wcag_sc_ids` (ARIA-spec-only, ~27 of them) carry no WCAG level → excluded from level-gated results. (Optionally surfaced in a separate "aria-spec" bucket only when unfiltered.)

## Package changes

- **apg-query** — unchanged (already verbatim). Optional: an alternate-name → canonical lookup for wayfinding.
- **wcag-query** — add `search(query, { level })`. Keep `getSC` / `getTechnique` / `getFailure`.
- **act-rules-query** — add `search(query)`. **Delete `rulesByRole` + `ROLE_SEARCH_TERMS`** (the editorial synonym map). Keep `getRule`, `rulesByWCAG` (mechanical), `listRules`.
- **core** — becomes purely mechanical:
  - **Delete** `src/data/role-bindings.json`, the `load-pattern` resolution either/or, the RN dimension, the per-pattern `wcag_applicable` assertion.
  - **Keep** `aria-contract` + `element-roles` (aria-query adapters) and `audit-response` (shared shaper).
  - **Add** `composeApgPattern(name, level)` and `composeAriaRole(role, level)` (card/contract + native elements + seed-derived `suggested_queries`), and the ACT→SC→level join helper used for gating.
- **mcp** — new tool surface above; plus the separately-tracked robustness work (timeouts, richer audit output, audit provenance).
- **site** — adopts the same compose functions (no drift). Pattern pages drop the editorial "Applicable WCAG SCs" section; they show ARIA contract + native elements and link into the WCAG/ACT browsers. (A mechanical, level-aware "related ACT rules" list computed at build time from the same search is optional.)

## What gets deleted (residue elimination)

- `packages/core/src/data/role-bindings.json` — the entire editorial table (per-role SCs **and** RN primitives).
- `act-rules-query` `ROLE_SEARCH_TERMS` + `rulesByRole`.
- The React Native platform dimension (`Platform` type, `rn_primitive`, `react-native` branches).
- `load-pattern`'s `html_native | apg_pattern | rn_primitive` resolution.
- The per-pattern `wcag_applicable` assertion.

## Honest scope (the ACT blind spot)

ACT publishes no rules for several visual/perceptual SCs — contrast (1.4.3), target size (2.5.5/2.5.8), focus appearance (2.4.7 visual), focus order (2.4.3). The ACT bridge therefore won't surface them, **by design**. They are handled where they belong:
- **Contrast and target size** → caught by **axe at verification** (scenario 4).
- The remainder → manual review (already the documented ~50% that automation can't cover).

No per-pattern editorial assertion is made for any of them. This is the deliberate trade: an honest, mechanical drill-down with a known, documented blind spot covered by verification — instead of an unverifiable per-role SC list.

## Sequencing (after this is locked)

1. `act-rules-query`: add `search`, remove `rulesByRole`/`ROLE_SEARCH_TERMS` (+ tests).
2. `wcag-query`: add `search` (+ tests).
3. `core`: add compose functions + level join; delete editorial (+ tests, incl. golden seed-derivation expectations).
4. `mcp`: new tool surface; robustness pass.
5. `site`: adopt compose functions; drop editorial backlinks; rebuild.
6. Docs: replace the aggregation sections of `ARCHITECTURE.md` with this model.

## Resolved decisions

- **No ranking or cap on `suggested_queries`.** Emit the full deterministic seed-derived list (deduped); the agent picks. `search_act` / `search_wcag` likewise return all matches unranked — selection is the agent's job.
- **Distinct response types, APG is a superset.** `get_aria_role` returns `{ role, aria_contract, native_elements, suggested_queries }`. `get_apg_pattern` returns the same plus the verbatim `apg` card. The agent always knows which fields a given tool yields.
- **Search is simple substring match** (case-insensitive) over the relevant verbatim fields — ACT: rule name + applicability text; WCAG: id + title + statement. No heuristics.

## Final step (after code)

A short **skill file** for the agent: the four scenarios, the staged workflow, the tools, and what each response contains — so the agent knows what to use, how, and what to expect.
