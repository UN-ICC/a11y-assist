---
name: a11y-assist
description: >-
  Get authoritative, source-traceable web accessibility guidance and run axe
  audits via the a11y-assist MCP server. Use when building or fixing accessible
  UI components, looking up ARIA/APG/WCAG/ACT requirements, or verifying markup.
---

# a11y-assist — how to use the MCP server

This server gives you **verbatim W3C accessibility data** (APG, WCAG, ACT, ARIA) and **axe verification**. It never asserts "these rules apply" — it hands you the recipe plus *queries to run*. You do the synthesis.

## Pick your entry point by scenario

1. **Building a composite component** (dialog, tabs, combobox, menu…) → `get_apg_pattern(name, level)`.
2. **Working on a native primitive** (text input, link, image, button…) → `get_aria_role(role, level)`. If you only have markup, call `get_element_roles({ tag, attrs })` first to get the role.
3. **React Native** → not supported yet (web only).
4. **Verifying your output** → `audit_html(html)` or `audit_url(url)`.

Don't mix scenarios — each is scoped. Set `level` (`A` | `AA` | `AAA`, cumulative, default `AA`) at the entry; it's stamped into the suggested queries.

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

## Honest scope

axe (and this server) cover ~50% of WCAG. A clean `audit_html` means "no automated violations found," not "accessible." Some visual/perceptual SCs (contrast, target size, focus appearance) have no ACT rules — they're caught by **audit_html/audit_url**, not surfaced as suggested queries. Screen-reader, keyboard-journey, and cognitive review remain manual. When unsure which SCs matter beyond what `search_act` surfaces, use `search_wcag(term, level)` directly.
