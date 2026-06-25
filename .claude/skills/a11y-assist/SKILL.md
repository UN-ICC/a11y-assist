---
name: a11y-assist
description: >-
  Get authoritative, source-traceable web accessibility guidance and verify markup
  via the a11y-assist MCP server. Use when building or fixing accessible UI
  (components or pages), looking up ARIA/APG/WCAG/ACT requirements, or checking
  conformance. It hands you the recipe + the criteria that apply + a verification
  checklist routed by who can settle each item (axe / you / a human); you verify
  everything you can and give the user only the irreducible human-judgment items.
---

# a11y-assist — how to use the MCP server

This server gives you **verbatim W3C accessibility data** (APG, WCAG, ACT, ARIA), **axe verification**, and an **applicability engine** that tells you which WCAG criteria apply to a component and how each is verified. It never fakes certainty — it hands you the recipe, the applicable criteria, and *checks to run*. You do the synthesis.

## 1. Confirm the WCAG level

Establish the target — **A, AA, or AAA** — and pass it to every call (it gates which criteria are in scope; cumulative: AA = A∪AA). **If the user hasn't said, ask.** If they're unsure, default to **AA** and tell them.

## 2. Decide what you're building, then pick the entry point

Enter at the **right altitude** — match each part to its *most specific* entry:

- **A composite component** (dialog, tabs, combobox, menu, accordion, breadcrumb…) → `get_apg_pattern(name, level)`. If a part matches an APG pattern, enter there — do **not** reduce it to a bare primitive (a breadcrumb is not just a `link`).
- **A native primitive / single element** (text input, link, image, button…) → `get_aria_role(role, level)`; `get_element_roles({ tag, attrs })` resolves markup to its role(s) when unsure.
- **Don't know the name?** `list_apg_patterns()`, or `get_element_roles` for a primitive.
- React Native / non-web → not supported yet.

### A page or multi-component view is not a single entry

Before auditing or building any one part, **write a component inventory first** — list *every* interactive component (each routed to its own entry above) **and** the page-level concerns. Auditing one component and calling it "the page" is the most common failure here; the inventory is what prevents it.

Then run the **page-level checklist** for the view as a whole — these apply independent of any component and are the easiest to miss when focused on one part:

- **2.4.2** Page Titled · **3.1.1** Language of Page — always.
- **2.4.3** Focus Order · **2.4.7** Focus Visible · **2.4.4** Link Purpose — the view's overall keyboard/navigation.
- **2.4.1** Bypass Blocks — if content repeats across pages.
- **2.4.5** Multiple Ways · **3.2.3** Consistent Navigation · **3.2.4** Consistent Identification — if part of a set of pages.
- **1.4.3** Contrast · **1.4.10** Reflow · **1.4.12** Text Spacing · **1.4.13** Content on Hover/Focus — page-wide presentation.

Run this set regardless of which components the inventory found — never let page-level criteria depend on which component refines you happened to do.

## 3. Read the guidance — and study the examples

The entry response gives you, for the chosen level:

- the verbatim **APG card** (about, keyboard-interaction table, **examples**), the **ARIA contract** (required/supported props, name source), and the **native elements** that carry the role for free;
- **`applicable_scs`** — the Success Criteria that apply *from the component's structure alone* (the floor), a **verification checklist** grouped by tier (axe / agent / human), and a count of further criteria that depend on the content you add;
- `suggested_queries` for deeper drill-down.

**Use the examples.** The card lists working W3C implementations (name + URL). For anything non-trivial, **web-search or open those example URLs and study the reference implementation before writing your own** — it's the highest-fidelity guidance available. For a specific criterion's techniques and documented failures, `get_wcag_sc(id)`; to search wider, `search_act(term, level)` / `search_wcag(term, level)`.

## 4. Build it

Prefer the native element; apply the ARIA contract; implement the keyboard table; manage focus (trap/return where the pattern needs it); keep DOM/reading order sensible — mirroring the example you studied. The floor SCs + checklist from §3 tell you what the result owes.

## 5. Verify — yourself first, the user only for the irreducible

The `verification_checklist` routes every check by **who can settle it**. Work top-down:

