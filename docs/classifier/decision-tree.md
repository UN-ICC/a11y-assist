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

## The gate map — full tree

Nine coarse facets (level 1), each split into sub-gates (level 2), each resolving to its predicate leaves (level 3). One subtree per facet — a single combined tree would be ~175 nodes. "gates SCs" is how many criteria the facet can decide. Below each tree, the same leaves as a table.

### media

**Gate:** Any audio or video (time-based media)?  ·  gates 13 SCs (1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.2.7, 1.2.8, 1.2.9, 1.4.2, 1.4.4, 1.4.7, 2.2.3)

```mermaid
flowchart LR
  g0["Any audio or video (time-based media)?"]
  g0 --> s0_0["Is there synchronized media (an audio and video track playing together)?"]
  s0_0 --> p0_0_0["captions"]
  s0_0 --> p0_0_1["live-audio-in-synchronized-media"]
  s0_0 --> p0_0_2["non-interactive-synchronized-media"]
  s0_0 --> p0_0_3["pauses-in-foreground-audio-insufficient"]
  s0_0 --> p0_0_4["prerecorded-audio-in-synchronized-media"]
  s0_0 --> p0_0_5["prerecorded-synchronized-media-present"]
  s0_0 --> p0_0_6["prerecorded-video-in-synchronized-media"]
  g0 --> s0_1["Is there standalone audio (sound-only content, e.g. an audio clip, autoplay sound, or audio CAPTCHA)?"]
  s0_1 --> p0_1_0["audio-captcha"]
  s0_1 --> p0_1_1["audio-lasts-more-than-3-seconds"]
  s0_1 --> p0_1_2["audio-logo"]
  s0_1 --> p0_1_3["audio-plays-automatically"]
  s0_1 --> p0_1_4["foreground-speech-primary"]
  s0_1 --> p0_1_5["live-audio-only-content-present"]
  s0_1 --> p0_1_6["musical-vocalization"]
  s0_1 --> p0_1_7["prerecorded-audio-only-media-present"]
  g0 --> s0_2["Is there video-only media (no audio track) or media provided as a labeled alternative for text?"]
  s0_2 --> p0_2_0["prerecorded-video-only-media-present"]
  s0_2 --> p0_2_1["media-alternative-for-text-clearly-labeled"]
```
| Sub-gate | predicate leaves |
|---|---|
| Is there synchronized media (an audio and video track playing together)? | `captions` `live-audio-in-synchronized-media` `non-interactive-synchronized-media` `pauses-in-foreground-audio-insufficient` `prerecorded-audio-in-synchronized-media` `prerecorded-synchronized-media-present` `prerecorded-video-in-synchronized-media` |
| Is there standalone audio (sound-only content, e.g. an audio clip, autoplay sound, or audio CAPTCHA)? | `audio-captcha` `audio-lasts-more-than-3-seconds` `audio-logo` `audio-plays-automatically` `foreground-speech-primary` `live-audio-only-content-present` `musical-vocalization` `prerecorded-audio-only-media-present` |
| Is there video-only media (no audio track) or media provided as a labeled alternative for text? | `prerecorded-video-only-media-present` `media-alternative-for-text-clearly-labeled` |

### images

**Gate:** Any images, icons, or graphics (non-text content)?  ·  gates 6 SCs (1.1.1, 1.3.6, 1.4.4, 1.4.5, 1.4.9, 2.5.3)

