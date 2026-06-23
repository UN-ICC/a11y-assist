# a11y-mcp-core

The MCP server. Aggregates [`apg-query`](../apg-query), [`wcag-query`](../wcag-query), and [`aria-query`](https://www.npmjs.com/package/aria-query) into a unified planning + verification surface for AI coding agents.

## What it does

Four tools the agent can call:

- **`get_a11y_pattern(role, platform)`** — authoritative spec for a UI role, with WCAG SCs + sufficient techniques + documented failures, ARIA contract, APG keyboard table, and platform binding. Use BEFORE building.
- **`list_a11y_patterns(platform)`** — discover what roles are available.
- **`audit_html(html)`** — run axe-core against an HTML snippet.
- **`audit_url(url)`** — run axe-core against a live page.

The first two work on web AND react-native. Audit tools are web-only (axe-core requires a DOM).

## Install

From this monorepo:

```sh
npm install
npm run build
npx playwright install chromium
```

## MCP client config

### Claude Code / Cursor / Codex

```json
{
  "mcpServers": {
    "a11y": {
      "command": "node",
      "args": ["/absolute/path/to/a11y-mcp/packages/core/dist/server.js"]
    }
  }
}
```

### With a DS extension

```json
{
  "mcpServers": {
    "a11y": {
      "command": "node",
      "args": ["/path/to/packages/core/dist/server.js"],
      "env": {
        "A11Y_MCP_EXTENSION": "/path/to/your-ds-extension/dist/index.js"
      }
    }
  }
}
```

The extension contract is documented in [`extension-spec.md`](./extension-spec.md).

## Verification

After `npm run build`, the server should boot cleanly:

```sh
node dist/server.js < /dev/null 2>&1 | head -5
```

You should see lines like:
```
[a11y-mcp] axe tags: wcag2a, wcag2aa, wcag21a, wcag21aa
[a11y-mcp] tools: audit_html, audit_url, get_a11y_pattern, list_a11y_patterns
[a11y-mcp] data: apg-query (10 patterns @ 2026-05-07), wcag-query (WCAG 2.2, 20 SCs)
```

The data line tells you exactly which snapshot of APG and which WCAG version are in use.

## Honest scope

This server **does not replace** manual a11y review. axe-core catches structural issues (missing labels, contrast failures, ARIA misuse) but cannot judge meaningful labels, screen reader experience, cognitive accessibility, or keyboard journey logic. See the parent `framework.md` for the full picture.

## Architecture

The MCP server is an **aggregator**: it pulls authoritative data from three query packages at request time and returns it to the agent. The agent (Claude or any other LLM) does synthesis (recommendations, code, fixes) by reasoning over the structured inputs.

For the algorithmic methodology that keeps this honest — pinned snapshots, no editorial drift — see [`../../methodology.md`](../../methodology.md).

## Files

- [`specs.md`](./specs.md) — the technical contract: tools, response shapes, extension API.
- [`extension-spec.md`](./extension-spec.md) — DS extension authoring guide.
