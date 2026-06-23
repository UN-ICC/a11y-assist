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

Set the **WCAG level** (A/AA/AAA) up front, then a staged flow: entry point → `search_act` → `get_wcag_sc` → `audit`. Every claim is verbatim or a query the agent runs — nothing is asserted. Each component finishes with a **checklist** splitting what the agent verified (axe + code review) from the short list only a human can confirm (screen reader, focus visibility, meaningful labels). axe covers ~50% of WCAG; the rest is made explicit, never hidden behind a green check.

Full behavioural spec: the [`SKILL.md`](https://github.com/UN-ICC/a11y-assist/blob/main/.claude/skills/a11y-assist/SKILL.md) and the [`a11y-assist-mcp` package docs]({{ '/packages/a11y-assist-mcp/' | relative_url }}).
