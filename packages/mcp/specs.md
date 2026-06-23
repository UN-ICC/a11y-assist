# Accessibility MCP Server — Core Specification

**Version:** 6.0
**Stack:** TypeScript, FastMCP, axe-core, Playwright, Zod
**Target users:** Developers (local IDE — Cursor, Claude Code, VS Code Copilot)
**WCAG target:** AA baseline (`wcag2aa`, `wcag21aa`) + selected AAA opt-in
**Scope:** Design-system-agnostic. Aggregates from `apg-query` + `wcag-query` + `act-rules-query` + `aria-query`. A DS extension can plug in optionally.

> **Background:** for the conceptual framework, see [`../../framework.md`](../../framework.md). For the algorithmic methodology, see [`../../methodology.md`](../../methodology.md). This document is the technical contract.

---

## What this is and isn't

This server automates the deterministic half of accessibility review. axe-core catches roughly 50% of WCAG issues — the structural and semantic ones a machine can verify. Treat a passing audit as **"no automated violations found"**, not **"the component is accessible"**. Manual screen reader, keyboard, and cognitive review remain required.

The core is **DS-agnostic**: it ships ready to use against any project — any framework, any DS, no DS. Planning data is aggregated from three query packages (`apg-query`, `wcag-query`, `aria-query`); validation runs axe-core via Playwright. A team with a custom design system can plug in a **DS extension** to layer org-specific rules and guidance.

---

## Tools

The server exposes four tools to the agent.

### `audit_html`

Run accessibility checks against an HTML snippet using axe-core (WCAG AA by default) plus any DS extension rules. No dev server, Storybook, or DS extension required.

```typescript
parameters: z.object({
  html: z.string(),
  component: z.string().optional(),
  stylesheetPath: z.string().optional(),
})
```

Limitation: cannot evaluate dynamic behaviour (focus management, route changes, live region timing). Use `audit_url` for those.

### `audit_url`

Run axe-core against a live URL — Storybook story, dev server, staging. Catches dynamic behaviour `audit_html` cannot.

```typescript
parameters: z.object({
  url: z.string().url(),
  component: z.string().optional(),
  waitForSelector: z.string().optional(),
})
```

### `get_a11y_pattern`

Returns the accessibility pattern for a UI role on the requested platform. The response **aggregates from authoritative sources** — `aria_contract` from aria-query, `apg_about` and `keyboard_interactions` from APG via `apg-query`, `wcag_applicable` (with techniques and failures) from `wcag-query`. The agent reasons over this structured data to produce recommendations and code; the server does not paraphrase.

```typescript
parameters: z.object({
  role: z.string(),
  platform: z.enum(['web', 'react-native']).default('web'),
})
```

The response carries a `provenance` block with versioned snapshot info from each query package — every claim is traceable.

### `list_a11y_patterns`

Enumerate the catalogue:

```typescript
parameters: z.object({
  platform: z.enum(['web', 'react-native']).default('web'),
})
```

Returns `{ apg_patterns: string[], primitives: string[] }`. APG list is the same on both platforms; primitives differ.

#### Honest scope

- **Planning** tools (`get_a11y_pattern`, `list_a11y_patterns`) are platform-aware and serve both web and react-native.
- **Validation** tools (`audit_html`, `audit_url`) are **web-only** — axe-core requires a DOM. RN apps cannot be directly audited; recommended fallbacks are `eslint-plugin-react-native-a11y`, simulator-based testing (Detox/Maestro), and manual VoiceOver/TalkBack passes.

---

## Repository structure

```
packages/core/
├── src/
│   ├── server.ts                  # FastMCP entry
│   ├── config.ts                  # axe tags, idle timeout, extension path
│   ├── browser/
│   │   ├── pool.ts                # persistent chromium, idle teardown
│   │   └── audit.ts               # injects axe + ext bundle, runs axe.run
│   ├── tools/
│   │   ├── audit-html.ts          # setContent
│   │   ├── audit-url.ts           # goto
│   │   ├── get-a11y-pattern.ts    # delegates to aggregate/load-pattern
│   │   └── list-a11y-patterns.ts  # delegates to aggregate/listPatterns
│   ├── aggregate/
│   │   ├── load-pattern.ts        # the aggregator — composes the three queries
│   │   └── aria-contract.ts       # derives ARIA contract from aria-query
│   ├── extensions/
│   │   ├── types.ts               # DSExtension interface
│   │   └── loader.ts              # env-driven dynamic import + validation
│   └── data/
│       └── role-bindings.json     # the only editorial residue (~15 entries)
├── package.json                   # depends on apg-query, wcag-query (workspace)
├── tsconfig.json
├── README.md
├── specs.md                       # this file
└── extension-spec.md              # DS extension authoring
```

There is **no** `src/patterns/` directory and no hand-authored pattern JSON in core. All pattern data flows from the three query packages at request time.

---

## Server entry

```typescript
// src/server.ts
import { FastMCP } from 'fastmcp'
import { APG_SNAPSHOT } from 'apg-query'
import { WCAG_SNAPSHOT } from 'wcag-query'
// ... tool imports

const server = new FastMCP({ name: 'a11y-mcp', version: '6.0.0' })

server.addTool(auditHtmlTool)
server.addTool(auditUrlTool)
server.addTool(getA11yPatternTool)
server.addTool(listA11yPatternsTool)

const extension = await loadExtension()
extension?.registerTools?.(server)

await server.start({ transportType: 'stdio' })
```

