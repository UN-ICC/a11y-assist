# act-rules-query

Programmatic access to W3C [Accessibility Conformance Testing (ACT) Rules](https://act-rules.github.io/). Loaded from snapshotted YAML/Markdown source files in the [act-rules.github.io](https://github.com/act-rules/act-rules.github.io) repository.

ACT rules are tool-agnostic accessibility test rules. Each rule maps to one or more WCAG Success Criteria and includes a precise applicability statement. Together, they're the closest thing to a published "which SCs apply to which UI elements" mapping.

## Install

```sh
npm install act-rules-query
```

## Usage

```ts
import {
  getRule, listRules, rulesByWCAG, search, ACT_SNAPSHOT,
} from 'act-rules-query'

const r = getRule('97a4e1')
console.log(r.name)             // 'Button has non-empty accessible name'
console.log(r.wcag_sc_ids)      // ['4.1.2']
console.log(r.applicability_text)
//  'This rule applies to elements that are included in the accessibility tree
//   and have a semantic role of `button`...'

rulesByWCAG('4.1.2')             // → ACT rules covering "Name, Role, Value" (mechanical, front-matter)
search('button')                 // → rules whose name or applicability text mentions "button"
```

## Data shape

```ts
interface ACTRule {
  id: string                     // hex slug, e.g. '97a4e1'
  name: string                   // verbatim from front-matter
  rule_type: 'atomic' | 'composite'
  description: string            // verbatim from front-matter
  wcag_sc_ids: string[]          // primary WCAG SC IDs (forConformance: true)
  wcag_sc_ids_secondary: string[]
  input_aspects: string[]
  applicability_text: string     // verbatim '## Applicability' section
  url: string                    // canonical at act-rules.github.io
}
```

## Methodology

Unlike `apg-query` and `wcag-query` (which scrape HTML), `act-rules-query` reads YAML/Markdown source files directly from a snapshot of the upstream repo. The "loader" is just YAML parsing — no HTML, no cheerio, no fragility against rendering changes.

To refresh:

```sh
# 1. Sync upstream snapshot (manual today; could be a script)
git clone https://github.com/act-rules/act-rules.github.io /tmp/act
cp /tmp/act/_rules/*.md packages/act-rules-query/snapshots/_rules/

# 2. Re-run the loader
npm run load --workspace=act-rules-query
```

The loader writes `src/data/<rule-id>.json` per rule plus a `_manifest.json` index and a `_snapshot.json` with date + upstream commit hash.

## Coverage

v0 ships **94 rules** snapshotted from `act-rules/act-rules.github.io@80e887e`. ACT is actively maintained — refreshing the snapshot pulls in new rules.

`search(query)` is a plain case-insensitive substring match over each rule's name and applicability text — it makes no judgement about which rules "apply" to a role. The caller supplies the term (a role name, an ARIA attribute, an element) and filters the results contextually. `rulesByWCAG(scId)` is the one mechanical mapping (straight from each rule's front-matter).

## Provenance and licensing

Data is derived from the [act-rules.github.io](https://github.com/act-rules/act-rules.github.io) repository, licensed under the [W3C Document License](https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document) (BSD-style, permits redistribution with attribution). See `NOTICE`. The loader code is MIT-licensed.

## Related

- [`aria-query`](https://www.npmjs.com/package/aria-query) — WAI-ARIA roles, properties, element-role mappings
- [`apg-query`](../apg-query) — APG patterns
- [`wcag-query`](../wcag-query) — WCAG 2.2 SCs + Techniques + Failures

## Data versions

Each published version ↔ the upstream snapshot it was built from.

<!-- provenance:start -->

| Version | Scraped | Upstream commit |
| --- | --- | --- |
| 0.1.0 | 2026-05-07 | `80e887e` |

<!-- provenance:end -->