```mermaid
flowchart LR
  g1["Any images, icons, or graphics (non-text content)?"]
  g1 --> s1_0["Are there images of text (visual content that is a rendering of readable text, including in a component label)?"]
  s1_0 --> p1_0_0["image-of-text-customizable"]
  s1_0 --> p1_0_1["image-of-text-present"]
  s1_0 --> p1_0_2["particular-presentation-essential"]
  s1_0 --> p1_0_3["technology-can-achieve-visual-presentation"]
  s1_0 --> p1_0_4["ui-component-has-label-with-image-of-text"]
  g1 --> s1_1["Is there non-text content such as an image, chart, or icon?"]
  s1_1 --> p1_1_0["non-text-content-present"]
  s1_1 --> p1_1_1["icon-present"]
```
| Sub-gate | predicate leaves |
|---|---|
| Are there images of text (visual content that is a rendering of readable text, including in a component label)? | `image-of-text-customizable` `image-of-text-present` `particular-presentation-essential` `technology-can-achieve-visual-presentation` `ui-component-has-label-with-image-of-text` |
| Is there non-text content such as an image, chart, or icon? | `non-text-content-present` `icon-present` |

### color-contrast

**Gate:** Does anything rely on color, or need visual contrast?  ·  gates 4 SCs (1.4.1, 1.4.3, 1.4.6, 1.4.11)

```mermaid
flowchart LR
  g2["Does anything rely on color, or need visual contrast?"]
  g2 --> s2_0["Is color alone used to convey meaning, indicate an action, distinguish elements, or prompt a response?"]
  s2_0 --> p2_0_0["color-conveys-information"]
  s2_0 --> p2_0_1["color-distinguishes-visual-element"]
  s2_0 --> p2_0_2["color-indicates-action"]
  s2_0 --> p2_0_3["color-prompts-response"]
  g2 --> s2_1["Is there text or an image of text whose contrast could matter?"]
  s2_1 --> p2_1_0["text-or-image-of-text-present"]
  s2_1 --> p2_1_1["decorative-text"]
  s2_1 --> p2_1_2["inactive-ui-component-text"]
  s2_1 --> p2_1_3["logotype"]
  s2_1 --> p2_1_4["not-visible-text"]
  s2_1 --> p2_1_5["text-part-of-picture"]
  g2 --> s2_2["Are there non-text graphical objects or UI components whose contrast could matter?"]
  s2_2 --> p2_2_0["graphical-object-required-to-understand-present"]
  s2_2 --> p2_2_1["graphics-presentation-essential"]
  s2_2 --> p2_2_2["inactive-ui-component"]
  s2_2 --> p2_2_3["ui-component-appearance-user-agent-determined"]
```
| Sub-gate | predicate leaves |
|---|---|
| Is color alone used to convey meaning, indicate an action, distinguish elements, or prompt a response? | `color-conveys-information` `color-distinguishes-visual-element` `color-indicates-action` `color-prompts-response` |
| Is there text or an image of text whose contrast could matter? | `text-or-image-of-text-present` `decorative-text` `inactive-ui-component-text` `logotype` `not-visible-text` `text-part-of-picture` |
| Are there non-text graphical objects or UI components whose contrast could matter? | `graphical-object-required-to-understand-present` `graphics-presentation-essential` `inactive-ui-component` `ui-component-appearance-user-agent-determined` |

### text-language

**Gate:** Is there reading text / language content?  ·  gates 9 SCs (1.4.4, 1.4.8, 1.4.12, 2.5.3, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6)

