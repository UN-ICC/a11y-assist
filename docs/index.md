---
title: Overview
nav_order: 1
---

# a11y-assist

a11y-assist provides programmatic, source-traceable access to W3C web-accessibility guidance — WCAG, the ARIA Authoring Practices Guide (APG), WAI-ARIA, and ACT Rules — together with automated verification via axe-core. It is intended for AI-assisted development: an AI agent, through an MCP server, or a developer, through a web application, can retrieve the guidance relevant to a component and verify markup against it.

[Open the web application]({{ '/app/' | relative_url }}){: .btn .btn-primary .mr-2 }
[Set up for AI agents]({{ '/agents/' | relative_url }}){: .btn }

The two surfaces share one engine, so they give the same answers. The web application mirrors the agent's flow: choose an APG pattern or a native HTML role and get the WCAG criteria that apply plus a verification checklist, refine it for your component's content, or paste markup into the Verify tab to run axe-core in the browser. It also exposes the knowledge base directly — WCAG and ACT browsers, cross-linked both ways (each criterion lists the ACT rules that cover it; each rule lists the criteria it covers) — for reference outside the guided flow.

## Purpose

a11y-assist addresses two practical problems in applying web-accessibility standards.

### 1. The guidance is distributed and not machine-readable

Accessibility requirements are spread across four W3C documents — WCAG (requirements), APG (component recipes), WAI-ARIA (roles and properties), and ACT Rules (conformance tests). They are published as prose and HTML, and addressing a single component requires consulting all of them. The combined material for one component is also too large to review in full at once, and exceeds the context available to an AI agent.

a11y-assist extracts each source verbatim into a queryable library and exposes the data on demand: a request begins at a pattern or role and is refined progressively — the ARIA contract, the applicable ACT rules, and the WCAG Success Criteria they cover — filtered to the target conformance level. Only the requested information is returned.

### 2. Verification is only partly automatable

Automated tools, including axe-core, settle only the structurally testable part of WCAG — a minority of the criteria, not half. The rest require human judgement: whether a label is meaningful in context, whether screen-reader output is correct, whether the focus indicator is visible. a11y-assist never treats a passing scan as conformance. Instead it produces a verification checklist routed by who can settle each check:

1. **axe-core** — the automated structural checks.
2. **the agent** — review of the markup against the retrieved recipe (element choice, required ARIA, accessible name, keyboard handling, focus management).
3. **a human** — the remaining qualitative criteria, each citing its Success Criterion.

Determining which criteria even apply is itself partly judgement. The (experimental) applicability engine surfaces the criteria a component's *structure* entails automatically, and routes the content-dependent rest into the same checklist.

## Scope

a11y-assist supports lightweight, on-demand verification during AI-assisted development. It is not a systematic auditing or continuous-integration tool; broader support for systematic auditing is planned.

See [Architecture]({{ '/architecture/' | relative_url }}) for the technical model and [Packages]({{ '/packages/' | relative_url }}) for the libraries.
