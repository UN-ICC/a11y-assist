# Contributor guide for AI agents

This file orients an AI agent contributing to the **a11y-assist** repository. (It is distinct from `.claude/skills/a11y-assist/SKILL.md`, which instructs agents that *use* the tool; this file is for agents that *work on* it.)

## Repository layout

- `packages/apg-query`, `packages/wcag-query`, `packages/act-rules-query` — data libraries. Each extracts one W3C source verbatim (extractor in `tools/`, raw upstream in `snapshots/`, output in `src/data/`).
- `packages/core` (`a11y-assist-core`) — the composition layer. Pure logic, no data of its own.
- `packages/mcp` (`a11y-assist-mcp`) — the MCP server.
- `packages/web` (`a11y-assist-web`) — the single-file web app, built into `docs/app/`.
- `docs/` — the documentation site (just-the-docs) **and the canonical source of truth for documentation**; deployed to GitHub Pages from this folder.
- `scripts/` — maintenance scripts (e.g. `record-provenance.mjs`).

## Principles to preserve

- **Aggregation, not authorship.** Every fact is verbatim from an upstream source or mechanically derived. Do not add paraphrased guidance or hand-maintained role-to-criterion / role-to-rule mappings.
- **`a11y-assist-core` ships no data of its own.**
- **Snapshot discipline.** Data refreshes are deliberate and reviewed; never auto-publish scraped data.
- **`docs/` is canonical for documentation.** Package READMEs are thin pointers to the docs site — keep them minimal; do not duplicate doc content into them.
- **Honest scope.** Do not claim full automated conformance. Automated checks cover roughly half of WCAG; the remainder is surfaced as a human checklist.

## Commands

```sh
npm install
npm run build        # build all packages
npm test             # query-package + core test suites (node:test via tsx)
npm run test:types   # typecheck the tests
npm run typecheck    # typecheck all packages
npm run web          # build the web app and open it
npm run docs:app     # rebuild the app into docs/app/index.html
npm run extract      # refresh upstream data (reviewed action)
npm run provenance   # record version↔snapshot rows in the docs package pages
```

## Conventions

- Node ≥ 22; packages are ESM (`"type": "module"`), compiled with `tsc`.
- Tests live in each package's `test/` (`node:test` + `node:assert/strict`, run via `tsx`). Keep them per-package with no shared cross-package utilities, so each package stays independently extractable.
- Packages are published unscoped on npm; internal dependencies are pinned to real version ranges (not `*`).
- The conformance level (A / AA / AAA) is threaded through the compose functions and MCP tools, and is cumulative.

## Common tasks

- **Add an APG pattern or WCAG SC:** add an entry to the relevant extractor list, run `npm run extract`, review the diff, and commit the snapshot and data together.
- **Refresh data:** `npm run extract` → run the tests → review the diff → bump the version → `npm run provenance`.
- **Edit documentation:** edit the files under `docs/` (canonical). Leave package READMEs as thin pointers.

## Do not

- Add editorial mappings or paraphrased "best practices."
- Auto-publish scraped data to npm without review — the extractors are HTML scrapers that can break silently when upstream changes; the test suites are the guardrail.
- Commit local config (`.claude/settings.local.json` is gitignored).

## Before committing

`npm run build && npm test && npm run typecheck` must pass.
