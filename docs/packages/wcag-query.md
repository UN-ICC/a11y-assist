---
title: wcag-query
parent: Packages
nav_order: 2
permalink: /packages/wcag-query/
---


Programmatic access to [WCAG 2.2](https://www.w3.org/TR/WCAG22/) Success Criteria, Sufficient Techniques, and Failures. Analogous to [`aria-query`](https://www.npmjs.com/package/aria-query) and [`apg-query`](/a11y-assist/packages/apg-query/) but for WCAG.

The W3C publishes WCAG 2.2 as HTML pages — this package extracts the structured content into JS-queryable data so tools (linters, MCP servers, audit reporters, doc generators) can consume it without scraping at runtime.

## Install

```sh
npm install wcag-query
```

## Usage

```ts
import {
  getSC, getTechnique, getFailure, search,
  successCriteria, techniques, failures,
  WCAG_VERSION, WCAG_SNAPSHOT,
} from 'wcag-query'

// Substring search over id/title/statement, with an optional cumulative level filter:
search('focus', { level: 'AA' })   // → AA-and-below SCs mentioning "focus"

const sc = getSC('2.4.7')
console.log(sc.title)            // 'Focus Visible'
console.log(sc.level)            // 'AA'
console.log(sc.short_text)       // verbatim SC statement
console.log(sc.technique_ids)    // ['G149', 'C15', 'G165', ...]
console.log(sc.failure_ids)      // ['F55', 'F78']

const f78 = getFailure('F78')
console.log(f78.title)           // 'Failure of Success Criterion 1.4.11, 2.4.7 and 2.4.13...'
console.log(f78.applicable_sc_ids) // ['2.4.7', ...]
console.log(f78.url)             // canonical W3C URL
```

## Data shapes

```ts
interface SuccessCriterion {
  id: string                       // '2.4.7'
  level: 'A' | 'AA' | 'AAA'
  title: string                    // 'Focus Visible'
  short_text: string               // verbatim SC statement
  understanding_url: string
  technique_ids: string[]          // ['G149', 'C15', ...]
  failure_ids: string[]            // ['F55', 'F78']
}

interface Technique {
  id: string                       // 'G149', 'F78', etc.
  kind: 'sufficient' | 'advisory' | 'failure'
  title: string                    // verbatim
  applicable_sc_ids: string[]      // SCs this technique applies to
  url: string
}
```

## Coverage

Ships **all 86 WCAG 2.2 Success Criteria** (WCAG 2.2 removed 4.1.1 Parsing, leaving 86), **316 techniques**, and **89 failures**. Refreshing against upstream errata is mechanical — re-run the extractor.

## Methodology

Data is extracted from snapshotted W3C "Understanding" pages. The extractor (`tools/extract.ts`) parses each page's structured sections (`#success-criterion` for the SC text, `#sufficient` for techniques, `#failure` for failures) and writes JSON to `src/data/`.

To refresh against current WCAG content:

```sh
npm run extract -- --refresh
```

This re-fetches each Understanding page, updates `snapshots/`, and re-runs extraction. The diff is reviewable before commit.

## Provenance and licensing

Data is derived from W3C WCAG 2.2 Understanding pages, licensed under the [W3C Document License](https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document) (BSD-style, permits redistribution with attribution). See `NOTICE`. The extraction code is MIT-licensed.

## Related

- [`aria-query`](https://www.npmjs.com/package/aria-query) — WAI-ARIA roles, properties, element-role mappings
- [`apg-query`](/a11y-assist/packages/apg-query/) — APG patterns (button, dialog, tabs, ...)

## Data versions

Each published version ↔ the upstream snapshot it was built from.

<!-- provenance:start -->

| Version | Scraped | WCAG |
| --- | --- | --- |
| 0.1.0 | 2026-05-07 | 2.2 |

<!-- provenance:end -->
