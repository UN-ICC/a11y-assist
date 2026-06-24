---
title: Overview
nav_order: 1
---

# a11y-assist

a11y-assist provides programmatic, source-traceable access to W3C web-accessibility guidance — WCAG, the ARIA Authoring Practices Guide (APG), WAI-ARIA, and ACT Rules — together with automated verification via axe-core. It is intended for AI-assisted development: an AI agent, through an MCP server, or a developer, through a web application, can retrieve the guidance relevant to a component and verify markup against it.

[Open the web application]({{ '/app/' | relative_url }}){: .btn .btn-primary .mr-2 }
[Set up for AI agents]({{ '/agents/' | relative_url }}){: .btn }

The two surfaces share one query layer, so they return the same data. The web application mirrors the agent's tools: enter from an APG pattern or a native HTML role and drill down to the applicable ACT rules and WCAG criteria, or paste markup into the Verify tab to run axe-core in the browser. It also exposes the underlying knowledge base directly — WCAG and ACT browsers, cross-linked in both directions (each criterion lists the ACT rules that cover it; each rule lists the criteria it covers) — for reference outside the guided flow.

## Purpose

a11y-assist addresses two practical problems in applying web-accessibility standards.

### 1. The guidance is distributed and not machine-readable

Accessibility requirements are spread across four W3C documents — WCAG (requirements), APG (component recipes), WAI-ARIA (roles and properties), and ACT Rules (conformance tests). They are published as prose and HTML, and addressing a single component requires consulting all of them. The combined material for one component is also too large to review in full at once, and exceeds the context available to an AI agent.

a11y-assist extracts each source verbatim into a queryable library and exposes the data on demand: a request begins at a pattern or role and is refined progressively — the ARIA contract, the applicable ACT rules, and the WCAG Success Criteria they cover — filtered to the target conformance level. Only the requested information is returned.

### 2. Verification is only partly automatable

Automated tools, including axe-core, cover approximately half of the WCAG Success Criteria: the structurally testable ones. The remainder require human judgement — for example, whether a label is meaningful in context, whether screen-reader output is correct, or whether the focus indicator is visible. a11y-assist does not treat a passing automated scan as conformance. Verification proceeds in three stages:

1. axe-core performs the automated structural checks.
2. The agent reviews the markup against the retrieved recipe (element choice, required ARIA attributes, accessible name, keyboard handling, focus management).
3. The remaining qualitative criteria are presented as a checklist for human review. Each item is derived from the retrieved data — for example, the keyboard-interaction table or the ARIA contract — and cites its Success Criterion.

## Scope

a11y-assist supports lightweight, on-demand verification during AI-assisted development. It is not a systematic auditing or continuous-integration tool; broader support for systematic auditing is planned.

See [Architecture]({{ '/architecture/' | relative_url }}) for the technical model and [Packages]({{ '/packages/' | relative_url }}) for the libraries.
