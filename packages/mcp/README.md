# a11y-mcp

The **a11y-assist MCP server** — the agent-facing surface. It wraps [`a11y-core`](../core) as MCP tools and runs axe-core via Playwright for web validation. Design-system-agnostic: it works against any framework, any design system, or none; a team can plug in an optional [DS extension](./extension-spec.md).

It automates the deterministic half of accessibility review. axe-core catches roughly 50% of WCAG — the structural, machine-verifiable issues. Treat a passing audit as **"no automated violations found,"** not **"accessible."** Manual screen-reader, keyboard, and cognitive review remain required (see [Honest scope](#honest-scope)).

For the conceptual model and data pipeline behind the responses, see [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).

## Tools

The server exposes four tools. **Planning** (`get_a11y_pattern`, `list_a11y_patterns`) is platform-aware and serves both web and React Native. **Validation** (`audit_html`, `audit_url`) is web-only — axe-core requires a DOM.

| Tool | Parameters | Purpose |
|---|---|---|
| `get_a11y_pattern` | `role: string`, `platform: 'web' \| 'react-native' = 'web'` | The accessibility pattern for a role: ARIA contract, APG recipe, applicable WCAG SCs (with techniques + failures), ACT rules, platform binding. Use *before* building. |
| `list_a11y_patterns` | `platform: 'web' \| 'react-native' = 'web'` | Enumerate resolvable patterns. Returns `{ apg_patterns: string[], primitives: string[] }`. |
| `audit_html` | `html: string`, `component?: string`, `stylesheetPath?: string` | Run axe-core against an HTML snippet. No dev server or Storybook needed. Cannot evaluate dynamic behaviour. |
| `audit_url` | `url: string`, `component?: string`, `waitForSelector?: string` | Run axe-core against a live URL. Catches dynamic behaviour (focus management, route changes, live regions) that `audit_html` cannot. |

`get_a11y_pattern` aggregates from authoritative sources and does **not** paraphrase; the agent reasons over the structured data to produce recommendations and code. Every response carries a `provenance` block with versioned snapshot info — every claim is traceable.

## Install

```sh
npm install
npm run build
npx playwright install chromium   # required for audit tools (~150 MB)
```

## MCP client config

Claude Code / Cursor / VS Code Copilot / Codex:

```json
{
  "mcpServers": {
    "a11y": {
      "command": "node",
      "args": ["/absolute/path/to/a11y-assist/packages/mcp/dist/server.js"]
    }
  }
}
```

With a DS extension, add the env var:

```json
{
  "mcpServers": {
    "a11y": {
      "command": "node",
      "args": ["/absolute/path/to/a11y-assist/packages/mcp/dist/server.js"],
      "env": { "A11Y_MCP_EXTENSION": "/path/to/your-ds-extension/dist/index.js" }
    }
  }
}
```

## Verify

The server logs data versions to stderr on boot (stdout stays clean for MCP traffic):

```sh
node dist/server.js < /dev/null 2>&1 | head -5
```

```
[a11y-mcp] axe tags: wcag2a, wcag2aa, wcag21a, wcag21aa
[a11y-mcp] tools: audit_html, audit_url, get_a11y_pattern, list_a11y_patterns
[a11y-mcp] data: apg-query (28 patterns @ 2026-05-07), wcag-query (WCAG 2.2, 86 SCs), act-rules-query (94 rules @ <commit>)
[a11y-mcp] No DS extension configured (baseline WCAG mode).
```

That data line tells you exactly which snapshots are in use.

## Response shape

`get_a11y_pattern` returns one `A11yPattern` (see [`a11y-core`](../core) for the type). Top-level fields:

```jsonc
{
  "type": "apg_pattern" | "html_native" | "rn_primitive",
  "role": "button",
  "name": "Button",
  "platform": "web",

  // from apg-query (when type === "apg_pattern")
  "apg_url": "...",
  "apg_about": "...verbatim from APG...",
  "keyboard_interactions": [{ "key": "...", "description": "..." }],
  "examples": [{ "name": "...", "url": "..." }],

  // from aria-query
  "aria_roles": ["button"],
  "aria_contract": { "button": { "required_props": [], "supported_props": [], "name_from": [] } },

  // from wcag-query — each SC expanded with its techniques + failures
  "wcag_applicable": [
    { "id": "4.1.2", "level": "A", "title": "...", "short_text": "...", "understanding_url": "...",
      "technique_ids": [], "failure_ids": [], "techniques": [], "failures": [] }
  ],

  // from act-rules-query (heuristic match by role)
  "act_rules_applicable": [
    { "id": "97a4e1", "name": "Button has non-empty accessible name", "wcag_sc_ids": ["4.1.2"] }
  ],

  // platform bindings
  "web_elements": [{ "canonical_id": "button", "implicit_role": "button" }],
  "rn_primitive": null,

  // provenance — every claim traceable
  "provenance": {
    "apg_query": { "date": "...", "pattern_count": 28 },
    "wcag_query": { "date": "...", "version": "2.2", "sc_count": 86 },
    "act_rules_query": { "date": "...", "upstream_commit": "...", "rule_count": 94 },
    "aria_query": "aria-query npm package",
    "generated_at": "..."
  }
}
```

The agent reads this and synthesises actionable guidance (e.g. "use `aria-disabled` because F42 is a failure for 2.1.1") by reasoning over the WCAG failures + APG keyboard table + ARIA contract.

## Configuration

`src/config.ts`:

| Field | Default | Meaning |
|---|---|---|
| `axeTags` | `wcag2a, wcag2aa, wcag21a, wcag21aa` | Tags applied to every audit. AA is the baseline gate. |
| `aaaCriteria` | `[]` | Selected AAA criteria to opt into (blanket AAA is rarely realistic; e.g. `2.4.11`, `2.5.8`). |
| `idleMs` | `300000` | Idle teardown of the persistent Chromium instance. |
| `extensionPath` | `$A11Y_MCP_EXTENSION` | DS extension module path; `null` disables. |

## DS extension

A DS extension is optional and additive: it layers custom `ds-*` axe rules, per-component fix guidance, and a classification of each design-system component (APG-aligned / primitive / novel). The core stays DS-agnostic. Full authoring guide: [`extension-spec.md`](./extension-spec.md).

## Dependencies

Workspace: `a11y-core` (which pulls in `apg-query`, `wcag-query`, `act-rules-query`). External: `aria-query`, `axe-core`, `fastmcp`, `playwright`, `zod`.

## What this does not cover

The other ~50% of WCAG is intentionally out of scope: meaningful labels, semantic ARIA correctness, cognitive accessibility, screen-reader experience quality, keyboard-journey logic, and mobile/native on-device behaviour. See [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) "Honest scope."
