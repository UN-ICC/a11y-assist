# A11y MCP Server — DS Extension Authoring Guide

This guide describes how to write a DS extension that plugs into the core a11y MCP server. The core is described in `specs.md`; this document assumes you've read it.

A DS extension is **optional** and **additive**. Without one, the core runs WCAG audits against any HTML or URL using axe-core's built-in ruleset. An extension layers on:

- Custom `ds-*` rules specific to your design system's conventions.
- Per-component fix guidance prose (the "how should I fix this" content).
- Storybook integration: states-to-test, reference URLs, CI integration.
- Figma URL mapping per component.
- Optional generated documentation (Confluence, Storybook MDX) from a single source.
- Optional component-level tools (e.g. `get_ds_guidelines`).

**Version:** 1.0 (matches core ≥ 5.0)

---

## The contract

An extension is a Node module that exports an object conforming to `DSExtension`:

```typescript
import type { FastMCP } from 'fastmcp'

export interface DSExtension {
  name: string                     // "Acme DS"
  version: string                  // "1.2.0"
  bundlePath: string               // path to compiled browser bundle
  axeTags: string[]                // e.g. ['ds-rules']
  enrich(violations: any[], component?: string): any[]
  registerTools?(server: FastMCP<any>): void
}
```

The core loads the extension when `A11Y_MCP_EXTENSION` env var is set to its module path. The module's default export (or named export `extension`) is read.

---

## What an extension owns

| Concern | Lives in extension |
|---|---|
| Custom check logic (`evaluate` functions) | `src/rules/<component>.ts` |
| Custom rule definitions (axe shape) | `src/rules/<component>.ts` |
| Per-rule fix guidance + Figma refs | `src/rules/<component>.a11y.yaml` (optional YAML) or co-located in TS |
| Storybook URL + title convention | `src/storybook/index-loader.ts` |
| Figma URL mapping | `src/rules/figma-mapping.ts` |
| Component briefings (LLM input) | `briefings/<component>.brief.yaml` (optional) |
| Generated docs (Confluence, MDX) | `src/docs/*` |
| Browser bundle (`axe.configure(...)` call) | `src/browser/ds-bundle.ts` → `dist/ds-rules.js` |

The extension is a normal TypeScript project that builds two artefacts: a Node entry (`dist/index.js`) implementing the `DSExtension` interface, and a browser bundle (`dist/ds-rules.js`) that calls `axe.configure` with the custom checks and rules.

---

## Recommended layout

```
my-ds-a11y-extension/
├── src/
│   ├── index.ts                    # exports DSExtension default
│   ├── browser/
│   │   └── ds-bundle.ts            # axe.configure(...) — built to dist/ds-rules.js
│   ├── rules/
│   │   ├── types.ts                # DsCheck, DsRule, RuleGuidance, ComponentMeta
│   │   ├── figma-mapping.ts
│   │   ├── button.ts               # checks + rules + meta
│   │   ├── button.a11y.yaml        # guidance prose (optional pattern)
│   │   ├── input.ts
│   │   ├── input.a11y.yaml
│   │   └── ... (one per DS component)
│   ├── storybook/
│   │   └── index-loader.ts         # fetch + cache reference Storybook index.json
│   ├── enrich/
│   │   └── load-guidelines.ts      # synthesises per-component guidelines
│   ├── tools/
│   │   └── get-ds-guidelines.ts    # registered via registerTools()
│   └── docs/
│       ├── generate-confluence.ts  # CI script
│       └── generate-mdx.ts         # CI script
├── briefings/                      # optional: LLM-generation input
│   ├── button.brief.yaml
│   └── ...
├── dist/
│   ├── index.js                    # Node entry (output of tsc)
│   └── ds-rules.js                 # browser bundle (output of esbuild)
├── package.json
└── tsconfig.json
```

---

## The Node entry

```typescript
// src/index.ts
import path from 'path'
import type { DSExtension } from 'a11y-mcp-core/extensions/types'
import { mapViolationsToGuidelines } from './enrich/load-guidelines'
import { getDsGuidelinesTool } from './tools/get-ds-guidelines'

const extension: DSExtension = {
  name: 'Acme DS',
  version: '1.0.0',
  bundlePath: path.resolve(__dirname, 'ds-rules.js'),
  axeTags: ['ds-rules'],

  enrich(violations, component) {
    return mapViolationsToGuidelines(violations, component)
  },

  registerTools(server) {
    server.addTool(getDsGuidelinesTool)
  },
}

export default extension
```

---

## The browser bundle

The bundle runs inside the audit page after axe-core loads. It calls `axe.configure({ checks, rules })` once with all custom checks and rules.

