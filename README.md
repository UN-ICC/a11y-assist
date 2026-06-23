# a11y-assist

Accessibility you can **query** — and honest about what only a human can check. APG, WCAG, ACT, and ARIA turned into on-demand data for AI agents and developers, with every claim traceable to a versioned W3C source.

**📖 Docs & live app: <https://un-icc.github.io/a11y-assist/>**

## What it solves

- **Fragmented, voluminous knowledge.** a11y norms span four W3C documents (WCAG, APG, ARIA, ACT) in prose — not machine-queryable, and far too much to read (or, for an agent, hold in context) at once. → We extract each *verbatim* into queryable libraries and serve them as an on-demand drill-down.
- **Partly-automatable verification.** axe covers ~half of WCAG; the rest is qualitative (meaningful labels, screen-reader output, focus visibility). → We verify in tiers — **axe** → **agent code-review** → a short, *sourced* **human checklist** for what's left — instead of pretending a green scan means "accessible."

Built for **AI-assisted development**: lightweight, on-demand, in-the-loop verification while you build — not (yet) a systematic CI/audit suite (that's on the roadmap).

## Packages (on npm)

| Package | What it is |
|---|---|
| [`apg-query`](https://www.npmjs.com/package/apg-query) | Verbatim W3C APG patterns |
| [`wcag-query`](https://www.npmjs.com/package/wcag-query) | WCAG 2.2 SCs + techniques + failures |
| [`act-rules-query`](https://www.npmjs.com/package/act-rules-query) | W3C ACT rules (with their WCAG SC mappings) |
| [`a11y-assist-core`](https://www.npmjs.com/package/a11y-assist-core) | The aggregator |
| [`a11y-assist-mcp`](https://www.npmjs.com/package/a11y-assist-mcp) | The MCP server for AI agents |

## Use with an AI agent

```sh
claude mcp add a11y -- npx -y a11y-assist-mcp
npx playwright install chromium   # for the audit tools
```

See the [setup guide](https://un-icc.github.io/a11y-assist/agents/).

## Use the libraries

```sh
npm install apg-query wcag-query act-rules-query
```

## Develop (this monorepo)

```sh
npm install
npm run build      # build all packages
npm test           # run the query-package + core test suites
npm run web        # build the app and open it locally
```

Documentation is authored in [`docs/`](./docs) (just-the-docs → GitHub Pages); the app is a single self-contained `docs/app/index.html` (`npm run docs:app` refreshes it).

## License

Code: MIT. Extracted W3C content is redistributed under the [W3C Document License](https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document) with attribution — see each package's `NOTICE`.
