# apg-query

Programmatic access to the [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) (APG). Analogous to [`aria-query`](https://www.npmjs.com/package/aria-query) but for APG patterns instead of the WAI-ARIA spec.

APG describes recipes for building common UI components (button, dialog, tabs, listbox, etc.) — accessibly. APG itself is published only as HTML pages; this package extracts the structured content (summary, keyboard interactions, ARIA roles, examples) into JS-queryable data.

## Install

```sh
npm install apg-query
```

## Usage

```ts
import { getPattern, listPatterns, APG_SNAPSHOT } from 'apg-query'

const button = getPattern('button')
console.log(button.aria_roles)
// → ['button']

console.log(button.keyboard_interactions)
// → [
//     { key: 'Space',  description: 'Activates the button.' },
//     { key: 'Enter',  description: 'Activates the button.' },
//     { key: 'Tab',    description: 'Following button activation, focus is set...' }
//   ]

console.log(listPatterns())
// → ['accordion', 'alert', 'alertdialog', 'breadcrumb', 'button', 'carousel',
//    'checkbox', 'combobox', 'dialog', ... 28 in total]

console.log(APG_SNAPSHOT)
// → { date: '2026-05-07', apg_base: 'https://www.w3.org/WAI/ARIA/apg/patterns', pattern_count: 28 }
```

## Data shape

```ts
interface APGPattern {
  role: string                    // 'button', 'tabs', etc.
  name: string                    // Display name
  apg_url: string                 // Canonical APG page
  about_this_pattern: string      // Verbatim from APG
  aria_roles: string[]            // Composite roles for the pattern (e.g. tabs → tablist + tab + tabpanel)
  keyboard_interactions: { key: string; description: string }[]
  examples: { name: string; url: string }[]
}
```

Every string field is **verbatim from the APG HTML** — never paraphrased or summarised. Composite patterns (tabs, radio, etc.) include all constituent ARIA roles.

## Coverage

28 patterns: accordion, alert, alertdialog, breadcrumb, button, carousel, checkbox, combobox, dialog, disclosure, feed, grid, link, listbox, menu, menubutton, meter, radio, slider, slider-multithumb, spinbutton, switch, table, tabs, toolbar, tooltip, treegrid, treeview. Expanding coverage is a matter of adding entries to the extractor's pattern list and re-running.

## Methodology

Data is extracted from snapshotted W3C HTML. The extraction tool (`tools/extract.ts`) is the methodology — it parses APG section structure (`#about`, `#keyboard_interaction`, `#roles_states_properties`, `#examples`) and writes structured JSON to `src/data/`.

To refresh against current APG content:

```sh
npm run extract -- --refresh
```

This re-fetches each pattern page, updates the snapshot in `snapshots/`, and re-runs extraction. The diff is reviewable before commit.

## Provenance and licensing

The data files contain content extracted from W3C ARIA Authoring Practices Guide pages, licensed under [W3C Document License](https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document) (BSD-style, permits redistribution with attribution). See `NOTICE` for full attribution. The extraction code is MIT-licensed.

## Related

- [`aria-query`](https://www.npmjs.com/package/aria-query) — the WAI-ARIA spec extraction (roles, properties, element-role mapping)
- [`wcag-query`](../wcag-query) — WCAG 2.2 success criteria, techniques, and failures

## Data versions

Each published version ↔ the upstream snapshot it was built from.

<!-- provenance:start -->

| Version | Scraped | Patterns |
| --- | --- | --- |
| 0.1.0 | 2026-05-07 | 28 |

<!-- provenance:end -->