```typescript
// src/browser/ds-bundle.ts
import { buttonChecks, buttonRules } from '../rules/button'
import { inputChecks, inputRules } from '../rules/input'
// ...one import per component

;(function register(axe: any) {
  if (!axe) throw new Error('axe-core must be loaded before ds-rules.js')
  axe.configure({
    checks: [...buttonChecks, ...inputChecks /* ... */],
    rules:  [...buttonRules,  ...inputRules  /* ... */],
  })
})((window as any).axe)
```

Build with esbuild:

```bash
esbuild src/browser/ds-bundle.ts --bundle --outfile=dist/ds-rules.js --platform=browser
```

---

## Rule files

Each rule file exports `<component>Checks`, `<component>Rules`, and `<component>Meta`. Guidance lives either in the same file (TS map keyed by rule id) or in a sibling YAML for easier non-engineer authoring. Either pattern works; pick one and apply it consistently.

### Types

```typescript
// src/rules/types.ts
export interface DsCheck {
  id: string
  evaluate: (this: { data: (payload: unknown) => void }, node: Element) => boolean
}

export interface DsRule {
  id: string
  selector: string
  tags: string[]                   // include 'ds-rules'
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  metadata: { description: string; help: string; helpUrl: string }
  any?: string[]; all?: string[]; none?: string[]
}

export interface RuleGuidance {
  figma_ref: string
  fix_guidance: string
}

export interface ComponentMeta {
  component: string                // e.g. "Button"
  storybook_title: string          // e.g. "Components/Button"

  // Classification — exactly one must be present. See "Classifying DS
  // components" below.
  apg_patterns?: string[]          // APG-aligned: ['button'], ['menu','menubutton']
  primitive?: {                    // HTML primitive (native element wrapper)
    html_element: string           // e.g. 'input', 'a', 'img'
    aria_role: string              // e.g. 'textbox', 'link', 'img'
    html_attribute_filter?: Record<string, string>  // e.g. {type: 'text'}
  }
  novel?: {                        // No APG pattern AND not a primitive
    reason: string
    closest_patterns: string[]
  }
}
```

A worked Button example (TS pattern, with co-located guidance) is in `examples/rules/button.ts`. The YAML pattern equivalent is in `examples/rules/button.a11y.yaml`.

---

## Classifying DS components

The framework's recipe layer has APG patterns (custom / composite, both web and RN) plus per-platform primitives (HTML primitives for web; RN primitives for react-native). Every DS component falls into one of these, or is novel, or is layout-only.

> **Platform note:** if the DS targets both web and RN, the same `ComponentMeta` should describe both — the APG / primitive classification stays the same conceptually, but the underlying implementation differs. The DS extension may declare which platforms each component is implemented on (see "Platform support" below).

For every component in the DS, `ComponentMeta` must declare exactly one of:

- **APG-aligned** — `apg_patterns: [...]`. One pattern (1:1 mapping) or several (composition).
- **HTML primitive** — `primitive: { html_element, aria_role, html_attribute_filter? }`. The component is a styled wrapper over a native HTML element. No APG pattern applies because HTML covers it natively.
- **Novel** — `novel: { reason, closest_patterns }`. Must explain why neither APG nor a primitive fits, and link to the nearest patterns for partial guidance.

A fourth case is layout-only: `apg_patterns: []` (empty array). Use this for cards, panels, decorative containers — components governed by WCAG (contrast, structure) but with no specific interactive semantics.

If you cannot name the APG pattern OR primitive your component corresponds to, classify it as `novel`. **Don't leave it ambiguous** — silent ambiguity is the most common a11y failure mode (e.g. building a custom dropdown without realising it's a `listbox` and auditing it for nothing).

### Worked examples

