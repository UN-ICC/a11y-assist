---
name: a11y-assist
description: >-
  Get authoritative, source-traceable web accessibility guidance and run axe
  audits via the a11y-assist MCP server. Use when building or fixing accessible
  UI components, looking up ARIA/APG/WCAG/ACT requirements, or verifying markup.
  Verifies everything it can itself (axe + code review) and hands the user a short
  checklist of only the items that genuinely need a human.
---

# a11y-assist — how to use the MCP server

This server gives you **verbatim W3C accessibility data** (APG, WCAG, ACT, ARIA) and **axe verification**. It never asserts "these rules apply" — it hands you the recipe plus *queries to run*. You do the synthesis.

## First, confirm the WCAG level

Before looking anything up, establish the conformance target — **A, AA, or AAA** — and pass it to every tool call (it gates which Success Criteria and ACT rules are in scope). **If the user hasn't stated a level, ask.** If they're unsure, default to **AA** (the common legal baseline) and tell them that's what you're using. The level is cumulative: AA includes A; AAA includes A + AA.

## Pick your entry point by scenario

1. **Building a composite component** (dialog, tabs, combobox, menu…) → `get_apg_pattern(name, level)`.
2. **Working on a native primitive** (text input, link, image, button…) → `get_aria_role(role, level)`. If you only have markup, call `get_element_roles({ tag, attrs })` first to get the role.
3. **React Native** → not supported yet (web only).
4. **Verifying your output** → `audit_html(html)` or `audit_url(url)` .

Don't mix scenarios — each is scoped. Set `level` (`A` | `AA` | `AAA`, cumulative, default `AA`) at the entry; it's stamped into the suggested queries .

## The workflow

```
get_apg_pattern("dialog", "AA")        # or get_aria_role("textbox","AA")
  → apg card + aria_contract + native_elements + suggested_queries
run a suggested query:
search_act("focus", "AA")              # the agent picks which seeds to run
  → ACT rules + their in-scope WCAG SC ids + suggested get_wcag_sc calls
get_wcag_sc("2.1.2")
  → the SC statement + sufficient techniques + documented failures (anti-patterns)
audit_html("<dialog>…</dialog>")       # verify
```

Each call returns a small payload. Drill only as far as you need.

## What each response contains

- **`get_apg_pattern` / `get_aria_role`**: `aria_contract` (required/supported props, name source), `native_elements` (HTML elements that carry the role for free), and `suggested_queries` — a list of `search_act` terms derived from the role's structure. `get_apg_pattern` also includes the verbatim `apg` card (about, keyboard interactions, examples). Run the suggested queries; they're starting points, not an exhaustive list.
- **`search_act`**: rules whose name/applicability match your term, each with the WCAG SCs it covers (gated to your level). This is the bridge from a component to its conformance tests.
- **`get_wcag_sc`**: the full criterion. The **failures** are W3C-documented anti-patterns — use them to know what *not* to do.

## Verify what you can; hand the user only the irreducible

When you build or audit a component, take the verification as far as *you* can, then give the user a **short** checklist of only what genuinely needs a human. Never ask the user to re-check something axe or you already covered.

1. **Understand it** — `get_apg_pattern` / `get_aria_role`, then `search_act` → `get_wcag_sc` for the SCs that apply. Now you know what the component owes.
2. **Verify it yourself — your own working passes, not a list for the user:**
   - **axe** — run `audit_html` / `audit_url` (pass real CSS when you can, so contrast and target-size are covered). Fix each violation, mapping it to its WCAG failure.
   - **code review against the recipe** — confirm in the markup: the right semantic element/role is used; required ARIA properties are present; an accessible-name source exists; keyboard handlers cover the pattern's keyboard table; focus management is implemented (trap/return where the pattern needs it); DOM/reading order is sensible.
   Report this as a brief summary of what you confirmed and fixed — don't turn it into a checklist for the user to repeat.
3. **☐ Hand the user only what needs a human** — keep it short and **cited**, and drop anything already covered above:
   - **Screen reader** — confirm it actually announces correctly in NVDA / VoiceOver (the code looks right; only a real AT run proves it). (4.1.2)
   - **Focus visibility** — the focus indicator is genuinely visible and clear while navigating. (2.4.7)
   - **Meaningful content** — names/labels read clearly in context, errors are recoverable, nothing relies on colour alone. (2.4.6 + cognitive)
   - **Interaction feel** — the keyboard / pointer interactions behave correctly when actually used.

   If nothing genuinely needs a human for this component, say so — don't pad the list.

This keeps the user focused on the irreducible human-judgment items while you handle everything automatable or inspectable yourself.

### Always print the checklist

End every component build, change, or audit by printing this block to the terminal — even when the "please verify" list is short or empty (then write "nothing — fully covered"). Keep this exact shape so it's instantly recognizable:

> **♿ Accessibility — `<component>` · WCAG `<level>`**
> **Verified (axe + code review):** _one line — clean, or N issues found & fixed_
> **Please verify (needs you):**
> - [ ] _item_ — _SC_
> - [ ] …

Only print it when you produce or assess actual UI — skip it for pure informational lookups (e.g. "what does a combobox need?").

### Auditing real apps — gotchas

- **`audit_url` starts from a fresh browser with no app state.** Routes behind localStorage / auth / prior interaction will render empty or "not found". Always check the `audited` block in the result (`title` / `heading`) to confirm you tested the intended view, not a fallback. To reach a stateful route, seed `audit_url`'s `localStorage` (or `initScript`); or, for a specific rendered view, capture its real markup and use `audit_html`.
- **Dynamic updates and route changes are automation blind spots.** For anything with live updates (toasts, "N items left" counters, validation messages) or client-side routing, always put these on the human checklist — axe cannot test them:
  - **Live regions (4.1.3)** — does the change get announced without moving focus? A live region can be coded perfectly and still stay silent if the DOM timing is off. Ears are the only instrument.
  - **Route-change focus (2.4.3)** — after navigating, does focus move somewhere sensible (e.g. the new `<h1>`) so a screen-reader user knows the page changed?

## Honest scope

axe (and this server) cover ~50% of WCAG — presence and validity, not meaningfulness. A clean `audit_html` means "no automated violations found," not "accessible." You can extend your own coverage with code review (step 2 above); what remains after that is the short human checklist (step 3). When unsure which SCs matter beyond what `search_act` surfaces, use `search_wcag(term, level)` directly.
