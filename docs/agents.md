---
title: For agents
nav_order: 2
permalink: /agents/
---

# Use a11y-assist with an AI agent

a11y-assist ships an MCP server (`a11y-assist-mcp`) that gives an AI coding agent source-traceable accessibility tools — planning, drill-down, and axe verification. Point your MCP client at it and the agent can plan components correctly, audit markup, and tell you exactly what still needs a human.

## 1. Add the MCP server

The package is on npm, so no clone or build needed — `npx` fetches and runs it:

```sh
claude mcp add a11y -- npx -y a11y-assist-mcp
```

For the audit tools, install the browser once:

```sh
npx playwright install chromium
```

(Other MCP clients: run `npx -y a11y-assist-mcp` as the server command.)

## 2. Install the skill

The skill teaches the agent the workflow and the "verify-vs-ask-the-user" discipline. Copy it into your project:

```sh
mkdir -p .claude/skills/a11y-assist
curl -sL https://raw.githubusercontent.com/UN-ICC/a11y-assist/main/.claude/skills/a11y-assist/SKILL.md \
  -o .claude/skills/a11y-assist/SKILL.md
```

## 3. The tools

| Tool | Purpose |
|---|---|
| `get_apg_pattern` | Entry for composite components (dialog, tabs, …) |
| `get_aria_role` / `get_element_roles` | Entry for native primitives (input, link, img) |
| `list_apg_patterns` | Discover pattern names |
| `search_act` | Drill-down hub: ACT rules → the WCAG SCs they cover |
| `get_act_rule` / `search_wcag` / `get_wcag_sc` | Reference lookups |
| `audit_html` / `audit_url` | Run axe-core verification |

## How the agent works

Set the **WCAG level** (A / AA / AAA) up front, then work the staged flow — entry point → `search_act` → `get_wcag_sc` → verify. Every claim is verbatim or a query the agent runs; nothing is asserted, so responses stay small and the agent pulls only what it needs.

The payoff is **honest, tiered verification** at the end of every component — instead of a green check that overstates coverage:

1. **axe** runs the structural ~50% (`audit_html` / `audit_url`).
2. **The agent reviews the code** against the recipe — right element, required ARIA, accessible name, keyboard handlers, focus management.
3. **A human checklist** covers the irreducible qualitative part — screen-reader output, focus visibility, meaningful labels — with each item *derived from the sourced data* (the keyboard table, the ARIA contract) and cited, so it's concrete, not hand-waved.

You get exactly what was verified, and the short, sourced list of what only a human can confirm.

Full behavioural spec: the [`SKILL.md`](https://github.com/UN-ICC/a11y-assist/blob/main/.claude/skills/a11y-assist/SKILL.md) and the [`a11y-assist-mcp` package docs]({{ '/packages/a11y-assist-mcp/' | relative_url }}).
