---
title: Packages
nav_order: 4
has_children: true
permalink: /packages/
---

# Packages

a11y-assist is a small npm monorepo: three verbatim-W3C data libraries feed one aggregator, exposed two ways. All are published unscoped, MIT-licensed.

| Package | What it is |
|---|---|
| [apg-query](apg-query/) | Verbatim W3C APG patterns |
| [wcag-query](wcag-query/) | WCAG 2.2 SCs + techniques + failures |
| [act-rules-query](act-rules-query/) | W3C ACT rules (with their WCAG SC mappings) |
| [a11y-assist-core](a11y-assist-core/) | The aggregator: composes the above into recipes + drill-down |
| [a11y-assist-mcp](a11y-assist-mcp/) | The MCP server for AI agents |

The three query packages mirror the [`aria-query`](https://www.npmjs.com/package/aria-query) precedent — independently useful to eslint plugins, doc generators, or other MCP servers, with no dependency on the rest of a11y-assist.
