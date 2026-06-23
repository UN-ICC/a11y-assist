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
├── core/  (a11y-core) — composes the three query packages (+ aria-query + role-bindings) into a
│                        unified pattern shape, and shapes audit responses. No I/O, no MCP, no Playwright.
│
│  surfaces (same data, two audiences)
├── mcp/   (a11y-mcp)  — the MCP server: the agent's view. Wraps a11y-core as MCP tools and runs
│                        Playwright + axe-core for web validation. This is what AI agents connect to.
└── site/  (a11y-assist-site) — static GitHub Pages browser: the developer's view. The same data
                            loadPattern serves to agents, rendered as browsable pages.
```

The two surfaces read the **same** `a11y-core`, so an agent (via MCP) and a developer (via the website) see the same guidance — they can't drift.

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
npm run build:site   # regenerates the static site into docs/
```

The site is served from `docs/` as GitHub Pages — pattern, WCAG, and ACT pages built from the same data the MCP server returns.

## Honest scope

- **Web validation** (audit_html / audit_url): supported via axe-core + Playwright.
- **React Native validation**: not directly supported. axe is a DOM tool. RN audits require lint (`eslint-plugin-react-native-a11y`), simulator-based testing (Detox/Maestro), or HTML approximation.
- **Web + React Native planning** (get_a11y_pattern, list_a11y_patterns): supported. Both platforms get aria_contract, WCAG SCs, and platform-specific bindings.
- **Manual screen reader, keyboard, and cognitive review**: still required. axe catches roughly 50% of WCAG; the other 50% is human work. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) "Honest scope."

## Provenance

Every response from the MCP server includes a `provenance` block:

```json
{
  "apg_query": { "date": "2026-05-07", "pattern_count": 28 },
  "wcag_query": { "date": "2026-05-07", "version": "2.2", "sc_count": 86 },
  "aria_query": "aria-query npm package",
  "generated_at": "2026-05-07T..."
}
```

If a piece of guidance comes from APG, you can find it in the snapshotted HTML committed alongside the data. If it comes from WCAG, same. If it's the ARIA contract, it's mechanically derived from the WAI-ARIA spec via aria-query.

## Status

- v0 / pre-1.0. Schemas may shift. APIs are stable in spirit (queries follow the aria-query precedent).
- 28 APG patterns and all 86 WCAG 2.2 Success Criteria covered. Extraction is mechanical — add entries to the extractor's list and re-run.
- Not yet on npm. Currently a workspace; publishing is a separate later step.

## Licensing

- Code: MIT.
- Extracted W3C content (in `packages/apg-query/src/data/` and `packages/wcag-query/src/data/`): redistributed under the W3C Document License with attribution. See each package's `NOTICE`.
