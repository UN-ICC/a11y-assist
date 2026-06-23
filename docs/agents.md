---
title: For agents
nav_order: 2
permalink: /agents/
---

# Use a11y-assist with an AI agent

a11y-assist provides an MCP server (`a11y-assist-mcp`) that exposes source-traceable accessibility tools to an AI agent: planning, drill-down, and axe-core verification. Once configured, the agent can retrieve the guidance for a component, audit its markup, and report what remains for human review.

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

The agent establishes the target WCAG level (A, AA, or AAA) first, then follows a staged sequence: entry point → `search_act` → `get_wcag_sc` → verify. Responses contain verbatim data or queries to run, so the agent retrieves only what it needs.

Verification proceeds in three stages:

1. axe-core performs the automated structural checks (`audit_html` / `audit_url`).
2. The agent reviews the markup against the retrieved recipe: element choice, required ARIA attributes, accessible name, keyboard handling, focus management.
3. The remaining qualitative criteria — screen-reader output, focus visibility, meaningful labels — are presented as a checklist for human review. Each item is derived from the retrieved data (the keyboard-interaction table, the ARIA contract) and cites its Success Criterion.

Full behavioural specification: the [`SKILL.md`](https://github.com/UN-ICC/a11y-assist/blob/main/.claude/skills/a11y-assist/SKILL.md) and the [`a11y-assist-mcp` package documentation]({{ '/packages/a11y-assist-mcp/' | relative_url }}).
