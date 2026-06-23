# a11y-assist

Accessibility tooling that aggregates authoritative W3C sources into one core and serves it two ways: to **AI coding agents** through an MCP server, and to **developers** through a browsable website. Same data, every claim traceable to its source.

## What's here

Six workspace packages in a simple line: three verbatim-W3C data libraries → one aggregator → two surfaces over the same data, one for agents and one for humans.

```
packages/
│  data libraries (one upstream W3C source each)
├── apg-query/        — programmatic access to the W3C ARIA Authoring Practices Guide patterns
├── wcag-query/       — programmatic access to WCAG 2.2 SCs + Techniques + Failures
├── act-rules-query/  — programmatic access to W3C ACT Rules (loaded from snapshotted YAML/MD)
│
│  aggregator (pure logic)
├── core/  (a11y-assist-core) — composes the three query packages (+ aria-query) into recipe + ARIA
│                        contract + drill-down queries, and shapes audit responses. No editorial data.
│
│  surfaces (same data, two audiences)
├── mcp/   (a11y-assist-mcp)  — the MCP server: the agent's view. Wraps a11y-assist-core as MCP tools and runs
│                        Playwright + axe-core for web validation. This is what AI agents connect to.
└── web/   (a11y-assist-web) — single-file SPA browser: the developer's view. The same data
                            composeApgPattern serves to agents, deployed to GitHub Pages.
```

The two surfaces read the **same** `a11y-assist-core`, so an agent (via MCP) and a developer (via the website) see the same guidance — they can't drift.

The three query packages mirror the precedent set by [`aria-query`](https://www.npmjs.com/package/aria-query) (which we use for ARIA spec data). They are independently useful — eslint plugins, Storybook addons, doc generators, other MCP servers can all consume them without our MCP server.

## Why

Most accessibility tools either embed editorial paraphrase that drifts from the W3C source, or point you at the W3C site and leave the synthesis to you. a11y-assist takes a different stance: **every claim is traceable to a versioned upstream document.** Paraphrase is replaced by aggregation — the system composes authoritative data at request time, and the agent (Claude or any LLM) does the synthesis by reasoning over the structured inputs.

For the full picture — the accessibility model, the W3C sources, the data pipeline, and the snapshot discipline that keeps it honest — see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Quick start (MCP server)

```sh
npm install
npm run build
npx playwright install chromium  # required for audit tools

# Configure your MCP client to invoke:
node packages/mcp/dist/server.js
```

For Claude Code / Cursor / VS Code Copilot config snippets, see [`packages/mcp/README.md`](./packages/mcp/README.md).

## Quick start (libraries)

```sh
npm install apg-query
npm install wcag-query
```

```ts
import { getPattern } from 'apg-query'
import { getSC, getFailure } from 'wcag-query'

const button = getPattern('button')          // verbatim APG content
const sc = getSC('2.4.7')                     // SC + technique + failure IDs
const f78 = getFailure('F78')                 // verbatim W3C failure title + URL
```

## Quick start (website)

```sh
npm run web          # build the single-file app and open it locally
```

The docs site (just-the-docs) and the app both live in `docs/` and deploy to GitHub Pages. The app is a single self-contained `docs/app/index.html`; refresh it after app changes with `npm run docs:app`.

## Honest scope

- **Web only.** Planning (`get_apg_pattern`, `get_aria_role`) and validation (`audit_html`, `audit_url`) target the web. React Native is a reserved future surface — not implemented.
- **Validation** runs axe-core + Playwright. axe catches ~50% of WCAG; a clean audit means "no automated violations found," not "accessible."
- **ACT blind spot**: some visual/perceptual SCs (contrast, target size, focus appearance) have no ACT rules — caught by `audit_html`/`audit_url`, not asserted per pattern.
- **Manual screen reader, keyboard, and cognitive review**: still required. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) "Honest scope."

## Traceability

Nothing is asserted. Every claim is verbatim from a query package, mechanically derived from `aria-query`, or a query you run yourself; the one cross-corpus link (ACT rule → WCAG SC) comes straight from ACT front-matter. Each query package carries a versioned snapshot (date + source commit), and its committed raw HTML/YAML lets you re-derive the data. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`REDESIGN.md`](./REDESIGN.md).

## Status

- v0 / pre-1.0. Schemas may shift. APIs are stable in spirit (queries follow the aria-query precedent).
- 28 APG patterns and all 86 WCAG 2.2 Success Criteria covered. Extraction is mechanical — add entries to the extractor's list and re-run.
- Not yet on npm. Currently a workspace; publishing is a separate later step.

## Licensing

- Code: MIT.
- Extracted W3C content (in `packages/apg-query/src/data/` and `packages/wcag-query/src/data/`): redistributed under the W3C Document License with attribution. See each package's `NOTICE`.
