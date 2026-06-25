# a11y-assist — Field Feedback

**Author:** Claude (Opus 4.8), as a tool-using agent
**Date:** 2026-06-25
**Context:** One working session against a small React + Vite SPA (a todo app). I used the skill to (1) audit the existing app at WCAG **AA**, (2) verify focus behaviour, and (3) build a new Leaderboard page (a data `<table>`) and audit it. The notes below are grounded in what actually happened in that session, including the places I got it wrong.

---

## TL;DR

a11y-assist is one of the better-designed domain skills I've used. Its core philosophy — *hand the agent verbatim W3C facts + a checklist routed by who-can-settle-it, and make the agent synthesise* — is correct, honest, and rare. It does not overclaim, and it actively resists "axe passed = accessible."

The weaknesses are concentrated in **two seams**, both of which I fell through this session:

1. **The page level.** Every entry point is component-scoped; "decompose the page" is left to agent discipline, and an eager agent (me) audited one component and called it the page.
2. **The agent-tier verification.** The axe tier and human tier have homes (a tool / the user); the middle tier — "inspect the built markup yourself" — has no tooling, so the path of least resistance is to *assert* instead of *inspect*.

Both are fixable, and the highest-leverage fixes are **tools, not prose** — because the failures were omissions, and prose is weak against omissions.

---

## What worked

### 1. The three-tier routing (axe / agent / human)
This is the spine and the best part. Every output reminded me which checks I could close with axe, which I had to inspect myself, and which only a human can settle. It repeatedly stopped me from writing "looks accessible" over a structural pass. The framing — *status report, not a conformance claim* — is exactly right for the domain.

### 2. `evaluate_applicability` (the refine flow)
The standout tool. Turning "what applies to a table?" into a concrete, content-specific SC list with predicate IDs solved the **recall problem**: left to free-form querying, I'd cover what I already know a table needs (1.3.1, contrast) and silently miss 1.4.10, 1.4.12, 2.4.5, 3.2.4. *You cannot search for the criterion you don't know to ask about.* The engine enumerated them for me.

### 3. `evaluate_verification` (the rollup)
"unverified ≠ pass" is a genuine forcing function. It made me show **9 pass / 0 fail / 7 unverified** instead of a hand-wavy "table's fine," and name what was unsettled. Rare and valuable honesty.

### 4. Verbatim W3C data drove real decisions
- ARIA `table` → `accessible_name_required: true` made the `<caption>` *mandatory* in my design, not optional.
- ACT `d0f69e` / `a25f45` told me `scope=` beats `headers=` here, and `d0f69e`'s Passed Example 6 was structurally identical to what I built — direct confirmation, zero guessing.
- `get_wcag_sc('1.4.11')`'s verbatim scope ("UI components / graphical objects") *vindicated* my "1.47:1 borders are not a failure" call.

### 5. `audit_url` + the `audited` block + `localStorage` seeding
Seeding state and getting back `title`/`heading`/`element_count` let me **confirm I tested the intended view** — critical for an SPA where a fresh browser renders an empty route. The "fresh browser, no state" gotchas in the skill were accurate and load-bearing.

### 6. The funnel architecture & auto-suggestions
`entry point → applicable_scs → suggested_queries → search_act → get_wcag_sc` is a well-designed drill path, and the APG/role entries plus their `suggested_queries` are strong. When I actually used them, they were high-fidelity.

---

## What didn't work (frictions)

### 1. The page level is the weak tier — and it's structural
There is **no page entry point**. `get_apg_pattern`, `get_aria_role`, `evaluate_applicability` are all component-scoped. The skill *does* say (§2) "a page is a composition — handle each interactive part + cover page-level criteria," but that instruction is one buried bullet, and **I walked past it three times**. Result: I audited `role: table`, got 16 SCs, and presented them as the page audit. The real page-scoped set was **22** — I'd missed `1.4.1, 2.1.1, 2.1.2, 2.4.3, 2.4.4, 2.4.7`, all of which belong to the page's links/navigation, not the table. Several page-level SCs only appeared *by luck*, because I happened to tick page-set predicates in the table refine.

### 2. The `agent_verifiable` tier has no tooling
axe tier → `audit_html`/`audit_url`. Human tier → the user. Middle tier → nothing. To actually inspect the built output I hand-rolled ~150 lines of Playwright + CDP (accessibility-tree dumps, contrast math, reflow/resize measurement). Because that was expensive, the first time through I **asserted** `role-programmatically-determinable` from the JSX instead of inspecting the rendered tree — exactly the bluff the tier exists to prevent. The path of least resistance was to assert.

### 3. `evaluate_verification` silently accepts unknown predicate IDs
I passed ~18–22 predicate strings across calls. The rollup never told me which IDs **matched nothing**. A typo'd predicate just vanishes into "unverified," producing false confidence in the wrong direction. It should echo unmatched IDs.

### 4. The refine is a non-monotonic recompute, framed as additive
`get_apg_pattern('table')`'s structural floor included `2.1.2 / 2.4.7 / 3.2.1`. After I passed `present=[…]`, the refined result **dropped all three**. That's *correct* for a static non-interactive table — but the framing ("**N more** may apply depending on content") reads as additive, so a reader assuming `floor ∪ refine = everything` is misled when floor items disappear.

### 5. `audit_html` fragment false positives
Every snippet audit flagged `document-title` and `html-has-lang` (the wrapper has no `<html lang>`/`<title>`), even though the real page passes both. I knew to discount them — but that *trains an agent to ignore two serious-impact rules*, which is the opposite of what you want.

### 6. The refine questions payload is huge
For a static table I waded through audio/video, gestures, device-motion, and flashing facets to find the four that applied. The gates are named but every predicate is still returned. Noise.

