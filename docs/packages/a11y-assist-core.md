---
title: a11y-assist-core
parent: Packages
nav_order: 4
permalink: /packages/a11y-assist-core/
---


The shared logic layer of a11y-assist. The [`a11y-assist-mcp`](/a11y-assist/packages/a11y-assist-mcp/) server and the [web application](/a11y-assist/app/) are both built on it, so they can't drift. **Pure** — no I/O, no MCP, no Playwright, no editorial data: every fact is verbatim from a query package or [`aria-query`](https://www.npmjs.com/package/aria-query), or mechanically derived from one.

It does four things:

1. **Compose** an entry (an APG pattern or an ARIA role) into the verbatim recipe + ARIA contract + native elements + drill-down queries.
2. **Query** the WCAG + ACT knowledge base.
3. **Shape** raw axe violations into the canonical audit response.
4. **Applicability** *(experimental)* — compute which WCAG criteria apply to a component, and a tiered verification checklist.

## Composition

```ts
import { composeApgPattern, composeAriaRole, listApgPatterns, searchAct } from 'a11y-assist-core'

composeApgPattern('dialog', 'AA')   // composite component → { apg, role, aria_contract, native_elements, suggested_queries } | null
composeAriaRole('textbox', 'AA')    // native primitive    → { role, aria_contract, native_elements, suggested_queries } | null
searchAct('dialog', 'AA')           // level-gated ACT search; rules keep only their in-scope WCAG SCs
```

It asserts nothing about "which SCs apply" — associations are reached by *running* the suggested queries. The one mechanical cross-corpus link is **ACT rule → WCAG SC**, surfaced by `searchAct` / `actRulesForSc`.

`suggested_queries` are derived deterministically from the entry's structured fields, in two kinds so the drill-down is never ACT-only: **`search_act`** seeds (role names, required props, native tags, focus/keyboard) and **`search_wcag`** seeds (role names, focus/keyboard, name/label) that reach WCAG directly. Each carries a `why`, a `tool`, and the requested `level`.

## Knowledge queries

The read surface over the WCAG + ACT corpora that the drill-down lands on:

```ts
import { searchWcag, getWcagSc, getActRule, actRulesForSc } from 'a11y-assist-core'

searchWcag('focus', 'AA')   // SCs matching the term, gated to the level
getWcagSc('2.4.3')          // → SC + sufficient techniques + documented failures | null
actRulesForSc('4.1.2')      // ACT rules covering an SC
getActRule('97a4e1')        // full verbatim ACT rule | null
```

(Also `listWcagScs`, `getWcagTechnique`, `getWcagFailure`, `listActRules`.)

## Audit shaping

`wrapAuditResponse` / `toBaseShape` turn raw axe violations into the canonical response shape (so the MCP audit tools and any other caller report identically).

## Applicability *(experimental)*

A deterministic engine: from a component's structure (the `auto` predicates) it derives the WCAG criteria that apply, separates those decidable from structure from those that depend on the content you add, and produces a verification checklist routed by how each check is settled (axe / agent / human).

```ts
import { applicability as a } from 'a11y-assist-core'

const facts = a.factsFromComposition(composeApgPattern('dialog', 'AA'))
a.structuralGuidance(facts, 'AA')
//  → { floor, contentDependent, excluded, checklist, level, autoTrue }

a.evaluateApplicability(truth)            // → { applies, notApplicable, depends }   (three-valued)
a.evaluateVerification(scs, verifTruth)   // → per-SC 'pass' | 'fail' | 'unverified'
```

The data behind it is generated from the success-criteria decomposition documented under [Classifier](/a11y-assist/classifier/). Experimental, and namespaced (`applicability.*`) for that reason.

## Licensing

Code is MIT. The package ships no data of its own — every fact comes from a query package or `aria-query`.
