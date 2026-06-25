# a11y-assist-core

The pure, mechanical composition layer of [a11y-assist](https://github.com/UN-ICC/a11y-assist). It:

- **composes** `apg-query` + `wcag-query` + `act-rules-query` + `aria-query` into recipes + ARIA contracts + native elements + dual-path drill-down queries (`search_act` / `search_wcag`);
- exposes a **query surface** over the WCAG + ACT knowledge base (`searchWcag`, `getWcagSc`, `getActRule`, `actRulesForSc`, …);
- shapes **audit responses** from raw axe violations;
- ships an **experimental applicability engine** (`applicability.*`) — which WCAG criteria apply to a component, structurally and by content, plus a tiered verification checklist (`structuralGuidance`, `evaluateApplicability`, `evaluateVerification`).

No I/O, no MCP, no Playwright, no editorial data.

📖 **Docs:** <https://un-icc.github.io/a11y-assist/packages/a11y-assist-core/>

## Install

```sh
npm install a11y-assist-core
```

## License

MIT. Ships no data of its own — every fact comes from a query package or `aria-query`.