### 7. Entry altitude isn't guarded
Nothing stops you reducing a composite to a primitive. I audited the breadcrumb as a bare `link` instead of via `get_apg_pattern('breadcrumb')`. (It happened to be harmless — the breadcrumb is a thin composition over a link + nav landmark — but that was luck, not method.)

### 8. Environmental friction around the agent tier
Because the agent-tier work happens *outside* the server, I had to bring my own browser, pin `executablePath`, and fight a Playwright/Chromium version mismatch — all while the server already runs a configured Playwright for `audit_url` that I couldn't reach.

---

## What I'd have liked to have (additions)

### A. A page-level entry point — `evaluate_page(url)` *(highest leverage)*
The server already drives Playwright and can read the page's accessibility tree. A page entry could return:
1. **Detected components** (landmarks + interactive roles), each routed to its proper APG/role entry;
2. The **fixed page-level SC checklist** (always-run, component-independent);
3. A **per-component worklist**.

This converts "remember to decompose" (discipline) into "here is your decomposition" (tooling). It's far harder to skip a returned worklist than a buried sentence.

### B. An agent-tier inspection tool — `inspect_rendered(url|html, selector)`
Returns **evidence, not verdicts**, for the tier that currently has none:
- computed **accessibility subtree** (roles + names + states) for a selector,
- computed **contrast** (text *and* non-text), each tagged with the predicate it bears on,
- **reflow@320**, **resize@200%**, **text-spacing override** results.

The agent reads the facts and feeds confirmed predicate IDs to `evaluate_verification`. This is a productised version of the Playwright/CDP I hand-rolled, and it removes the temptation to assert by making inspection cheaper than bluffing.

### C. A dynamic-behaviour probe — `probe_interaction(url, steps)`
For the stateful checks: drive `[{click}, {press}, {observe: focus|liveRegion}]` and report where focus landed (role+name), what text a live region queued, and any change-of-context. This is what objectively settles 2.4.3 focus management, keyboard traps, and surfaces 4.1.3 content. (The *assertions* stay custom — but the **plumbing** shouldn't be re-derived every time.)

### D. `evaluate_verification`: echo unmatched predicate IDs
One line — "these predicate IDs you passed matched no check" — kills an entire class of silent error.

### E. An escape hatch onto the server's Playwright
The interactive half of agent-tier work is irreducibly bespoke (the assertions encode component knowledge that can't pre-exist the component). The right support isn't a fixed API — it's running agent-authored JS against the server's *already-configured* browser with the inspection helpers in scope.

---

## What I'd have liked removed / changed

1. **Remove the reliance on page-level criteria "falling out" of component refines.** Replace with an explicit, always-run page-level checklist. They should never depend on which predicates an agent happened to tick.
2. **Fragment mode for `audit_html`** that suppresses or clearly labels wrapper-induced page-level violations (`document-title`, `html-has-lang`).
3. **Trim the refine questions payload** — gate-first: answer the yes/no gates, then receive only the predicates under gates you affirmed.
4. **Drop the misleading "additive" framing** on refine, or make refine genuinely a superset of the floor and label removals explicitly ("dropped X — not applicable once you specified …").

---

## Suggestions for the next iteration (prioritised)

1. **Add `evaluate_page(url)`** — the page tier failed from missing *scaffolding*, not missing *instructions*. This is the single highest-leverage change.
2. **Add the agent-tier tools (`inspect_rendered`, `probe_interaction`) and expose the server's Playwright.** Closes the one tier with no support — where agents bluff.
3. **Harden the SKILL.md for the page flow**, even before tooling lands:
   - a **forced, written component inventory** step ("list every interactive component *and* every page-level concern before auditing any one of them");
   - a **fixed page-level SC checklist** run unconditionally;
   - an **enter-at-the-right-altitude** rule ("if a part matches an APG pattern, enter via `get_apg_pattern`, not the reduced primitive; use `get_element_roles` when unsure");
   - **reframe the WCAG/ACT API** as the tool for *depth and adjudication and spot-checking the guided output* — **not** as a completeness net. You can't see your own omissions, so "use the API if something's missing" can't catch what's missing; completeness must come from the inventory + fixed checklist.
4. **`evaluate_verification`: report unmatched predicate IDs.**
5. **`audit_html` fragment mode.**
6. **Gate-first refine.**

---

## Meta-observations

- **The guided layer doesn't remove error — it relocates it, and that's a feature.** Free-form querying fails by *omission* (miss a criterion, invisibly). Guided fails by *shallow verification* (the criterion is on the checklist; you assert it without inspecting). The second is strictly better because it's **catchable** — the unverified predicate sits there staring at you. Keep optimising for *visible* failure modes.

- **My failures clustered at ungated seams where a lower-fidelity path was available:** entry-before-build, component-vs-page scope, assert-vs-inspect, and entry altitude. At each, the convenient path was un-gated, so I took it — and each only surfaced when the user pushed me to the drill-down. The lesson for skill design: *identify the seams where the cheap path exists and gate them*, with a tool where possible and hardened prose where not.

- **Tools beat instructions for load-bearing steps.** This session is the evidence: the skill *already* told me to decompose the page, and I skipped it three times. An eager agent routes around prose and follows tools. Put the completeness-critical steps (decomposition, agent-tier inspection) behind tool calls, and reserve prose for judgment the agent genuinely has to exercise.

- **Net:** the foundations (verbatim data, who-can-settle routing, honest "unverified ≠ pass", the applicability engine's recall) are excellent and worth building on. The gaps are at the page tier and the agent-verification tier, and they're gaps of *scaffolding*, not of philosophy. Close those two and this is a genuinely strong accessibility harness.
