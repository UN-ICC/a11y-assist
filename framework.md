# The Accessibility Framework

This document is the conceptual model behind the a11y MCP server. It exists so future readers — and future-you — don't have to rebuild the mental model from the conversation that produced it.

This is the **vision document**. For the technical contract of the server, see [`packages/core/specs.md`](./packages/core/specs.md). For the algorithmic methodology that turns vision into trustworthy data, see [`methodology.md`](./methodology.md). For DS extension authoring, see [`packages/core/extension-spec.md`](./packages/core/extension-spec.md).

---

## The layered model

Web accessibility is a layered system. Each layer has a clear authority and a clear scope.

```
LAYER 4  │  WCAG                     ← requirements (what must be true for users)
         │     │
         │     │ "to satisfy these requirements, build it like this"
         │     v
LAYER 3  │  Two parallel recipe books:
         │     ├── APG               ← recipes for custom / composite components
         │     │                        (combobox, tabs, tree, dialog, menu...)
         │     └── HTML + ARIA in HTML ← recipes for native primitives
         │                              (input, textarea, a, img, button, select...)
         │     │
         │     │ "using these vocabulary words"
         │     v
LAYER 2  │  ARIA spec               ← vocabulary (roles, states, properties)
         │     │
         │     │ "consumed by"
         │     v
LAYER 1  │  Browsers + AT           ← the user's actual experience
         │   (NVDA, VoiceOver, JAWS, TalkBack)
```

**Layer 3 has two halves** because APG only covers part of UI building. APG describes patterns where you need ARIA + custom JS to recreate or augment what HTML doesn't natively provide. For native primitives — text inputs, links, images, native checkboxes — you don't go to APG; you go to the HTML spec and ARIA in HTML, which together tell you which native element to use and what role/semantics it carries.

Both halves of layer 3 are recipe books at the same conceptual altitude. APG is for custom; HTML + ARIA in HTML is for primitives. A real product uses both.

Each layer enables the one above:
- HTML + ARIA give you the words.
- APG shows you how to compose those words into working components.
- WCAG is the standard that says whether the resulting product is acceptable for users.
- AT (assistive technology) is what users actually experience your product through. The whole stack exists to serve this layer.

---

## The W3C documents

Each document plays a different role. Confusing them is the most common source of muddled accessibility thinking.

### WCAG 2.2 — Web Content Accessibility Guidelines

- **Role:** the requirements. What must be true for users.
- **Authority:** W3C Recommendation. **Normative** — must follow.
- **Structure:** four principles (POUR — Perceivable, Operable, Understandable, Robust); each principle has Guidelines; each Guideline has Success Criteria (SCs). Each SC has Sufficient Techniques (T-techniques) and documented Failures (F-techniques).
- **Levels:** A (minimum), AA (standard — legal baseline in most jurisdictions), AAA (high — rarely realistic across an entire UI).
- **Examples of SCs:**
  - **1.4.3** Contrast (Minimum), AA — text contrast ≥ 4.5:1
  - **2.1.1** Keyboard, A — all functionality available from keyboard
  - **4.1.2** Name, Role, Value, A — UI components must expose name, role, and value to AT
- **Available machine-readably** via the [`wcag-query`](./packages/wcag-query) package in this monorepo. Includes SCs + Techniques + Failures.
- **What it doesn't say:** *how* to satisfy the requirements. That's the job of APG.

### WAI-ARIA 1.2 — Accessible Rich Internet Applications

