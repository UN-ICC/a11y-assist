---
title: Home
nav_order: 1
---

# a11y-assist
{: .fs-9 }

Source-traceable web accessibility — APG, WCAG, ACT, and ARIA, plus axe verification. One source of truth, served two ways: to **AI agents** through an MCP server, and to **developers** through this browser. Every claim traces back to a versioned W3C document.
{: .fs-6 .fw-300 }

[Open the app]({{ '/app/' | relative_url }}){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[Architecture]({{ '/architecture/' | relative_url }}){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## What it is

The **app** lets you browse the same data the agent uses — APG patterns and native ARIA primitives, each with its ARIA contract, native HTML elements, and drill-down to the WCAG criteria and ACT rules that apply, gated to your conformance level (A / AA / AAA). The **Verify** tab runs axe-core in your browser on a pasted HTML snippet.

## How it's built

Three verbatim W3C data libraries feed one aggregator, which is exposed two ways:

- **Agents** connect to the `a11y-assist-mcp` server and get planning + verification tools.
- **Developers** use this site.

Nothing is editorialised: the system hands over verbatim recipes plus *queries to run*, and the agent (or you) does the synthesis. The one honest caveat — automation covers roughly half of WCAG — is built into how the tool reports, so what a human still needs to verify is always made explicit.

See the [Architecture]({{ '/architecture/' | relative_url }}) and the [Agent guide]({{ '/agent-guide/' | relative_url }}) for details.