| DS component | Classification | Justification |
|---|---|---|
| `Button` | `apg_patterns: ['button']` | 1:1 with APG button (custom-element variant). For native `<button>` wrappers, classify as primitive instead. |
| `Modal` | `apg_patterns: ['dialog']` | 1:1 with APG dialog |
| `Tabs` | `apg_patterns: ['tabs']` | 1:1 — composite ARIA roles handled within the pattern |
| `DropdownMenu` | `apg_patterns: ['menu', 'menubutton']` | Composition: trigger button + menu |
| `Combobox` | `apg_patterns: ['combobox', 'listbox']` | Composition: input + listbox |
| `DataGrid` | `apg_patterns: ['grid']` (plus `['textbox']` etc. if cells contain editors) | 1:1 base; compositional when cells are interactive |
| `Input` (text) | `primitive: { html_element: 'input', aria_role: 'textbox', html_attribute_filter: { type: 'text' } }` | Styled wrapper over `<input>`; HTML covers the contract |
| `TextArea` | `primitive: { html_element: 'textarea', aria_role: 'textbox' }` | Native primitive |
| `Link` | `primitive: { html_element: 'a', aria_role: 'link' }` | Use `<a href>`; APG link pattern is for non-anchor cases |
| `Image` | `primitive: { html_element: 'img', aria_role: 'img' }` | Native primitive |
| `Checkbox` (native wrapper) | `primitive: { html_element: 'input', aria_role: 'checkbox', html_attribute_filter: { type: 'checkbox' } }` | If you wrap `<input type="checkbox">`, primitive — not APG. APG checkbox is for custom-element checkboxes. |
| `CommandPalette` | `novel: { reason: 'Spotlight-style fuzzy launcher; APG combobox is closest but lacks the multi-action grouping and recent-items semantics', closest_patterns: ['combobox', 'listbox'] }` | No direct APG pattern, no native equivalent |
| `RichTextEditor` | `novel: { reason: 'Inline formatting toolbar with caret-anchored UI; no APG pattern covers contenteditable editing surfaces', closest_patterns: ['toolbar'] }` | No direct APG pattern |
| `Card` | `apg_patterns: []` | Layout-only; no interactive role; governed by WCAG |

### Build-time validation

In your extension's CI build, validate that:

- Every string in `apg_patterns` exists in the core's `listPatterns('web').apg_patterns` (the APG list is platform-agnostic, so 'web' is fine here).
- Every string in `primitive.aria_role` resolves via the core's lookup on the relevant platform.
- Every string in `novel.closest_patterns` similarly resolves to a known pattern.
- Exactly one of `apg_patterns`, `primitive`, or `novel` is present.

This is a small validator — ~30 lines — that imports the core's pattern registry and checks each `ComponentMeta`. Fail the build on any mismatch.

### Platform support

If the DS targets both web and RN, the extension may declare per-component which platforms it implements:

```typescript
ComponentMeta = {
  // ... classification fields above ...
  platforms?: ('web' | 'react-native')[]   // omitted = ['web']
}
```

The audit pipeline should then call the core's `audit_html` / `audit_url` only for web-supported components; for RN-only components, validation falls back to manual / lint-based / simulator-based testing. The planning surface (`get_a11y_pattern`) works identically on both platforms — the agent just passes the right `platform` argument when looking up.

---

## Component briefings (optional, LLM-generated rules)