- **Role:** the vocabulary. Roles, states, and properties for describing UI semantics to assistive tech when native HTML can't express them.
- **Authority:** W3C Recommendation. **Normative**.
- **Available machine-readably** via the [`aria-query`](https://www.npmjs.com/package/aria-query) npm package — extracts the spec into queryable JS objects. This is what we use in the server.
- **Examples:** roles like `tab`, `tablist`, `tabpanel`, `dialog`; properties like `aria-label`, `aria-expanded`; states like `aria-selected`, `aria-disabled`.
- **The first rule of ARIA:** don't use ARIA. Prefer semantic HTML (`<button>`, `<nav>`, `<input type="email">`) which carries accessibility info natively. ARIA is for what HTML cannot express.

### APG — Authoring Practices Guide

- **Role:** recipes for building **custom or composite** UI components using ARIA + HTML + JS.
- **Authority:** W3C, but **informative** — recommended patterns, not strict requirements.
- **Format:** HTML pages only. No machine-readable form is published by W3C. We extract structured data into the [`apg-query`](./packages/apg-query) package — see `methodology.md` for how.
- **Coverage:** ~25 patterns. Mostly things HTML doesn't natively provide (combobox, tabs, tree, menu, slider) or augmentations of native elements (disclosure adds aria-expanded to a button).
- **Per-pattern content:** narrative summary, ARIA roles to use, keyboard interaction tables, focus management guidance, working code examples.
- **What APG deliberately doesn't cover:** native primitives. There's no APG pattern for "text input" because the answer is "use `<input type='text'>` with a `<label>`." For those, see HTML + ARIA in HTML below.

### HTML + ARIA in HTML — the primitives recipe book

- **HTML Living Standard (WHATWG):** defines `<input>`, `<button>`, `<a>`, `<select>`, `<textarea>`, `<img>`, etc. — the native elements with their built-in accessibility semantics.
- **[ARIA in HTML](https://www.w3.org/TR/html-aria/)** (W3C, **Normative**): the bridge table that maps each HTML element + attribute combo to its implicit ARIA role and rules about which ARIA attributes are allowed. Example: `<input type="email">` has implicit role `textbox`; `<a href>` has implicit role `link`; `<img alt>` has implicit role `img`.
- **Available machine-readably** via `aria-query`'s `elementRoles` and `roleElements` maps — same package we already use for the role contract data.
- **The first rule of ARIA still applies:** prefer HTML primitives whenever they exist. ARIA augments; it does not replace.

### How APG and HTML primitives relate

For most components, the decision tree is:

1. **Is there a native HTML element that does this?** Use it. (HTML + ARIA in HTML)
2. **Do I need to augment a native element?** Apply the APG pattern that covers it.
3. **Am I building from scratch with non-native elements?** Use the matching APG pattern (combobox, tabs, tree, etc.) and apply ARIA roles + JS keyboard handling.
4. **Does no APG pattern fit?** It's a novel component — combine APG primitives where you can and apply WCAG general principles for the rest.

---

## The two-part inventory of UI components

A team's UI components fall into one of these buckets:

- **HTML primitives** — covered by HTML + ARIA in HTML. Use the native element. ~10 commonly-built primitives: `<input>` (textbox, several types), `<textarea>`, `<a>` (link), `<img>`, native `<button>`, native `<select>`, native checkbox/radio.
- **APG patterns** — covered by APG. ~25 custom / composite patterns: button (custom), dialog, tabs, listbox, combobox, tree, menu + menubutton, accordion, disclosure, slider, etc.
- **Compositions** — combinations of the above. A "data grid with inline editors" composes APG `grid` + HTML `<input>`s. The design system's job is to compose; the framework's job is to provide the parts.
- **Novel patterns** — what neither APG nor HTML covers. Command palette, drag-and-drop reorder, code editor, data visualisations, map interactions. Combine primitives + APG + WCAG general principles; expect heavier manual testing.
- **Layout-only widgets** — cards, panels, decorative containers. Governed by WCAG (contrast, semantic structure); don't need an APG pattern or a primitive recipe.

The MCP server's `get_a11y_pattern` tool exposes the recipe layer through a single lookup, parameterised by **platform** (`web` | `react-native`). For APG patterns the response includes a platform-specific binding (web: HTML elements + keyboard; RN: components + gestures); for primitives the lookup routes to the platform-specific primitive dataset (HTML on web, RN on react-native). The response's `type` field — `'apg_pattern' | 'html_primitive' | 'rn_primitive'` — tells the agent which kind of card it received.

## The platform dimension

The recipe layer has a third axis beyond "is it a primitive vs. a pattern?" — **which platform are we targeting?** Web and React Native share most of layer 4 (WCAG) and all of layer 2 (ARIA roles via aria-query); they diverge at layer 3, the recipes:

| Aspect | Web | React Native |
|---|---|---|
| Universal: WCAG | ✅ same | ✅ same |
| Universal: ARIA contract (`aria_contract`) | ✅ from aria-query | ✅ same — RN's `accessibilityRole` maps 1:1 to ARIA roles |
| APG pattern recipe | Per-platform binding (HTML elements, keyboard) | Per-platform binding (RN components, gestures) |
| Primitives | HTML elements (input, a, img, …) | RN components (TextInput, Pressable, Image, Switch, Modal) |
| Authority for primitives | HTML spec + ARIA in HTML | RN docs + iOS HIG + Material |
| Validation | axe-core + Playwright | **No equivalent today** — planning works, automated audit does not (use HTML-approximation, lint, or manual testing) |

So our patterns dataset is structured as:
- **APG cards** with `platforms.web` and `platforms.react_native` blocks; the conceptual recipe is shared.
- **HTML primitives** in `primitives-html/` (web only).
- **RN primitives** in `primitives-rn/` (react-native only).

The agent gets one consistent surface. The `platform` parameter selects which binding/primitive-set is returned.

> **Honest scope for v1:** the **planning** tools (`get_a11y_pattern`, `list_a11y_patterns`) are platform-aware and work for both web and react-native. The **validation** tools (`audit_html`, `audit_url`) are web-only — axe-core needs a DOM. RN apps cannot be directly audited; the agent's options are HTML-approximation (~30–40% coverage), static analysis via `eslint-plugin-react-native-a11y`, simulator-based testing (Detox/Maestro), and manual VoiceOver/TalkBack passes.

---

## The tooling layer

```
W3C standards
  ├─ WAI-ARIA spec        ─→ aria-query (npm) ──────────────────┐
  ├─ APG patterns (HTML)  ─→ apg-query (this monorepo)          ┤
  ├─ WCAG 2.2 + Techniques (HTML) ─→ wcag-query (this monorepo) ┤
  └─ ACT Rules (YAML/MD)  ─→ act-rules-query (this monorepo)    ┤
                                                                 │
                              + axe-core (npm) ──────────────────┤
                              + role-bindings (small editorial) ─┤
                                                                  │
                                                                  v
                                                    a11y-mcp/core (this monorepo)
                                                    aggregates all of the above
                                                                  │
                                                          extends optionally
                                                                  v
                                                    DS extension (per-team)
```

The architecture is **aggregation, not authoring**. The MCP server core has no editorial content of its own beyond a tiny `role-bindings.json`. Every claim in a response traces back to one of:

- **`aria-query`** — extracts WAI-ARIA spec roles, properties, element-role mappings.
- **`apg-query`** — extracts APG pattern content (summary, keyboard tables, examples). One file per pattern committed alongside the snapshotted W3C HTML.
- **`wcag-query`** — extracts WCAG SCs, sufficient techniques, and documented failures.
- **`act-rules-query`** — loads W3C ACT (Accessibility Conformance Testing) Rules from snapshotted YAML/Markdown source files. Each ACT rule explicitly maps to WCAG SCs and contains an applicability statement, so the aggregator derives "which SCs apply to a role" mechanically rather than by editorial judgement.
- **`axe-core`** — runs the actual checks during audit; ships its own rule metadata.
- **`role-bindings.json`** (small editorial residue) — supplements ACT with SCs ACT doesn't yet cover (focus visibility, target size, etc.) plus the role → HTML/RN primitive mapping.

The MCP server core is an aggregator: it composes outputs from the four sources at request time. The agent does synthesis (recommendations, code, fixes) by reasoning over the structured data.

For the algorithmic discipline that keeps every source authoritative — pinned snapshots, reproducible extraction, no editorial drift — see [`methodology.md`](./methodology.md).

- **DS extension** (optional) — adds custom rules for DS conventions (e.g. `ds-button-disabled-pattern`), maps each DS component to its APG classification (see below).

---

## The core / extension contract

This is the boundary that makes the server's design honest:

### What the core covers

- **Universal**: works for any team, any DS, no DS.
- Mirrors APG (the universal inventory).
- Ships ~25 APG pattern cards (currently 5; expanding).
- Runs axe-core's full WCAG ruleset.
- Provides `get_a11y_pattern(role)` for pre-build planning.

### What the extension covers

- **Per-team**: maps the team's specific DS to the framework.
- For each DS component, declares **one** of:
  - **APG-aligned** — `apg_patterns: ['button']` or composition `apg_patterns: ['menu', 'menubutton']`.
  - **HTML primitive** — `primitive: { html_element: 'input', aria_role: 'textbox' }`. The component is a styled wrapper over a native HTML element; no APG pattern applies (because none was needed — HTML covers it).
  - **Novel** — `novel: { reason: '...', closest_patterns: [...] }`. Must justify why neither APG nor a primitive fits, and name the nearest patterns for partial guidance.
- Authors custom `ds-*` rules for DS-specific conventions (e.g. token-name enforcement, design-system-specific patterns the agent should follow).
- Provides DS-specific fix guidance, Figma references, etc.

### Why this contract matters

The contract forces honesty. If you can't name an APG pattern for your component, you must explicitly mark it `novel` and explain. This prevents the most common silent failure: building a custom dropdown without realising it's a `listbox`, then auditing it for nothing in particular because no one mapped it to a known accessible pattern.

It also keeps the boundary clean:
- The **core** is org-agnostic by virtue of mirroring W3C.
- The **extension** exists precisely for what W3C didn't standardise (your DS's specific compositions and novel components).

There is no DS-specific code in the core. There is no APG-pattern duplication in the extension. Each side owns its layer.

---

## Adding a new DS component — practical steps

When the design system gains a new component, the extension author:

1. **Identify the APG pattern(s).** Walk the APG list. Does this component correspond 1:1 to a pattern? Is it a composition of multiple patterns? Or is it novel?
2. **Classify in `ComponentMeta`.** Either `apg_patterns: [...]` or `novel: { reason, closest_patterns }`.
3. **Author DS-specific rules.** What patterns does *your DS* enforce that aren't covered by axe's WCAG ruleset? (e.g., "icon-only buttons must use the `.sr-only` text pattern, not `aria-label`.")
4. **Author per-rule guidance.** `figma_ref` + `fix_guidance` per rule, or via the YAML pattern if non-engineers will edit.
5. **Add to the rules bundle.** The new component's checks/rules get registered into axe via `axe.configure`.
6. **Add a Storybook story per state.** The reference Storybook becomes the test fixture.

Step 1 is the conceptual hook into this framework. Steps 2–6 are the mechanical work — all in `extension-spec.md`.

---

## What this server cannot tell you

Restated from `specs.md` for completeness. The framework's lower layer — what users actually experience through assistive technology — cannot be evaluated automatically. Every accessibility programme needs:

- **Manual screen reader testing** — NVDA / JAWS (Windows), VoiceOver (macOS, iOS), TalkBack (Android), Orca (Linux). Different ATs interpret the same code slightly differently.
- **Manual keyboard testing** — every interaction reachable, focus order matches visual order, focus is always visible, no traps.
- **Cognitive review** — clear language, predictable behaviour, error recovery, instructions that don't rely on colour or shape alone.

Automated tools (axe, this server) catch roughly 50% of WCAG issues. The other 50% is human judgement and is intentionally out of scope for this server. The framework explicitly includes layer 1 (AT) so we don't pretend automation is the whole answer.
