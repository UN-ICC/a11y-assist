/**
 * a11y-core — pure, mechanical composition shared by the MCP server (a11y-mcp)
 * and the a11y-assist website (a11y-assist-site). No I/O, no Playwright, no MCP
 * protocol, and no editorial assertions.
 *
 * Two responsibility areas:
 *   1. Composition — given an APG pattern or an ARIA role, assemble the verbatim
 *      recipe + ARIA contract + native elements + deterministic drill-down
 *      queries, and run the level-gated ACT search (the one mechanical
 *      ACT→WCAG-SC bridge). API: composeApgPattern, composeAriaRole,
 *      listApgPatterns, searchAct.
 *
 *   2. Audit response shaping — turn raw axe violations into the canonical
 *      response shape. API: wrapAuditResponse, enrichBase, toBaseShape.
 *
 * Same functions, both consumers. No drift possible.
 */

export {
  composeApgPattern,
  composeAriaRole,
  listApgPatterns,
  searchAct,
  type ComposedApgPattern,
  type ComposedAriaRole,
  type SuggestedQuery,
  type WCAGLevel,
} from './compose.js'

export {
  wrapAuditResponse,
  enrichBase,
  toBaseShape,
  AUDIT_CAVEATS,
  type AuditResponse,
  type EnrichedViolation,
  type WrapAuditOptions,
} from './audit-response.js'

export {
  deriveAriaContract,
  deriveContracts,
  type AriaContract,
} from './aria-contract.js'

export {
  getElementsForRole,
  getRolesForElement,
  type ElementSpec,
  type AttributeConstraint,
} from './element-roles.js'
