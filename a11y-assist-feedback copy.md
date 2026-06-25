# a11y-assist — Feedback

**Author:** Claude (Opus 4.8), as the agent using the skill
**Date:** 2026-06-25
**Context:** Built an accessible React todo app end-to-end — tasks, plus
Categories and Users CRUD pages and task→category/user assignment — using the
a11y-assist MCP server throughout (APG/ARIA/WCAG lookups, `audit_html` /
`audit_url`, `evaluate_applicability`, `evaluate_verification`).

> **One-line takeaway:** Conceptually excellent and genuinely capable. Its core
> weakness is ergonomic, not conceptual — its best work (applicability
> refinement) is opt-in, while the cheap path (axe → `passed: true` → checklist)
> is frictionless. So a rushed user gets a confident-looking but shallow result.
> Tighten that gradient and close the layout/dynamic gap and it would be hard to
> misuse.

---

## What worked well

### The tiered verification model (axe / agent / human)
Routing every check by *who can settle it* is the conceptual core, and it held
up across every component. It maps cleanly onto reality and is the thing I would
keep unchanged.

### `evaluate_applicability` (gate-first) is the standout feature
Walking gates → subgates → predicates → SC set pruned ~9 coarse questions down to
only what the component could be affected by, and it surfaced **28 applicable
success criteria against the ~8 structural floor** — including **3.3.1 Error
Identification**, a real bug (empty-submit silently rejected) that axe is
*structurally incapable* of catching. That single tool turned a vague "looks
accessible" into a concrete, falsifiable list.

### `evaluate_verification` enforcing "unverified ≠ pass"
The right accountability primitive. It forced an honest **15 pass / 1 fail / 12
unverified** verdict instead of the all-green checklist I had initially printed.
That framing discipline is rare and correct.

### `get_apg_pattern` gives decisive, citable answers
For the Users page, `get_apg_pattern("table")` settled native `<table>` vs ARIA
`grid` with the verbatim rationale ("each widget in a table is a separate tab
stop"). Authoritative W3C data beats reasoning from memory, and the citation made
the design decision defensible.

---

## Friction

### 1. The best feature is optional, and the path of least resistance is too smooth
**Biggest issue.** My first pass leaned on axe alone and printed green
checklists — and nothing in the workflow stopped me. `audit_html` returns
`passed: true`, which reads as a verdict even though the caveats beneath it say
"covers ~50% of WCAG." The boolean psychologically overrides the caveats. It took
an explicit user challenge ("you just used axe") to make me run the refinement
the tooling already supported. The capability was there; the affordances quietly
rewarded the shortcut.

### 2. `evaluate_applicability` has a real statefulness / instruction bug
Step 2's response instructed: "call again with `subgates` = those ids." Doing
exactly that **reset the engine to step 1 (gates)**. It only advanced when I
passed `facets` **and** `subgates` together. The instruction text contradicts the
actual contract — a concrete, fixable defect that costs a confused round-trip.

### 3. Predicate selection is judgment-heavy, unguided, and silently decides the honesty of the output
Choosing which of ~50 leaf predicates "hold" involves genuinely subtle calls
(e.g. is rejecting an empty submit `input-error-automatically-detected`? is an
SPA route change `change-of-context`?). A lazy or wrong selection quietly shrinks
the SC set and yields a *falsely* clean result — the same overconfidence trap one
level down, now invisible. The tool trusts the selection completely, with no
nudge toward commonly-missed predicates.

### 4. `evaluate_verification` is a ledger, not a check
It trusts the pass/fail ids asserted to it — mark everything `pass` and it
reports all-green. It enforces *discipline*, not *truth*. The name slightly
oversells what it does.

### 5. The toolkit stops exactly where a lot of AA lives
`audit_html` is static/snippet-based — no reflow, resize, text-spacing, focus
management, or live-region timing. `audit_url` exists but runs a fixed viewport
with no manipulation knobs. To settle **1.4.10 Reflow**, **1.4.4 Resize Text**,
and **1.4.12 Text Spacing** I had to leave the toolkit entirely and hand-build a
Playwright harness (locate a cached Chromium, measure horizontal overflow at
320px / 200% zoom / with WCAG spacing overrides injected). That harness then
caught **four real regressions** when the Users feature landed — so these SCs
matter a great deal, and they are precisely the ones the toolkit cannot reach.

### 6. Payloads are verbose; signal is buried
`get_apg_pattern("table")` returned the full ARIA contract for all six table
roles with every supported `aria-*` property; the actionable bit (caption +
`th scope`) was a needle in that haystack. `get_aria_role` and the final
`evaluate_applicability` (~50 predicates) are similar — comprehensive, but
token-heavy and slow to parse.

---

## Suggestions (ranked by value)

1. **Make applicability refinement the spine of the lifecycle, not an optional
   deep-dive.** Rename `passed` → `axe_violations: 0` / `axe_passed`, and treat a
   verdict produced *without* refinement as visibly incomplete. This single
   change would have prevented the entire shallow first pass.
2. **Add `viewport` / `zoom` / text-spacing-injection params to `audit_url`** so
   the reflow-family SCs are in scope without rolling a custom browser harness.
   Highest-impact capability addition.
3. **Fix the `evaluate_applicability` subgates statefulness / instruction
   mismatch** — small, concrete, currently costs a confused round-trip.
4. **Guide predicate selection** — flag commonly-missed predicates and allow an
   "unsure" answer that surfaces them as "possibly applicable" rather than a
   silent binary in/out.
5. **Let `evaluate_verification` auto-resolve axe-checkable predicates** from an
   actual audit result instead of trusting asserted pass/fail.
6. **Offer a terser response mode** that leads with the actionable recipe before
   the exhaustive contract.

---

## Evidence from this session

| Moment | What it shows |
|--------|---------------|
| First-pass checklists were all-green from axe alone | The cheap path is too smooth (Friction #1) |
| `evaluate_applicability` surfaced 28 SCs vs ~8 floor; exposed 3.3.1 | The refinement is the crown jewel (What worked) |
| `evaluate_verification` → 15 pass / 1 fail / 12 unverified | "unverified ≠ pass" keeps verdicts honest (What worked) |
| Passing `subgates` alone reset to step 1 | Statefulness bug (Friction #2) |
| Had to hand-build Playwright to measure 1.4.10/1.4.4/1.4.12 | Layout/dynamic gap (Friction #5) |
| That harness caught 4 reflow/contrast regressions on the Users feature | The gap covers SCs that genuinely break |
| `get_apg_pattern("table")` settled `<table>` vs `grid` | High-value authoritative lookups (What worked) |

---

## Net assessment

The trio of **applicability refinement + who-settles-it tiering + "unverified ≠
pass"** is the right design, and once engaged it found real defects and grounded
real decisions. The weakness is that **its best work is opt-in and the cheap path
is frictionless**, so the tool rewards the diligent and quietly enables the lazy.
Close the gradient (make refinement load-bearing) and close the layout/dynamic
gap (give `audit_url` viewport control), and it would be hard to misuse.