```mermaid
flowchart LR
  g3["Is there reading text / language content?"]
  g3 --> s3_0["Is there text content, blocks of running text, or text labels at all?"]
  s3_0 --> p3_0_0["text-present"]
  s3_0 --> p3_0_1["blocks-of-text-present"]
  s3_0 --> p3_0_2["ui-component-has-label-with-text"]
  s3_0 --> p3_0_3["language-script-without-text-style-properties"]
  g3 --> s3_1["Are there foreign-language passages, proper names, or words of indeterminate language?"]
  s3_1 --> p3_1_0["passage-or-phrase-in-content"]
  s3_1 --> p3_1_1["proper-name"]
  s3_1 --> p3_1_2["technical-term"]
  s3_1 --> p3_1_3["word-of-indeterminate-language"]
  s3_1 --> p3_1_4["word-part-of-vernacular-of-surrounding-text"]
  g3 --> s3_2["Are there abbreviations, idioms, jargon, or words used in an unusual or restricted way?"]
  s3_2 --> p3_2_0["abbreviation-present"]
  s3_2 --> p3_2_1["idiom-present"]
  s3_2 --> p3_2_2["jargon-present"]
  s3_2 --> p3_2_3["word-or-phrase-used-in-unusual-or-restricted-way"]
  g3 --> s3_3["Does the text demand advanced reading ability or depend on pronunciation to be understood?"]
  s3_3 --> p3_3_0["text-requires-advanced-reading-ability-after-removing-proper-names-and-titles"]
  s3_3 --> p3_3_1["word-meaning-ambiguous-without-pronunciation"]
```
| Sub-gate | predicate leaves |
|---|---|
| Is there text content, blocks of running text, or text labels at all? | `text-present` `blocks-of-text-present` `ui-component-has-label-with-text` `language-script-without-text-style-properties` |
| Are there foreign-language passages, proper names, or words of indeterminate language? | `passage-or-phrase-in-content` `proper-name` `technical-term` `word-of-indeterminate-language` `word-part-of-vernacular-of-surrounding-text` |
| Are there abbreviations, idioms, jargon, or words used in an unusual or restricted way? | `abbreviation-present` `idiom-present` `jargon-present` `word-or-phrase-used-in-unusual-or-restricted-way` |
| Does the text demand advanced reading ability or depend on pronunciation to be understood? | `text-requires-advanced-reading-ability-after-removing-proper-names-and-titles` `word-meaning-ambiguous-without-pronunciation` |

### timing-motion

**Gate:** Any time limits, moving/auto-updating content, animation, or flashing?  ·  gates 9 SCs (2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.3.1, 2.3.2, 2.3.3)

```mermaid
flowchart LR
  g4["Any time limits, moving/auto-updating content, animation, or flashing?"]
  g4 --> s4_0["Are there any time limits, session timeouts, or time-based events that could expire or risk data loss?"]
  s4_0 --> p4_0_0["time-limit-set-by-content"]
  s4_0 --> p4_0_1["authenticated-session-expires"]
  s4_0 --> p4_0_2["data-preserved-more-than-twenty-hours"]
  s4_0 --> p4_0_3["user-inactivity-could-cause-data-loss"]
  s4_0 --> p4_0_4["event-or-activity-present"]
  s4_0 --> p4_0_5["real-time-event"]
  g4 --> s4_1["Is there any moving, blinking, scrolling, or auto-updating content?"]
  s4_1 --> p4_1_0["auto-updating-information-present"]
  s4_1 --> p4_1_1["moving-blinking-or-scrolling-information-present"]
  s4_1 --> p4_1_2["lasts-more-than-five-seconds"]
  s4_1 --> p4_1_3["starts-automatically"]
  s4_1 --> p4_1_4["presented-in-parallel-with-other-content"]
  s4_1 --> p4_1_5["part-of-essential-activity"]
  g4 --> s4_2["Does the content interrupt the user with alerts, pop-ups, or auto-updates?"]
  s4_2 --> p4_2_0["interruptions-present"]
  s4_2 --> p4_2_1["emergency-interruption"]
  g4 --> s4_3["Is there any flashing, animation, or motion effect?"]
  s4_3 --> p4_3_0["flashing-content-present"]
  s4_3 --> p4_3_1["motion-animation-triggered-by-interaction-present"]
  s4_3 --> p4_3_2["animation-essential-to-functionality"]
  s4_3 --> p4_3_3["animation-essential-to-information-conveyed"]
```
| Sub-gate | predicate leaves |
|---|---|
| Are there any time limits, session timeouts, or time-based events that could expire or risk data loss? | `time-limit-set-by-content` `authenticated-session-expires` `data-preserved-more-than-twenty-hours` `user-inactivity-could-cause-data-loss` `event-or-activity-present` `real-time-event` |
| Is there any moving, blinking, scrolling, or auto-updating content? | `auto-updating-information-present` `moving-blinking-or-scrolling-information-present` `lasts-more-than-five-seconds` `starts-automatically` `presented-in-parallel-with-other-content` `part-of-essential-activity` |
| Does the content interrupt the user with alerts, pop-ups, or auto-updates? | `interruptions-present` `emergency-interruption` |
| Is there any flashing, animation, or motion effect? | `flashing-content-present` `motion-animation-triggered-by-interaction-present` `animation-essential-to-functionality` `animation-essential-to-information-conveyed` |

