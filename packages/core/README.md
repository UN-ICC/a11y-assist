# a11y-core

The pure-logic heart of a11y-assist. It composes the query packages ([`apg-query`](../apg-query), [`wcag-query`](../wcag-query), [`act-rules-query`](../act-rules-query)) plus [`aria-query`](https://www.npmjs.com/package/aria-query) and a small editorial `role-bindings.json` into a unified `A11yPattern` shape, and shapes raw axe results into a canonical audit response.

**No I/O, no MCP, no Playwright.** Both surfaces depend on it — the [`a11y-mcp`](../mcp) server and the [`a11y-assist-site`](../site) website — so an agent and a developer always see the same data. There is no second source of truth.

## Public API

```ts
import {
  loadPattern, listPatterns,          // pattern aggregation
  wrapAuditResponse, enrichBase, toBaseShape, AUDIT_CAVEATS,  // audit shaping
  deriveAriaContract, deriveContracts,                        // ARIA contract
  roleBindings,                                               // editorial table
  getElementsForRole, getRolesForElement,                    // ARIA-in-HTML maps
} from 'a11y-core'

const pattern = loadPattern('button', 'web')   // → A11yPattern | null
const { apg_patterns, primitives } = listPatterns('web')
```

`loadPattern(role, platform)` is the single aggregation entry point; see [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) "The pipeline" for the composition flow and [`../mcp/README.md`](../mcp/README.md) "Response shape" for the returned fields.

## The editorial residue

`src/data/role-bindings.json` (~30 entries) is the project's only hand-maintained content: per-role supplemental WCAG SCs (a floor beneath ACT), and role → HTML / React Native primitive bindings. See [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) "The editorial residue."

## Licensing

Code is MIT. The bundled `role-bindings.json` is editorial data maintained in this repo.
