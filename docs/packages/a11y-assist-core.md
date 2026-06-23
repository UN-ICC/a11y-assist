---
title: a11y-assist-core
parent: Packages
nav_order: 4
permalink: /packages/a11y-assist-core/
---


The pure, mechanical composition layer of a11y-assist. Given an entry — an APG pattern or an ARIA role — it assembles a small response from the query packages ([`apg-query`](/a11y-assist/packages/apg-query/), [`wcag-query`](/a11y-assist/packages/wcag-query/), [`act-rules-query`](/a11y-assist/packages/act-rules-query/)) plus [`aria-query`](https://www.npmjs.com/package/aria-query): the verbatim recipe, the ARIA contract for the involved roles, the native HTML elements that carry them, and a deterministic list of drill-down queries the agent can run next.

**No I/O, no MCP, no Playwright, and no editorial data.** It asserts nothing about "which WCAG SCs apply" — associations are reached by running the suggested ACT searches. The only mechanical cross-corpus link is ACT-rule → WCAG-SC, surfaced by `searchAct`. Both surfaces — the [`a11y-assist-mcp`](/a11y-assist/packages/a11y-assist-mcp/) server and the [`a11y-assist-web`](/a11y-assist/app/) website — depend on it, so they can't drift.

## API

```ts
import {
  composeApgPattern, composeAriaRole, listApgPatterns, searchAct,
  wrapAuditResponse,                                  // audit shaping
  deriveAriaContract, getElementsForRole, getRolesForElement,
} from 'a11y-assist-core'

// Scenario 1 — composite component (APG entry)
const dialog = composeApgPattern('dialog', 'AA')
//  → { apg, role, aria_contract, native_elements, suggested_queries } | null

// Scenario 2 — native primitive (ARIA entry)
const textbox = composeAriaRole('textbox', 'AA')
//  → { role, aria_contract, native_elements, suggested_queries } | null

// Drill-down hub — level-gated ACT search (ACT→SC is the one mechanical bridge)
const rules = searchAct('dialog', 'AA')   // rules whose in-scope WCAG SCs are kept
```

`suggested_queries` are `search_act` calls derived deterministically from the entry's structured fields (role names, required ARIA props, native element tags, and a focus/keyboard seed when a keyboard table exists). Each carries a `why` naming its source and is stamped with the requested conformance `level`.

See [the Architecture](/a11y-assist/architecture/) for the model and [the a11y-assist-mcp package](/a11y-assist/packages/a11y-assist-mcp/) for the tool surface built on this.

## Licensing

Code is MIT. The package ships no data of its own — every fact comes from a query package or `aria-query`.
