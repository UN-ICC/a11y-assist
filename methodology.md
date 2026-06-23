# Methodology

This document describes how data flows from authoritative upstream sources (W3C, npm packages) into the MCP server's responses, and the discipline that keeps it trustworthy.

## The principle

**Every claim is derivable from a versioned upstream source.** No editorial paraphrase, no synthesised "common pitfalls," no LLM-curated content claiming authority.

Where the W3C documents this content — APG patterns, WCAG SCs, WCAG Techniques, WCAG Failures, the WAI-ARIA spec — we extract it verbatim into query packages. Where W3C doesn't (e.g. RN component mapping), we maintain a small editorial table with explicit citations.

The MCP server is an **aggregator**: it composes outputs from the query packages at request time. The LLM agent does synthesis (recommendations, fixes) by reasoning over the structured inputs.

## The pipeline

```
Upstream                          Loader / Extractor                Package                Consumer
────────────────────────────────────────────────────────────────────────────────────────────────────

W3C APG HTML pages          →    apg-query/tools/extract.ts    →  apg-query/src/data/*  →  core/aggregate
                                 (cheerio: scrape HTML)                                       ↓
W3C WCAG Understanding      →    wcag-query/tools/extract.ts   →  wcag-query/src/data/* →  core/aggregate
                                 (cheerio: scrape HTML)                                       ↓
ACT Rules YAML/Markdown     →    act-rules-query/tools/load-yaml.ts → act-rules-query/   →  core/aggregate
                                 (gray-matter: parse YAML)         src/data/*                ↓
WAI-ARIA spec (via npm)          [no extraction — direct use of aria-query]              →  core/aggregate
                                                                                              ↓
Editorial primitive + supplemental SC table  [hand-maintained; small]                    →  core/aggregate
                                                                                              ↓
                                                                                          response to agent
```

Each query package owns one upstream source. The MCP server core knows nothing about scraping HTML or parsing YAML — it just imports `getPattern`, `getSC`, `getRule`, etc.

Each query package owns one upstream source. The MCP server core knows nothing about scraping HTML or parsing W3C content — it just imports `getPattern`, `getSC`, `getTechnique`, etc.

## Snapshot pinning

Each query package commits its raw upstream HTML to `snapshots/`. Re-running the extractor against committed snapshots produces byte-identical output to what's in `src/data/`. This means:

- **Reproducibility**: anyone with the snapshot can re-derive the data.
- **Auditability**: a reviewer can compare the snapshot against the extracted JSON to verify the extractor isn't introducing errors.
- **Versioning**: the snapshot date is part of the package's identity; `APG_SNAPSHOT.date` is exposed in API responses' provenance.

To refresh against current upstream:

```sh
npm run extract --workspace=apg-query -- --refresh
npm run extract --workspace=wcag-query -- --refresh
```

This re-fetches each upstream page, overwrites the snapshot, and re-runs extraction. The diff is reviewable as a normal git diff before commit. **Updating snapshots is a deliberate, reviewed action** — never automatic.

## What's still editorial — and why it's small

The only hand-maintained content is `packages/core/src/data/role-bindings.json`. After adding `act-rules-query`, its three jobs are:

1. **Supplemental WCAG SC mapping** — SCs that apply to a role but no ACT rule covers them yet. Typical examples: `2.4.7` Focus Visible, `2.4.11` Focus Not Obscured, `2.5.8` Target Size — visual concerns ACT has limited coverage for. The aggregator merges these with ACT-derived SCs (deduped). When ACT adds rules covering these SCs, the redundant entries become harmless.
2. **Map role → HTML primitive** (web). For roles with a native element (textbox, link, img, etc.).
3. **Map role → React Native primitive**. No W3C document covers RN.

The role → SC binding is a **floor**, not the source of truth. The source of truth is ACT — the binding ensures coverage doesn't regress if ACT removes a rule, and supplements SCs ACT doesn't yet cover.

This file is the **only** editorial residue in the project. Everything else is derived from one of:
- `aria-query` (WAI-ARIA spec)
- `apg-query` (APG)
- `wcag-query` (WCAG 2.2)
- `act-rules-query` (ACT Rules)

## Update cadence

