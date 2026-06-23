# a11y-assist

Source-traceable web accessibility — APG, WCAG, ACT, ARIA, plus axe verification. One core, served two ways: an **MCP server** for AI coding agents and a **browsable app** for developers. Every claim traces back to a versioned W3C document.

**📖 Docs & live app: <https://un-icc.github.io/a11y-assist/>**

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
