---
title: Decision tree
parent: Classifier (WIP)
nav_order: 3
permalink: /classifier/decision-tree/
---

# Decision tree

The *pre-verification* problem: given a component, **which Success Criteria apply at all?** Naively that means assessing all 157 applicability [predicates]({{ '/classifier/predicates/' | relative_url }}). This page is the mechanism that resolves it in a few rounds of mostly-"no" questions instead.

## Three sources of truth

Applicability predicates are settled three ways, cheapest first:

1. **Derive** — the **22 `auto` predicates** come free from the component selection (its ARIA roles + contract + native elements). No questions.
2. **Gate** — the remaining **135** (instance + human) are organised into a 2-level prune tree: **9 facet gates** → **31 sub-gates**. A gate answered "no" prunes its whole cluster; "yes" includes it (conservative — over-include for review rather than miss).
3. **Ask / presume** — gates the agent can't derive from the build, it presumes "no" (build flow) or asks the user.

```mermaid
flowchart TD
  S["Select component (APG / role)"] --> R0["Round 0 — derive auto predicates · 0 questions"]
  R0 --> R1{"Round 1 — ~9 facet gates"}
  R1 -->|no| PR["prune facet cluster"]
  R1 -->|yes| R2{"Round 2 — that facet's 2–4 sub-gates"}
  R2 -->|no| PR2["prune sub-cluster"]
  R2 -->|yes| INC["include → those SCs apply"]
  PR --> OUT["Applicable SC set"]
  PR2 --> OUT
  INC --> OUT
```

## The gate map

Nine coarse facets (level 1), each split into sub-gates (level 2). "gates SCs" is how many criteria the facet can decide.

### media

**Gate:** Any audio or video (time-based media)?  ·  gates 13 SCs (1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.2.7, 1.2.8, 1.2.9, 1.4.2, 1.4.4, 1.4.7, 2.2.3)

| Sub-gate | preds |
|---|---|
| Is there synchronized media (an audio and video track playing together)? | 7 |
| Is there standalone audio (sound-only content, e.g. an audio clip, autoplay sound, or audio CAPTCHA)? | 8 |
| Is there video-only media (no audio track) or media provided as a labeled alternative for text? | 2 |

### images

**Gate:** Any images, icons, or graphics (non-text content)?  ·  gates 6 SCs (1.1.1, 1.3.6, 1.4.4, 1.4.5, 1.4.9, 2.5.3)

| Sub-gate | preds |
|---|---|
| Are there images of text (visual content that is a rendering of readable text, including in a component label)? | 5 |
| Is there non-text content such as an image, chart, or icon? | 2 |

### color-contrast

**Gate:** Does anything rely on color, or need visual contrast?  ·  gates 4 SCs (1.4.1, 1.4.3, 1.4.6, 1.4.11)

| Sub-gate | preds |
|---|---|
| Is color alone used to convey meaning, indicate an action, distinguish elements, or prompt a response? | 4 |
| Is there text or an image of text whose contrast could matter? | 6 |
| Are there non-text graphical objects or UI components whose contrast could matter? | 4 |

### text-language

**Gate:** Is there reading text / language content?  ·  gates 9 SCs (1.4.4, 1.4.8, 1.4.12, 2.5.3, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6)

| Sub-gate | preds |
|---|---|
| Is there text content, blocks of running text, or text labels at all? | 4 |
| Are there foreign-language passages, proper names, or words of indeterminate language? | 5 |
| Are there abbreviations, idioms, jargon, or words used in an unusual or restricted way? | 4 |
| Does the text demand advanced reading ability or depend on pronunciation to be understood? | 2 |

### timing-motion

**Gate:** Any time limits, moving/auto-updating content, animation, or flashing?  ·  gates 9 SCs (2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.3.1, 2.3.2, 2.3.3)

| Sub-gate | preds |
|---|---|
| Are there any time limits, session timeouts, or time-based events that could expire or risk data loss? | 6 |
| Is there any moving, blinking, scrolling, or auto-updating content? | 6 |
| Does the content interrupt the user with alerts, pop-ups, or auto-updates? | 2 |
| Is there any flashing, animation, or motion effect? | 4 |

### pointer-gesture

**Gate:** Any pointer gestures, dragging, motion, or touch targets?  ·  gates 7 SCs (2.1.1, 2.5.1, 2.5.2, 2.5.4, 2.5.5, 2.5.7, 2.5.8)

