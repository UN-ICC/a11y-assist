# a11y-assist

a11y-assist provides programmatic, source-traceable access to W3C web-accessibility guidance (WCAG, APG, WAI-ARIA, ACT Rules) and automated verification via axe-core, for use in AI-assisted development. Guidance is available to AI agents through an MCP server and to developers through a web application.

Documentation and the web application: <https://un-icc.github.io/a11y-assist/>

## Purpose

- Accessibility requirements are distributed across four W3C documents and published as prose. They are not machine-readable, and the material for a single component is too large to review at once and exceeds an AI agent's context. a11y-assist extracts each source verbatim into queryable libraries and serves them on demand.
- Automated tools cover only the structurally testable part of WCAG; most criteria require judgement — to verify, and often even to determine whether they apply. Verification proceeds in three stages, routed by who can settle each check: axe-core, agent review of the markup against the retrieved recipe, and a checklist of the remaining qualitative criteria for human review.

Scope: a11y-assist supports lightweight, on-demand verification during AI-assisted development. It is not a systematic auditing tool; broader auditing support is planned.

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
