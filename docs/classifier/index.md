---
title: Classifier (WIP)
nav_order: 5
has_children: true
permalink: /classifier/
---

# Classifier (WIP)

> **Work in progress.** This section documents an exploratory line of work and the intermediate data it has produced, for review. None of it is wired into the published packages yet. The artifacts live in [`packages/core/classify/`](https://github.com/UN-ICC/a11y-assist/tree/main/packages/core/classify).

Exploratory work toward a deterministic **applicability + verification engine** for WCAG: deciding which Success Criteria apply to a component from boolean *predicate* conditions, then which *postconditions* must hold to conform — and routing each predicate to automated tooling, an AI agent, or a human.

Two pages:

- **[Predicates]({{ '/classifier/predicates/' | relative_url }})** — the data. The applicability and verification predicate registries (with classification, scope, and definitions), the per-criterion prose-vs-expression tables, and the reducibility analysis.
- **[Automation assessment]({{ '/classifier/assessment/' | relative_url }})** — what the decomposition reveals about the limits of static analysis for accessibility, the upstream cost of judgment, and where reasoning agents and humans fit.
