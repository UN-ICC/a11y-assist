---
title: Overview
nav_order: 1
---

# a11y-assist
{: .fs-9 }

Source-traceable web accessibility — APG, WCAG, ACT, and ARIA, plus axe verification. One source of truth, served two ways: to **developers** through a browsable app, and to **AI agents** through an MCP server. Every claim traces back to a versioned W3C document.
{: .fs-6 .fw-300 }

[For humans → open the app]({{ '/app/' | relative_url }}){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[For agents → set it up]({{ '/agents/' | relative_url }}){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## What it is

a11y-assist turns the W3C accessibility corpus into something you can *query* instead of *read*:

- **The app** (for humans) lets you browse APG patterns and native ARIA primitives — each with its ARIA contract, native HTML elements, and drill-down to the WCAG criteria and ACT rules that apply, gated to your conformance level (A / AA / AAA). A **Verify** tab runs axe-core in the browser on a pasted snippet.
- **The MCP server** (for agents) exposes the same data as tools an AI coding agent calls while building or auditing UI, ending every task with a checklist of what it verified vs. what a human still must.

## How it works

Three verbatim-W3C data libraries → one aggregator → two surfaces:

```
apg-query ┐
wcag-query ├─→ a11y-assist-core ─┬─→ a11y-assist-mcp   (agents)
act-rules-query ┘  (+ aria-query) └─→ the app           (humans)
```

Nothing is editorialised. The system hands over verbatim recipes plus *queries to run*; the agent (or you) does the synthesis. The one mechanical cross-corpus link is ACT rule → WCAG SC, taken straight from ACT front-matter. See [Architecture]({{ '/architecture/' | relative_url }}) for the full model.

## Why it's useful

- **Trustworthy** — every recommendation cites a versioned upstream source; no LLM-paraphrased "best practices" that drift from the spec.
- **Honest about its limits** — automation covers ~50% of WCAG, and the tool says so: it makes explicit what only a human can verify (screen-reader output, focus visibility, meaningful labels).
- **Reusable** — the query packages are independently useful (eslint plugins, doc generators, other MCP servers) and published on npm. See [Packages]({{ '/packages/' | relative_url }}).
