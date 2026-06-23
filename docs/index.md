---
title: Overview
nav_order: 1
---

# a11y-assist
{: .fs-9 }

Accessibility you can **query** — and honest about what only a human can check. APG, WCAG, ACT, and ARIA turned into on-demand data for AI agents and developers, with every claim traceable to a versioned W3C source.
{: .fs-6 .fw-300 }

[For humans → open the app]({{ '/app/' | relative_url }}){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[For agents → set it up]({{ '/agents/' | relative_url }}){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## The problem

Getting web accessibility right runs into two walls.

**1. The knowledge is fragmented and voluminous.** The norms live across four W3C documents, in prose and HTML — WCAG (the requirements), APG (recipes for components), ARIA (the vocabulary), ACT (conformance tests) — none of it machine-queryable, and doing a single component right means cross-referencing all of them. Worse, the relevant material for even one component (keyboard tables, an ARIA contract, several success criteria each with techniques and failures, ACT rules) is far too much to read — or, for an AI agent, to hold in context — all at once.

**2. Verification is only partly automatable.** Tools like axe cover roughly half of WCAG — the structural, machine-checkable half. The rest is *qualitative*: does the screen reader announce something **meaningful**? Is the label **clear in context**? Is focus **visibly** obvious? Most tooling quietly treats a passing automated scan as "accessible," which it isn't.

## What a11y-assist does

**Makes the knowledge queryable, on demand.** Each W3C source is extracted *verbatim* into a small library (see [Packages]({{ '/packages/' | relative_url }})), and the system serves it as a drill-down: enter at a pattern or role, then query progressively — the ARIA contract, then the ACT rules that apply, then the WCAG criteria they cover — gated to your conformance level. Nothing is dumped; you pull only what you need. This isn't merely tidier for humans — it's what lets an **agent** use the whole corpus without exhausting its context window.

**Makes verification honest, in tiers.** It automates what it can and makes the rest explicit, instead of hiding behind a green check:

> **Tier 1 — axe** runs the structural ~50%.
> **Tier 2 — the agent** verifies more by reviewing the code against the recipe (right element, required ARIA, accessible name, keyboard handlers, focus management).
> **Tier 3 — a human checklist** covers the irreducible qualitative part (screen-reader output, focus visibility, meaningful labels) — and even those items are *derived from the same sourced data* (the keyboard table, the ARIA contract), so they're concrete and traceable, not hand-waved.

Nothing is editorialised, and nothing claims more than it can: a11y-assist doesn't *make* your UI accessible — it makes the **route to accessibility** legible, sourced, and as automated as honesty allows.

## Built for AI-assisted development

a11y-assist is a **lightweight, on-demand, in-the-loop** companion for building accessible UI with an AI agent: plan a component correctly, verify it quickly, and get a short, sourced list of what a human still needs to check. It is **not (yet) a systematic CI / audit suite** — deeper, systematic auditing support is on the roadmap. Today's focus is fast, trustworthy verification while you build.

See [Architecture]({{ '/architecture/' | relative_url }}) for how it works — or jump in: [the app]({{ '/app/' | relative_url }}) for humans, [setup]({{ '/agents/' | relative_url }}) for agents.
