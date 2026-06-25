---
title: For agents
nav_order: 2
permalink: /agents/
---

# Use a11y-assist with an AI agent

a11y-assist provides an MCP server (`a11y-assist-mcp`) that exposes source-traceable accessibility tools to an AI agent: the guidance for a component, the WCAG criteria that apply to it, a tiered verification checklist, source drill-down, and axe-core verification. Once configured, the agent retrieves the recipe, builds, verifies its markup, and reports only what genuinely needs a human.

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
| `get_apg_pattern` / `get_aria_role` | Entry point — recipe + ARIA contract + native elements + the WCAG criteria that apply structurally + a verification checklist |
| `get_element_roles` / `list_apg_patterns` | Resolve markup to its role(s) / browse pattern names |
| `evaluate_applicability` | Refine beyond the structural floor — the content questions, then the complete applicable set |
| `evaluate_verification` | Roll up the resolved checks → per-SC pass / fail / unverified |
| `search_act` / `search_wcag` / `get_wcag_sc` / `get_act_rule` | Reference lookups into any corpus |
| `audit_html` / `audit_url` | Run axe-core verification |

## How the agent works

The agent first establishes the target WCAG level (A, AA, or AAA), passed to every call to gate which criteria are in scope. Then it follows one lifecycle:

1. **Enter** at the component — `get_apg_pattern` (composite) or `get_aria_role` (primitive; `get_element_roles` resolves markup first). The response carries the verbatim recipe, the ARIA contract, the native elements, the linked APG **examples**, and — already — the WCAG criteria that apply from the component's structure plus a verification checklist.
2. **Study the examples.** For anything non-trivial, the agent web-searches or opens the linked W3C example implementations before writing its own.
3. **Build**, applying the recipe (native element, ARIA contract, keyboard table, focus management).
4. **Refine** for the actual component with `evaluate_applicability` — it returns the content/context questions (grouped by facet); the agent answers them from its own markup and gets the complete applicable set with the full checklist.
5. **Verify**, working the tiered checklist: run `audit_html` / `audit_url` for the automated tier, inspect the markup itself for the agent tier, and hand the user only the human-judgement tier. `evaluate_verification` rolls up what was resolved into a per-SC pass / fail / unverified verdict — never assuming pass for what was not checked.

Each response is small and self-contained, so the agent stays within its context budget. For reference lookups outside this flow — "what does X require?" — `search_act` / `search_wcag` → `get_wcag_sc` / `get_act_rule` query any corpus directly.

Full behavioural specification: the [`SKILL.md`](https://github.com/UN-ICC/a11y-assist/blob/main/.claude/skills/a11y-assist/SKILL.md) and the [`a11y-assist-mcp` package documentation]({{ '/packages/a11y-assist-mcp/' | relative_url }}).