| Sub-gate | preds |
|---|---|
| Multipoint or path-based gestures (incl. path-dependent input)? | 6 |
| Dragging movements? | 3 |
| Device-motion or user-motion actuation? | 4 |
| Custom-sized pointer/touch targets? | 5 |

### forms-input

**Gate:** Does it collect user input (forms/fields)?  ·  gates 8 SCs (1.3.5, 3.3.1, 3.3.2, 3.3.3, 3.3.6, 3.3.7, 3.3.8, 3.3.9)

| Sub-gate | preds |
|---|---|
| Is it part of an authentication flow / cognitive function test? | 3 |
| Does it validate or report input errors? | 3 |
| Does it re-request previously entered information? | 4 |
| Does it collect or submit user input via fields? | 4 |

### navigation-context

**Gate:** Is it navigation, part of a page set, or a multi-step/transactional process?  ·  gates 10 SCs (2.4.1, 2.4.4, 2.4.5, 2.4.8, 2.4.9, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.3.4)

| Sub-gate | preds |
|---|---|
| Is this page one of a set of related pages with content/mechanisms repeated across them? | 4 |
| Does the page provide a help or contact mechanism? | 5 |
| Is it a step in a multi-step / transactional process (legal / financial / data-changing)? | 6 |
| Are there links or controls whose activation changes context? | 2 |

### structure-focus

**Gate:** Does it convey structure, or manage focus/keyboard interaction?  ·  gates 11 SCs (1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.4.10, 1.4.13, 2.1.4, 2.4.3, 2.4.11, 2.4.12, 2.4.13)

| Sub-gate | preds |
|---|---|
| Does it convey structure, relationships, order, or layout/orientation visually? | 7 |
| Does it manage focus appearance, keyboard shortcuts, or overlay content that can obscure focus? | 5 |
| Does extra content appear on hover or focus? | 3 |

## Measured cost

Running the rounds engine over a spread of components (with representative answer sets). Every one resolves **fully** — zero `depends` — in two question-rounds.

| Component | widget | yes-facets | questions (9 + sub) | applies | n/a | depends |
|---|---|---|---|---|---|---|
| alert | no | 2 | **16** | 12 | 74 | 0 |
| disclosure | yes | 3 | **19** | 22 | 64 | 0 |
| table | yes | 3 | **19** | 21 | 65 | 0 |
| tabs | yes | 3 | **19** | 24 | 62 | 0 |
| breadcrumb | no | 4 | **23** | 12 | 74 | 0 |
| checkbox | yes | 4 | **23** | 26 | 60 | 0 |
| combobox | yes | 4 | **23** | 29 | 57 | 0 |
| dialog | yes | 4 | **23** | 28 | 58 | 0 |

```mermaid
xychart-beta
    title "Questions to resolve applicability, by component"
    x-axis ["alert", "disclosure", "table", "tabs", "breadcrumb", "checkbox", "combobox", "dialog"]
    y-axis "questions" 0 --> 140
    bar [16, 19, 19, 19, 23, 23, 23, 23]
    line [135, 135, 135, 135, 135, 135, 135, 135]
```
The bars are the rounds engine; the flat line at 135 is the naive "ask every non-auto predicate." The count scales with component richness (2 active facets → ~16, 4 → ~23) and stays bounded well under the naive baseline.

## Why it converges

- **70 of 86 SCs are gated by a single facet** (see [reducibility]({{ '/classifier/predicates/#reducibility' | relative_url }})), so one gate cleanly decides each.
- **Within a facet the prior is skewed too** — "there is text? yes" but "abbreviations / idioms / foreign-language? no, no, no" — so sub-gates prune most of a yes-facet's contents.
- The tree is therefore **shallow (2 levels)** and the answers are **mostly "no"**, which is what collapses 135 → ~20.

## Caveats

- The per-component figures use **representative hardcoded answer sets** — what is validated is the mechanism and the bounded question count, not the exact `applies` for each component.
- "yes → include the cluster" is **conservative**: it can slightly over-apply. That is the safe direction for applicability (over-include for review, never silently miss); exceptions are refined at verification.
- The count can drop further: several facet gates are themselves **derivable** (`forms-input` ⇐ an input role, `navigation-context` ⇐ a link role), so a real agent would not ask them.
- Prototype only — `eval-rounds.mjs` / `rounds-lib.mjs` in `classify/`, not wired into the build.