- **APG**: refreshed when [w3c/aria-practices](https://github.com/w3c/aria-practices) publishes a new release. No fixed cadence — pull when needed.
- **WCAG**: refreshed when WCAG 2.2 publishes errata or when WCAG 2.3 / 3.0 ships. Rare events.
- **aria-query**: bumped via npm dependency updates. Track aria-query's release schedule.
- **role-bindings.json**: updated when adding new patterns or correcting mappings. Reviewed in PR.

## How to contribute

### Adding a new APG pattern

1. Add an entry to `packages/apg-query/tools/extract.ts`'s `PATTERNS` array (role + slug + name).
2. Run `npm run extract --workspace=apg-query` — fetches the new page, snapshots it, writes `data/<role>.json`.
3. Add an entry to `packages/core/src/data/role-bindings.json` with the WCAG SC IDs that apply.
4. (Optional) Run `npm run build --workspace=a11y-mcp-core` to verify.
5. Commit snapshot, data, and bindings together.

### Adding a new WCAG SC

1. Add an entry to `packages/wcag-query/tools/extract.ts`'s `SCS` array (id + slug + level).
2. Run `npm run extract --workspace=wcag-query`.
3. Optionally reference the new SC ID from `role-bindings.json` if it applies to specific roles.
4. Commit snapshot + data.

### Refreshing ACT Rules

ACT rules are loaded from a snapshot of the upstream repo. To update:

```sh
git clone https://github.com/act-rules/act-rules.github.io /tmp/act
cp /tmp/act/_rules/*.md packages/act-rules-query/snapshots/_rules/
npm run load --workspace=act-rules-query
```

The new commit hash is recorded automatically in `_snapshot.json`. Diff-review and commit.

### Improving the role → SC mapping

Today the aggregator uses `actRulesByRole(role)` plus a binding supplement. The role-matcher is a heuristic (word-boundary match against ACT applicability_text). Improvements:
- If ACT publishes a more structured applicability format, switch to that.
- If `aria-query.roleElements` gains a "tested by" field linking to ACT rules, use it.
- If the ACT repo publishes a per-rule machine-readable applicability tag, consume it.

### Fixing an extractor

When upstream HTML structure shifts, the extractor may need updating. The workflow:

1. Pull a fresh snapshot (`--refresh`).
2. Diff the data output against committed.
3. If extraction is now broken, fix the extractor logic.
4. Re-run, verify diff is now clean (or only contains intentional upstream changes).

The `WARN: <pattern> has empty <field>` messages from the extractor are early signals that upstream structure has changed.

### Expanding RN primitive coverage

`role-bindings.json` is the table. Add new entries with `rn_primitive` populated for components like Slider, ActivityIndicator, FlatList, etc.

If the table grows past ~30 entries, consider promoting it to a standalone `rn-aria-query` package — same pattern as the others.

## In-memory graph projection

The query packages plus `a11y-core`'s `loadPattern` are sufficient on their own — the MCP server consumes them directly. For graph-shaped queries that the website needs (backlinks, neighbourhoods, coverage gaps), a separate package — `a11y-graph` — materialises the four sources into a [graphology](https://graphology.github.io/) directed graph: 8 node types, 8 edge types, ~670 nodes, ~1050 edges.

The graph is a *projection*, not a new authoritative layer:

- Nothing inside `a11y-graph` is canonical. Every node and edge is re-derivable from upstream packages.
- `loadPattern` is unchanged and unaware of the graph. The MCP server has no dependency on `a11y-graph`.
- The site uses `a11y-graph` for its own purposes (build-time backlinks, ontology subgraphs, coverage stats).

This separation keeps `a11y-core` minimal — graphology is not pulled into MCP — while letting graph-shaped consumers opt in.

## Validation

Each query package has minimal validation today (the extractor warns on empty fields). Future hardening should add:

- **Schema validation** (zod) at extract time — fail the extraction if shape drifts.
- **Citation reachability** — periodic CI job that verifies all `*_url` fields return 200.
- **Cross-reference integrity** — every `failure_ids` entry in `success-criteria.json` must exist in `failures.json`.

Listed in package READMEs as future work.

## What this methodology gives up

We are explicit about the trade-offs:

1. **Cross-platform synthesis** ("APG button → RN Pressable" mapping) is partly editorial — it's the role-bindings table. We accept this as the smallest possible editorial residue.
2. **"Common pitfalls" beyond W3C Failures**: specifically community wisdom not yet codified by W3C is absent. Anyone wanting that can read engineer blogs / Slack archives / audit reports themselves.
3. **Editorial polish**: the W3C content is dense and technical. Agents have to do their own summarisation for human-friendly output.

These trade-offs are net positive: trustworthy data + agent reasoning beats LLM-paraphrased editorial that nobody can audit.

## Open problems

These are known limitations or trade-offs we're not solving yet. Documented so they don't get forgotten.

### Response payload size

`get_a11y_pattern("<role>", "<platform>")` currently includes the full expansion of every applicable WCAG SC: the SC text, all sufficient techniques, and all documented failures. For roles touching ~6 SCs each, this can easily run to tens of techniques/failures and produce a multi-KB JSON payload per pattern.

The agent gets value from the SC short text, the failure titles (anti-patterns!), and the URLs. The full sufficient-technique list is more aspirational than actionable for a single pattern lookup. Likely future work:

- Return only `id`, `level`, `title`, `failure_ids` and a count of techniques (with URLs to wcag-query for full expansion).
- Or: split into `get_a11y_pattern` (lean) vs `get_wcag_sc(id)` (full SC expansion). Agent can drill into the SCs it cares about.
- Either change is mechanical; needs a pass once the agent loop has been observed in practice to know what's actually consumed.

Tracked here. Not blocking.

## What this methodology gives back

1. **Trustworthy claims** — every field traces to a snapshot.
2. **Mechanical updates** — bumping aria-query or refreshing snapshots flows through automatically.
3. **Standalone OSS contributions** — `apg-query` and `wcag-query` are useful to anyone in the a11y ecosystem, not just our MCP server.
4. **Clean responsibility split** — each package owns one source; the core only aggregates.
5. **Auditable methodology** — anyone can inspect the extractor in each query package and re-derive the data from upstream.

This is what makes the project credible at scale.