### pointer-gesture

**Gate:** Any pointer gestures, dragging, motion, or touch targets?  ·  gates 7 SCs (2.1.1, 2.5.1, 2.5.2, 2.5.4, 2.5.5, 2.5.7, 2.5.8)

```mermaid
flowchart LR
  g5["Any pointer gestures, dragging, motion, or touch targets?"]
  g5 --> s5_0["Multipoint or path-based gestures (incl. path-dependent input)?"]
  s5_0 --> p5_0_0["functionality-uses-multipoint-gesture"]
  s5_0 --> p5_0_1["functionality-uses-path-based-gesture"]
  s5_0 --> p5_0_2["gesture-essential"]
  s5_0 --> p5_0_3["functionality-operated-with-single-pointer"]
  s5_0 --> p5_0_4["operates-user-agent-or-assistive-technology"]
  s5_0 --> p5_0_5["path-dependent-input-essential"]
  g5 --> s5_1["Dragging movements?"]
  s5_1 --> p5_1_0["functionality-using-dragging-movement-present"]
  s5_1 --> p5_1_1["dragging-essential"]
  s5_1 --> p5_1_2["functionality-determined-by-user-agent-not-modified-by-author"]
  g5 --> s5_2["Device-motion or user-motion actuation?"]
  s5_2 --> p5_2_0["functionality-operated-by-device-motion"]
  s5_2 --> p5_2_1["functionality-operated-by-user-motion"]
  s5_2 --> p5_2_2["motion-essential"]
  s5_2 --> p5_2_3["motion-operated-through-accessibility-supported-interface"]
  g5 --> s5_3["Custom-sized pointer/touch targets?"]
  s5_3 --> p5_3_0["equivalent-target-available"]
  s5_3 --> p5_3_1["target-inline-in-text"]
  s5_3 --> p5_3_2["target-presentation-essential"]
  s5_3 --> p5_3_3["target-presentation-essential-or-legally-required"]
  s5_3 --> p5_3_4["target-size-determined-by-user-agent"]
```
| Sub-gate | predicate leaves |
|---|---|
| Multipoint or path-based gestures (incl. path-dependent input)? | `functionality-uses-multipoint-gesture` `functionality-uses-path-based-gesture` `gesture-essential` `functionality-operated-with-single-pointer` `operates-user-agent-or-assistive-technology` `path-dependent-input-essential` |
| Dragging movements? | `functionality-using-dragging-movement-present` `dragging-essential` `functionality-determined-by-user-agent-not-modified-by-author` |
| Device-motion or user-motion actuation? | `functionality-operated-by-device-motion` `functionality-operated-by-user-motion` `motion-essential` `motion-operated-through-accessibility-supported-interface` |
| Custom-sized pointer/touch targets? | `equivalent-target-available` `target-inline-in-text` `target-presentation-essential` `target-presentation-essential-or-legally-required` `target-size-determined-by-user-agent` |

### forms-input

**Gate:** Does it collect user input (forms/fields)?  ·  gates 8 SCs (1.3.5, 3.3.1, 3.3.2, 3.3.3, 3.3.6, 3.3.7, 3.3.8, 3.3.9)

