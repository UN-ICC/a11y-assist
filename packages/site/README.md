# a11y-assist-site

The developer-facing surface of a11y-assist: a static website that browses the **same** dataset the MCP server returns to agents — pattern, WCAG SC, and ACT rule pages, plus an index and a provenance page. No framework, no client-side data fetching; everything is rendered at build time from [`a11y-core`](../core) and the query packages.

## Build

```sh
npm run build:site            # from the repo root — builds libs, then the site
```

Or just this package (after the libraries are built):

```sh
npm run build                 # renders HTML into ../../docs/
npm run build:audit-bundle    # bundles the in-page "Audit this page" button
```

Output goes to `docs/` at the repo root, served as **GitHub Pages**.

## How it stays in sync

Pattern pages render exactly what `composeApgPattern` produces — the same compose function the MCP server serves to agents — so the website and the server cannot disagree. The only site-specific logic is `tools/derive.ts`: the build-time `search_act` hop that lists each pattern's related ACT rules, and a mechanical coverage summary. SC pages link to the ACT rules covering them (`rulesByWCAG`, straight from ACT front-matter). The in-page audit button reuses `wrapAuditResponse` from `a11y-core`, the same function the MCP `audit_html` tool uses.

## Licensing

Code is MIT. Rendered content derives from the W3C sources behind the query packages; see each package's `NOTICE`.