If your team prefers, the rule files can be **generated** from a per-component briefing — a ~30-line YAML describing conventions, tokens, and house-style decisions. An LLM consumes the briefing plus the ARIA APG pattern (from the core's `get_a11y_pattern`) plus the component's source code, and produces `<component>.ts` + `<component>.a11y.yaml`.

Briefing shape:

```yaml
component: Button
storybook_title: Components/Button
figma_url: https://figma.com/file/.../button
figma_annotations:
  prefix: "Button → "

selectors:
  base: "button"
  icon_only: "button.btn-icon"
  loading: "button.btn-loading"

tokens:
  text: btn-primary-text
  background: btn-primary-bg
  focus_ring: ds-focus-ring

impact_overrides:
  ds-button-disabled-pattern: serious

notes: |
  - We always prefer aria-disabled over the disabled attribute.
  - Icon-only buttons must use .sr-only span pattern, not aria-label.

apg_pattern: https://www.w3.org/WAI/ARIA/apg/patterns/button/
exclude_rules: []
```

The generation pipeline includes a validation loop: generated rules must NOT flag the component's canonical Storybook stories. If they do, the LLM regenerates with the failure as feedback. This makes the reference Storybook itself the test fixture for rule correctness.

---

## Storybook integration

The extension reads its reference Storybook's `index.json` to discover states-to-test and construct reference URLs.

```typescript
// src/storybook/index-loader.ts
const REFERENCE_URL = process.env.A11Y_MCP_REFERENCE_STORYBOOK ?? 'https://design.yourcompany.com'

interface StoryEntry {
  id: string; title: string; name: string
  type: 'story' | 'docs'
}

export async function loadStoryIndex(): Promise<Record<string, StoryEntry>> {
  const res = await fetch(`${REFERENCE_URL}/index.json`)
  const data = await res.json()
  return data.entries
}

export function storiesForComponent(
  index: Record<string, StoryEntry>,
  storybook_title: string,
): StoryEntry[] {
  return Object.values(index).filter(
    (s) => s.title === storybook_title && s.type === 'story',
  )
}

export const referenceUrl = (storyId: string) =>
  `${REFERENCE_URL}/?path=/story/${storyId}`
```

**Conventions enforced by this loader:**
- Component stories must live under exactly `Components/<Name>` (two segments).
- Other top-level paths (`Patterns/`, `Pages/`, ...) are not audited as DS components.
- Each component's `storybook_title` (in `<component>Meta`) must exactly match a Storybook title.

---

## The enricher

`mapViolationsToGuidelines` is the extension's enrichment step. It joins raw axe violations with per-rule guidance and component-level metadata (Figma URL, reference URL, states list).

The shape returned matches the core's enrichment shape, with `design_system` populated:

```json
{
  "axe_id": "ds-button-disabled-pattern",
  "impact": "serious",
  "description": "Disabled buttons must use aria-disabled, not the disabled attribute",
  "help_url": "https://your-ds-docs/button#disabled",
  "nodes_affected": 1,
  "design_system": {
    "rule": "Disabled buttons must use aria-disabled, not the disabled attribute",
    "figma_ref": "Button → States → Disabled",
    "fix_guidance": "Use aria-disabled=\"true\" instead of...",
    "wcag_criterion": ["ds-button-disabled-pattern"]
  }
}
```

---

## Optional: `get_ds_guidelines` tool

When the extension provides per-component briefing data (states, fix guidance, reference URLs), it should register a tool so the agent can fetch it before building.

```typescript
// src/tools/get-ds-guidelines.ts
import { z } from 'zod'
import { loadGuidelines } from '../enrich/load-guidelines'

export const getDsGuidelinesTool = {
  name: 'get_ds_guidelines',
  description: `
    Return the design system spec for a component: states to test (each
    with a reference Storybook URL), Figma reference, per-rule fix
    guidance. Surface reference_url to the developer as the canonical
    implementation to compare against before building.
  `,
  parameters: z.object({ component: z.string() }),
  execute: async ({ component }) => {
    return JSON.stringify(await loadGuidelines(component))
  },
}
```

This tool is **only registered when the extension is loaded**. The core never assumes it exists.

---

## Generated documentation

A scheduled CI job in the extension can generate Confluence pages and Storybook MDX from the rule files, making the rule files the canonical source for org-wide a11y documentation. Both renderers iterate over the same `loadGuidelines` output, so docs and the audit can never disagree on what a rule says.

This is **the extension's responsibility**, not the core's. The core ships nothing about Confluence or MDX.

---

## Build & install

```jsonc
// package.json (extension)
{
  "name": "@acme/a11y-mcp-extension",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build:bundle": "esbuild src/browser/ds-bundle.ts --bundle --outfile=dist/ds-rules.js --platform=browser",
    "build:node": "tsc",
    "build": "npm run build:bundle && npm run build:node"
  },
  "peerDependencies": {
    "a11y-mcp-core": "^5.0.0"
  },
  "dependencies": {
    "axe-core": "^4.10.0",
    "zod": "^3.23.0",
    "js-yaml": "^4.1.0"
  }
}
```

To install for a developer:

```bash
# install both
npm install -g a11y-mcp-core @acme/a11y-mcp-extension

# tell the core where the extension is
export A11Y_MCP_EXTENSION=$(node -e "console.log(require.resolve('@acme/a11y-mcp-extension'))")
export A11Y_MCP_REFERENCE_STORYBOOK=https://design.yourcompany.com
```

Or via the MCP client config:

```json
{
  "mcpServers": {
    "a11y": {
      "command": "node",
      "args": ["/path/to/a11y-mcp-core/dist/server.js"],
      "env": {
        "A11Y_MCP_EXTENSION": "/path/to/extension/dist/index.js",
        "A11Y_MCP_REFERENCE_STORYBOOK": "https://design.yourcompany.com"
      }
    }
  }
}
```

---

## Verification

When you start the server with the extension configured, you should see:

```
[a11y-mcp] Loaded DS extension: Acme DS v1.0.0
[a11y-mcp] axe tags: wcag2a, wcag2aa, wcag21a, wcag21aa, ds-rules
[a11y-mcp] Tools: audit_html, audit_url, get_a11y_pattern, get_ds_guidelines
```

Smoke test:

1. Call `get_ds_guidelines("Button")` — should return states from your Storybook index.
2. Call `audit_html("<button disabled>x</button>", "Button")` — should return your `ds-button-disabled-pattern` violation with `design_system` populated.
3. Call `get_a11y_pattern("button")` — should return the core's APG pattern (universal, unaffected by extension).

If any of those return an unexpected shape, your extension is misconfigured. Common causes: bundle path wrong, axe tags missing `'ds-rules'`, enricher not handling unknown component names gracefully.