```mermaid
flowchart LR
  g6["Does it collect user input (forms/fields)?"]
  g6 --> s6_0["Is it part of an authentication flow / cognitive function test?"]
  s6_0 --> p6_0_0["cognitive-function-test-required-in-authentication-process"]
  s6_0 --> p6_0_1["cognitive-function-test-is-object-recognition"]
  s6_0 --> p6_0_2["cognitive-function-test-is-personal-content"]
  g6 --> s6_1["Does it validate or report input errors?"]
  s6_1 --> p6_1_0["input-error-automatically-detected"]
  s6_1 --> p6_1_1["correction-suggestions-known"]
  s6_1 --> p6_1_2["providing-suggestions-jeopardizes-security-or-purpose"]
  g6 --> s6_2["Does it re-request previously entered information?"]
  s6_2 --> p6_2_0["information-previously-entered-required-again-in-same-process"]
  s6_2 --> p6_2_1["information-required-for-security"]
  s6_2 --> p6_2_2["previously-entered-information-no-longer-valid"]
  s6_2 --> p6_2_3["re-entering-information-essential"]
  g6 --> s6_3["Does it collect or submit user input via fields?"]
  s6_3 --> p6_3_0["content-requires-user-input"]
  s6_3 --> p6_3_1["user-submits-information"]
  s6_3 --> p6_3_2["input-field-collecting-information-about-the-user"]
  s6_3 --> p6_3_3["input-field-serves-identified-input-purpose"]
```
| Sub-gate | predicate leaves |
|---|---|
| Is it part of an authentication flow / cognitive function test? | `cognitive-function-test-required-in-authentication-process` `cognitive-function-test-is-object-recognition` `cognitive-function-test-is-personal-content` |
| Does it validate or report input errors? | `input-error-automatically-detected` `correction-suggestions-known` `providing-suggestions-jeopardizes-security-or-purpose` |
| Does it re-request previously entered information? | `information-previously-entered-required-again-in-same-process` `information-required-for-security` `previously-entered-information-no-longer-valid` `re-entering-information-essential` |
| Does it collect or submit user input via fields? | `content-requires-user-input` `user-submits-information` `input-field-collecting-information-about-the-user` `input-field-serves-identified-input-purpose` |

### navigation-context

**Gate:** Is it navigation, part of a page set, or a multi-step/transactional process?  ·  gates 10 SCs (2.4.1, 2.4.4, 2.4.5, 2.4.8, 2.4.9, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.3.4)

```mermaid
flowchart LR
  g7["Is it navigation, part of a page set, or a multi-step/transactional process?"]
  g7 --> s7_0["Is this page one of a set of related pages with content/mechanisms repeated across them?"]
  s7_0 --> p7_0_0["blocks-of-content-repeated-on-multiple-web-pages"]
  s7_0 --> p7_0_1["components-with-same-functionality-within-set-present"]
  s7_0 --> p7_0_2["navigational-mechanism-repeated-on-multiple-pages-in-set"]
  s7_0 --> p7_0_3["web-page-within-set-of-web-pages"]
  g7 --> s7_1["Does the page provide a help or contact mechanism?"]
  s7_1 --> p7_1_0["fully-automated-contact-mechanism-present"]
  s7_1 --> p7_1_1["help-mechanism-repeated-on-multiple-pages-in-set"]
  s7_1 --> p7_1_2["human-contact-details-present"]
  s7_1 --> p7_1_3["human-contact-mechanism-present"]
  s7_1 --> p7_1_4["self-help-option-present"]
  g7 --> s7_2["Is it a step in a multi-step / transactional process (legal / financial / data-changing)?"]
  s7_2 --> p7_2_0["financial-transaction-caused"]
  s7_2 --> p7_2_1["legal-commitment-caused"]
  s7_2 --> p7_2_2["user-controllable-data-modified-or-deleted"]
  s7_2 --> p7_2_3["user-test-responses-submitted"]
  s7_2 --> p7_2_4["web-page-is-result-of-process"]
  s7_2 --> p7_2_5["web-page-is-step-in-process"]
  g7 --> s7_3["Are there links or controls whose activation changes context?"]
  s7_3 --> p7_3_0["change-of-context-present"]
  s7_3 --> p7_3_1["link-purpose-ambiguous-to-users-in-general"]
```
| Sub-gate | predicate leaves |
|---|---|
| Is this page one of a set of related pages with content/mechanisms repeated across them? | `blocks-of-content-repeated-on-multiple-web-pages` `components-with-same-functionality-within-set-present` `navigational-mechanism-repeated-on-multiple-pages-in-set` `web-page-within-set-of-web-pages` |
| Does the page provide a help or contact mechanism? | `fully-automated-contact-mechanism-present` `help-mechanism-repeated-on-multiple-pages-in-set` `human-contact-details-present` `human-contact-mechanism-present` `self-help-option-present` |
| Is it a step in a multi-step / transactional process (legal / financial / data-changing)? | `financial-transaction-caused` `legal-commitment-caused` `user-controllable-data-modified-or-deleted` `user-test-responses-submitted` `web-page-is-result-of-process` `web-page-is-step-in-process` |
| Are there links or controls whose activation changes context? | `change-of-context-present` `link-purpose-ambiguous-to-users-in-general` |