1. **`automated_axe`** → run `audit_html(html)` (pass real CSS so contrast / target-size are covered) or `audit_url(url)`. Fix each violation against its WCAG failure.
2. **`agent_verifiable`** → inspect the built markup/code yourself against each check (right element/role, required props present, accessible name exists, keyboard handlers, focus management, programmatic structure). **If a check carries a `probe`** (reflow, resize text, text spacing — the layout criteria axe cannot reach), run it in a browser: apply `probe.setup` (resize the viewport / inject the CSS — e.g. via the Playwright MCP's `browser_resize` then a `browser_evaluate` that injects a `<style>`) and evaluate `probe.measure` (an arrow function → `true` means the measurable part holds). Then read `probe.residue` for the judgment the probe can't settle and route that to the human list. Feed the predicate to `evaluate_verification` only when both the measure passes *and* you've cleared the residue.
3. **`needs_human`** → these go on the user checklist (§6) — judgment a tool and you cannot settle (meaningful labels, screen-reader output, visible focus, "color not the only cue").

**Refine for your actual instance (do this for a real audit).** The floor is only what structure entails. To add the content/context criteria (images, color, timing, language…), `evaluate_applicability` is **gate-first — three calls**:
1. `evaluate_applicability(pattern|role, level)` → ~9 coarse **gates** ("Any audio or video?", "Any time limits or motion?"). Answer which your component involves.
2. `evaluate_applicability(…, gates: [facet keys that apply])` → only the specific predicate questions *under those facets* — skip the rest.
3. `evaluate_applicability(…, present: [predicate ids that hold])` → the **complete** applicable SC set + full tiered checklist.

**Roll up the verdict.** Feed back what you resolved: `evaluate_verification(scs, pass:[…], fail:[…])` → per-SC **pass / fail / unverified**. Anything you didn't resolve stays `unverified` — never report it as pass.

## 6. Always print the checklist

End every component build, change, or audit by printing this block — even when the human list is empty (write "nothing — fully covered"). Keep this exact shape:

> **♿ Accessibility — `<component>` · WCAG `<level>`**
> **Verified (axe + code review):** _one line — clean, or N issues found & fixed_
> **Please verify (needs you):**
> - [ ] _item_ — _SC_
> - [ ] …

Keep the human list short and **cited**; drop anything axe or your own review already covered. Only print it when you produce or assess real UI — skip it for pure lookups ("what does a combobox need?").

## Reference — query any corpus directly

When you just need to **look something up** rather than run the build/verify lifecycle, each source has a plain query surface (verbatim data, gated to your level where applicable):

- **APG** (component recipes) → `list_apg_patterns()` to browse every pattern name; `get_apg_pattern(name, level)` for one pattern's card.
- **WCAG** (the requirements) → `search_wcag(term, level)` to find Success Criteria by keyword; `get_wcag_sc(id)` for the full criterion + sufficient techniques + documented failures.
- **ACT** (conformance test rules) → `search_act(term, level)` to find rules and the WCAG SCs each covers; `get_act_rule(id)` for the full verbatim rule.
- **ARIA** (roles & elements) → `get_aria_role(role)` for a role's contract + the native elements that carry it; `get_element_roles({ tag, attrs })` to resolve an HTML element to its implicit role(s).

Use these to answer "what does X require?" on their own — no component or audit needed.

They are for **depth, adjudication, and spot-checks — not a completeness net.** You cannot query for the criterion you didn't know to ask about, so "use the API if something's missing" can't catch your own omissions. Completeness comes from the **component inventory** (§2) and the criteria the **entry / refine tools return** — never from free-form search.

## Auditing real apps — gotchas

- **`audit_url` starts from a fresh browser, no app state.** Routes behind auth / localStorage / prior interaction render empty. Check the result's `audited` block (`title` / `heading`) to confirm you tested the intended view. Seed `localStorage` / `initScript`, or capture the rendered markup and use `audit_html`.
- **Dynamic updates and route changes are automation blind spots** — always put on the human checklist:
  - **Live regions (4.1.3)** — is the change announced without moving focus? Only ears prove it.
  - **Route-change focus (2.4.3)** — after navigating, does focus move somewhere sensible (e.g. the new `<h1>`)?

## Honest scope

axe settles only a small, structural slice of WCAG; your own code review settles more; the rest is irreducible human judgment — that's exactly the three tiers the checklist routes into. A clean `audit_html` means "no automated violations found," not "accessible," and an `applicable_scs` floor is "what structure entails," not "the complete list" — refine (§5) for the content-dependent rest. Never present any of it as a conformance claim.