The boot log on stderr reports the data versions:
```
[a11y-mcp] data: apg-query (10 patterns @ 2026-05-07), wcag-query (WCAG 2.2, 20 SCs)
```

---

## How a response is composed

`get_a11y_pattern("button", "web")` flows:

```
loadPattern('button', 'web')
   ├── alias resolution: 'button' is canonical
   ├── role-bindings.json lookup: button → supplemental wcag_sc_ids + web/rn primitive
   ├── apg-query.getPattern('button')          → about_this_pattern, keyboard, examples
   ├── aria-query roles.get('button')          → aria_contract (required/supported props, name_from)
   ├── act-rules-query.rulesByRole('button')   → ACT rules + their wcag_sc_ids
   ├── merge SCs (ACT + binding supplement, deduped)
   ├── wcag-query.getSC(...) for each          → SC + technique + failure expansion
   └── aggregate into A11yPattern
```

Resolution order:
1. If a primitive exists for the role on the requested platform → primitive-shaped response (more common case).
2. Otherwise, if APG has a pattern → APG-shaped response.
3. Otherwise, return null with the available list.

The response shape (top-level fields):

```typescript
{
  type: 'apg_pattern' | 'html_primitive' | 'rn_primitive',
  role: 'button',
  name: 'Button',
  platform: 'web',

  // From apg-query (when type === 'apg_pattern')
  apg_url?: '...',
  apg_about?: '...verbatim from APG...',
  keyboard_interactions?: [{ key, description }, ...],
  examples?: [{ name, url }, ...],

  // From aria-query
  aria_roles: ['button'],
  aria_contract: { button: { required_props, supported_props, name_from, ... } },

  // From wcag-query
  wcag_applicable: [
    {
      id, level, title, short_text, understanding_url,
      technique_ids, failure_ids,
      techniques: [{ id, kind: 'sufficient', title, url }, ...],
      failures:  [{ id, kind: 'failure',    title, url }, ...]
    },
    // ... more SCs
  ],

  // From act-rules-query (heuristic match by role)
  act_rules_applicable: [
    {
      id: '97a4e1', name: 'Button has non-empty accessible name',
      wcag_sc_ids: ['4.1.2'], applicability_text, url
    },
    // ... more rules
  ],

  // Platform routing
  web_primitive: null | { html_element, html_attribute_filter?, html_spec_url, html_aria_url },
  rn_primitive:  null | { rn_component, rn_doc_url, rn_a11y_doc_url },

  // Provenance — every claim traceable
  provenance: {
    apg_query:       { date, apg_base, pattern_count },
    wcag_query:      { date, version, sc_count, technique_count, failure_count },
    act_rules_query: { date, upstream_commit, rule_count },
    aria_query:      'aria-query npm package',
    generated_at:    '...'
  }
}
```

The agent reads this and synthesises actionable guidance — "use aria-disabled because F42 is a failure for 2.1.1" — by reasoning over the WCAG techniques + failures + APG keyboard table + ARIA contract. The MCP server does not paraphrase; it provides structured authoritative inputs.

---

## Extension API

A DS extension layers org-specific rules and guidance. See [`extension-spec.md`](./extension-spec.md) for the full authoring guide.

The contract: an extension exports a `DSExtension` object that registers `axeTags`, a browser bundle path, an `enrich` callback, and optional additional tools.

---

## Manual review checklist

Automated checks alone do not constitute accessibility review. Each PR that touches UI must include confirmation of these manual passes:

- [ ] **Keyboard:** every interaction reachable, focus order matches visual order, focus is always visible.
- [ ] **Screen reader:** announcements make sense, reading order is logical, dynamic updates announced.
- [ ] **Cognitive:** error messages are clear, instructions don't rely on colour or shape alone, copy reads at the intended level.

---

## WCAG scope

- **Default tags:** `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`. AA is the baseline gate.
- **AAA opt-in:** add specific tags to `CONFIG.aaaCriteria`. Blanket AAA is rarely realistic; selected criteria like `2.4.11` (focus appearance) and `2.5.8` (target size) are achievable.

---

## Dependencies

```json
{
  "dependencies": {
    "act-rules-query": "*",
    "apg-query": "*",
    "wcag-query": "*",
    "aria-query": "^5.3.2",
    "axe-core": "^4.10.0",
    "fastmcp": "^4.0.1",
    "playwright": "^1.44.0",
    "zod": "^3.23.0"
  }
}
```

`apg-query` and `wcag-query` are workspace packages in this monorepo; both can also be published to npm independently. First-time setup requires `npx playwright install chromium` (~150 MB).

---

## What this does not cover

axe-core (per Deque) catches roughly 50% of WCAG issues automatically. The other 50% — meaningful labels, semantic ARIA correctness, cognitive accessibility, screen reader experience quality, keyboard journey logic, dynamic interaction quality, mobile/native (iOS, Android, RN) on-device behaviour, token-level contrast governance — is intentionally out of scope.