### structure-focus

**Gate:** Does it convey structure, or manage focus/keyboard interaction?  ·  gates 11 SCs (1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.4.10, 1.4.13, 2.1.4, 2.4.3, 2.4.11, 2.4.12, 2.4.13)

```mermaid
flowchart LR
  g8["Does it convey structure, or manage focus/keyboard interaction?"]
  g8 --> s8_0["Does it convey structure, relationships, order, or layout/orientation visually?"]
  s8_0 --> p8_0_0["information-structure-or-relationships-conveyed-through-presentation"]
  s8_0 --> p8_0_1["content-sequence-affects-meaning"]
  s8_0 --> p8_0_2["instructions-for-understanding-and-operating-content-present"]
  s8_0 --> p8_0_3["display-orientation-essential"]
  s8_0 --> p8_0_4["two-dimensional-layout-essential"]
  s8_0 --> p8_0_5["navigation-sequence-affects-meaning"]
  s8_0 --> p8_0_6["navigation-sequence-affects-operation"]
  g8 --> s8_1["Does it manage focus appearance, keyboard shortcuts, or overlay content that can obscure focus?"]
  s8_1 --> p8_1_0["author-created-content-present"]
  s8_1 --> p8_1_1["character-key-shortcut-implemented"]
  s8_1 --> p8_1_2["focus-indicator-determined-by-user-agent"]
  s8_1 --> p8_1_3["focus-indicator-not-modified-by-author"]
  s8_1 --> p8_1_4["keyboard-focus-indicator-visible"]
  g8 --> s8_2["Does extra content appear on hover or focus?"]
  s8_2 --> p8_2_0["additional-content-user-agent-controlled"]
  s8_2 --> p8_2_1["focus-triggers-additional-content"]
  s8_2 --> p8_2_2["hover-triggers-additional-content"]
```
| Sub-gate | predicate leaves |
|---|---|
| Does it convey structure, relationships, order, or layout/orientation visually? | `information-structure-or-relationships-conveyed-through-presentation` `content-sequence-affects-meaning` `instructions-for-understanding-and-operating-content-present` `display-orientation-essential` `two-dimensional-layout-essential` `navigation-sequence-affects-meaning` `navigation-sequence-affects-operation` |
| Does it manage focus appearance, keyboard shortcuts, or overlay content that can obscure focus? | `author-created-content-present` `character-key-shortcut-implemented` `focus-indicator-determined-by-user-agent` `focus-indicator-not-modified-by-author` `keyboard-focus-indicator-visible` |
| Does extra content appear on hover or focus? | `additional-content-user-agent-controlled` `focus-triggers-additional-content` `hover-triggers-additional-content` |

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
